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

import { ApiClientToncenter, Network } from '@ton/walletkit'
import type { AgenticNetwork } from './agentic-config'

const TONCENTER_ENDPOINTS: Record<AgenticNetwork, string> = {
  mainnet: 'https://toncenter.com',
  testnet: 'https://testnet.toncenter.com',
}

function getNetwork(network: AgenticNetwork): ReturnType<typeof Network.mainnet> {
  return network === 'mainnet' ? Network.mainnet() : Network.testnet()
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
  const stripped = messageHashHex.replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]{64}$/.test(stripped)) return null
  const msgHashB64 = Buffer.from(stripped, 'hex').toString('base64')

  const client = new ApiClientToncenter({
    endpoint: TONCENTER_ENDPOINTS[network],
    apiKey: opts.toncenter_api_key,
    network: getNetwork(network),
  })

  const deadline = Date.now() + (opts.timeout_ms ?? 60_000)
  const intervalMs = opts.interval_ms ?? 2_000

  while (Date.now() < deadline) {
    if (opts.signal?.aborted) return null
    try {
      const result = await client.getTransactionsByHash({ msgHash: msgHashB64 } as never)
      const txs = (result as { transactions?: Array<{ hash?: string }> }).transactions ?? []
      const hit = txs.find((t) => typeof t.hash === 'string' && t.hash.length > 0)
      if (hit?.hash) {
        const h = hit.hash.replace(/^0x/i, '')
        return `0x${h.toLowerCase()}`
      }
    } catch {
      // 404 / rate-limit / DNS / 5xx — keep polling within the deadline.
    }
    await sleep(intervalMs, opts.signal)
  }
  return null
}
