/**
 * Single source of truth for external service URLs the SDK + CLI talk to.
 *
 * Centralised here so endpoint changes (e.g. Toncenter migrating to a
 * new domain) flip in one place rather than three.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import type { AgenticNetwork } from './agentic-config'

/**
 * Toncenter v3 HTTP API base URLs. Used by `ApiClientToncenter` in
 * `agentic-sign.ts` (signing path) and `resolve-tx.ts` (tx-hash
 * lookup). Mirror the defaults `@ton/mcp` itself uses.
 */
export const TONCENTER_ENDPOINTS: Record<AgenticNetwork, string> = {
  mainnet: 'https://toncenter.com',
  testnet: 'https://testnet.toncenter.com',
}

/**
 * Build a tonviewer.com transaction URL. Accepts hashes with or without
 * the `0x` prefix; emits the canonical no-prefix form tonviewer expects.
 *
 * Note: tonviewer.com is the mainnet UI; testnet.tonviewer.com is the
 * testnet UI. Caller is expected to know which network the hash belongs
 * to (we don't smuggle that into the hash itself).
 */
export function tonviewerTxUrl(txHash: string, testnet = false): string {
  const cleaned = txHash.replace(/^0x/i, '')
  const host = testnet ? 'testnet.tonviewer.com' : 'tonviewer.com'
  return `https://${host}/transaction/${cleaned}`
}
