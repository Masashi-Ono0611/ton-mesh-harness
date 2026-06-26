/**
 * Resolve the on-chain transaction hash for a broadcast we already sent.
 *
 * `agenticSignAndSend` returns Toncenter's normalized external-in
 * *message* hash. That's NOT the transaction hash explorers display.
 * To upgrade `dns_tx_hash` from null → real value, we look up the
 * resulting tx via Toncenter v3's `/api/v3/transactionsByMessage`
 * endpoint. Best-effort: returns null on timeout / 404 / network error
 * rather than throwing — the caller decides whether to surface null
 * with a fix-hint or wait longer.
 *
 * Toncenter's tx index OFTEN catches up within ~5-15s of broadcast, but
 * NOT always before TONAPI's DNS-record poll succeeds: on 2026-06-25 a
 * live mainnet deploy saw TONAPI propagate the storage record FIRST, so
 * the resolve had not finished when the DNS poll returned (#117). The
 * resolve runs in parallel with the propagation poll and adds latency
 * only when still pending at the grace cutoff (`TX_HASH_GRACE_MS` in
 * dns-helpers.ts). Because the order is not guaranteed, `dns_tx_hash` is
 * best-effort and may be null even on a fully-successful deploy.
 *
 * Spec: docs/v0.8/mcp-core-requirements.md §F2 (DeployResult.dns_tx_hash).
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { beginCell, Cell, loadMessage, storeMessage } from '@ton/core'
import type { AgenticNetwork } from './agentic-config'
import { createSdkLogger } from './log'
import { buildToncenterClient } from './walletkit-network'

const log = createSdkLogger('mesh:resolve-tx')

/**
 * Compute the normalized external-in message hash per TEP-467 — the
 * `hash_norm` value Toncenter indexes (NOT the raw cell hash). For an
 * `external-in` message, normalization zeros `src` (→ addr_none) and
 * `import_fee` (→ 0) before hashing. Other fields (dest, init, body)
 * are preserved.
 *
 * Spec: https://docs.ton.org/ecosystem/ton-connect/message-lookup
 *
 * @returns hex (no `0x`), or `null` if the BOC isn't a parseable
 *   external-in message.
 */
export function normalizedExternalInHashHex(bocBase64: string): string | null {
  try {
    const cell = Cell.fromBase64(bocBase64)
    const msg = loadMessage(cell.beginParse())
    if (msg.info.type !== 'external-in') return null
    const normalized = beginCell()
      .store(
        storeMessage({
          ...msg,
          info: {
            type: 'external-in',
            src: null, // addr_none
            dest: msg.info.dest,
            importFee: 0n,
          },
        }),
      )
      .endCell()
    return normalized.hash().toString('hex')
  } catch {
    return null
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    // Remove the abort listener on the NORMAL timer-fire path too — otherwise it
    // accumulates one dangling listener per poll iteration (this sleep runs in
    // resolveTxHashFromMessageHash's ~45-iteration loop), which can trip
    // AbortSignal's default 10-listener cap with a MaxListenersExceededWarning on
    // the slow resolve. Mirrors the #135-hardened sleep in src/dns.ts. (#149)
    let onAbort: (() => void) | undefined
    const timer = setTimeout(() => {
      if (onAbort) signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export interface ResolveTxOptions {
  /** Total time to keep polling. Default 60s. */
  timeout_ms?: number
  /** Pause between polls. Default 2s. */
  interval_ms?: number
  /** Cancel the resolve early. */
  signal?: AbortSignal
  /** Optional Toncenter API key (lifts the per-IP rate limit). */
  toncenter_api_key?: string
}

/** Outcome of a tx-hash resolve. */
export interface TxHashResolution {
  /** Tx hash as `0x<hex>` if Toncenter indexed the message, else null. */
  txHash: string | null
  /**
   * True when the resolve kept hitting auth / rate-limit / 5xx responses and
   * never got a fair chance — as opposed to the tx simply not being indexed
   * yet. Only meaningful when `txHash` is null; lets the caller surface "add a
   * Toncenter API key" instead of an indistinguishable silent null. (#120)
   */
  throttled: boolean
}

/**
 * Classify a Toncenter error as the KEY/AUTH-fixable class (401/403/429,
 * rate-limit, unauthorized, quota) — the only kind where "supply a Toncenter
 * API key" is the right advice. A 5xx is a server-side OUTAGE (a key won't fix
 * it and a later retry may still succeed), and 404/empty is benign
 * not-yet-indexed; neither counts as throttled. (#120 / Codex P2)
 */
function isThrottleError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return /\b(401|403|429)\b/.test(msg) || /rate.?limit|too many request|unauthor|forbidden|quota/.test(msg)
}

/**
 * Look up the transaction whose inbound message has the given hash.
 *
 * @param messageHashHex Normalized message hash returned by
 *   `ApiClientToncenter.sendBoc()` — either `0x<hex>` or bare hex.
 * @returns `{ txHash, throttled }` — `txHash` is `0x<hex>` if Toncenter has
 *   indexed the message, else null (with `throttled` distinguishing a
 *   rate-limited/unauthorized resolve from a not-yet-indexed one).
 */
export async function resolveTxHashFromMessageHash(
  messageHashHex: string,
  network: AgenticNetwork,
  opts: ResolveTxOptions = {},
): Promise<TxHashResolution> {
  const stripped = messageHashHex.replace(/^0x/i, '').toLowerCase()
  // Walletkit's sendBoc returns `0x${Base64ToBigInt(...).toString(16)}`,
  // which DROPS leading zero nibbles. A 32-byte hash with a leading zero
  // byte becomes 62-63 hex chars. Accept 1..64 and left-pad to 64 before
  // converting to base64 (Codex S2.7 review MAJOR 2 fix).
  if (!/^[0-9a-f]{1,64}$/.test(stripped)) return { txHash: null, throttled: false }
  const padded = stripped.padStart(64, '0')
  const msgHashB64 = Buffer.from(padded, 'hex').toString('base64')

  const client = buildToncenterClient(network, opts.toncenter_api_key)

  const deadline = Date.now() + (opts.timeout_ms ?? 60_000)
  const intervalMs = opts.interval_ms ?? 2_000
  log.debug('poll:start', { msg_hash: messageHashHex, network, timeout_ms: opts.timeout_ms })

  let attempts = 0
  // Tracks whether the LAST failure was a throttle/auth/5xx (vs not-indexed),
  // so a timeout can report why it gave up. (#120)
  let lastThrottle = false
  // Give up early after this many CONSECUTIVE throttle/auth errors: polling a
  // rejecting endpoint for the full 90s window is pointless, and settling with
  // throttled=true quickly lets the deploy's grace race observe it (otherwise
  // the ~15s grace timer wins first and the throttle signal is lost). (#120)
  const THROTTLE_GIVEUP = 5
  let consecutiveThrottle = 0
  while (Date.now() < deadline) {
    if (opts.signal?.aborted) {
      log.debug('poll:aborted', { attempts })
      return { txHash: null, throttled: false }
    }
    attempts++
    try {
      const result = await client.getTransactionsByHash({ msgHash: msgHashB64 } as never)
      const txs = (result as { transactions?: Array<{ hash?: string }> }).transactions ?? []
      const hit = txs.find((t) => typeof t.hash === 'string' && t.hash.length > 0)
      if (hit?.hash) {
        const h = hit.hash.replace(/^0x/i, '')
        log.info('poll:hit', { attempts, tx_hash: `0x${h.toLowerCase()}` })
        return { txHash: `0x${h.toLowerCase()}`, throttled: false }
      }
      // A successful empty response means "not indexed yet" — not a throttle.
      lastThrottle = false
      consecutiveThrottle = 0
    } catch (err) {
      // 404 / rate-limit / DNS / 5xx — keep polling within the deadline, but
      // remember whether this was a throttle/auth/5xx so a timeout can say so.
      lastThrottle = isThrottleError(err)
      consecutiveThrottle = lastThrottle ? consecutiveThrottle + 1 : 0
      log.debug('poll:miss', {
        attempts,
        throttle: lastThrottle,
        error: err instanceof Error ? err.message : String(err),
      })
      if (consecutiveThrottle >= THROTTLE_GIVEUP) {
        log.debug('poll:throttle-giveup', { attempts, consecutiveThrottle })
        return { txHash: null, throttled: true }
      }
    }
    await sleep(intervalMs, opts.signal)
  }
  log.debug('poll:timeout', { attempts, throttle: lastThrottle })
  return { txHash: null, throttled: lastThrottle }
}
