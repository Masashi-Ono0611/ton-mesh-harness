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
 * Toncenter's tx index typically catches up within ~5-15s of broadcast
 * acceptance, well before TONAPI's DNS-record poll succeeds, so the
 * resolve runs in parallel with the propagation poll and adds zero
 * latency to the happy path.
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
    if (signal?.aborted) return resolve()
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        resolve()
      },
      { once: true },
    )
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

/**
 * Look up the transaction whose inbound message has the given hash.
 *
 * @param messageHashHex Normalized message hash returned by
 *   `ApiClientToncenter.sendBoc()` — either `0x<hex>` or bare hex.
 * @returns Tx hash as `0x<hex>` if Toncenter has indexed the message,
 *   `null` on timeout / not-yet-indexed / network error.
 */
export async function resolveTxHashFromMessageHash(
  messageHashHex: string,
  network: AgenticNetwork,
  opts: ResolveTxOptions = {},
): Promise<string | null> {
  const stripped = messageHashHex.replace(/^0x/i, '').toLowerCase()
  // Walletkit's sendBoc returns `0x${Base64ToBigInt(...).toString(16)}`,
  // which DROPS leading zero nibbles. A 32-byte hash with a leading zero
  // byte becomes 62-63 hex chars. Accept 1..64 and left-pad to 64 before
  // converting to base64 (Codex S2.7 review MAJOR 2 fix).
  if (!/^[0-9a-f]{1,64}$/.test(stripped)) return null
  const padded = stripped.padStart(64, '0')
  const msgHashB64 = Buffer.from(padded, 'hex').toString('base64')

  const client = buildToncenterClient(network, opts.toncenter_api_key)

  const deadline = Date.now() + (opts.timeout_ms ?? 60_000)
  const intervalMs = opts.interval_ms ?? 2_000
  log.debug('poll:start', { msg_hash: messageHashHex, network, timeout_ms: opts.timeout_ms })

  let attempts = 0
  while (Date.now() < deadline) {
    if (opts.signal?.aborted) {
      log.debug('poll:aborted', { attempts })
      return null
    }
    attempts++
    try {
      const result = await client.getTransactionsByHash({ msgHash: msgHashB64 } as never)
      const txs = (result as { transactions?: Array<{ hash?: string }> }).transactions ?? []
      const hit = txs.find((t) => typeof t.hash === 'string' && t.hash.length > 0)
      if (hit?.hash) {
        const h = hit.hash.replace(/^0x/i, '')
        log.info('poll:hit', { attempts, tx_hash: `0x${h.toLowerCase()}` })
        return `0x${h.toLowerCase()}`
      }
    } catch (err) {
      // 404 / rate-limit / DNS / 5xx — keep polling within the deadline.
      log.debug('poll:miss', {
        attempts,
        error: err instanceof Error ? err.message : String(err),
      })
    }
    await sleep(intervalMs, opts.signal)
  }
  log.debug('poll:timeout', { attempts })
  return null
}
