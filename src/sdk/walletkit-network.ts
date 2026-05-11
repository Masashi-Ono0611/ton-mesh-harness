/**
 * Tiny isolation layer for walletkit-specific factories. Keeping this
 * in its own module means modules that DON'T sign or look up txs
 * (e.g. agentic-config.ts, endpoints.ts, deploy.ts) don't pull in
 * `@ton/walletkit` — which matters because walletkit ships ESM files
 * with directory imports that Node 22+ rejects unless we go through
 * tsup's noExternal bundling.
 *
 * Only `agentic-sign.ts` and `resolve-tx.ts` import from here.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { Network } from '@ton/walletkit'
import type { AgenticNetwork } from './agentic-config'

/**
 * Convert our string-discriminated `AgenticNetwork` to walletkit's
 * chainId-tagged `Network` object.
 */
export function getWalletkitNetwork(
  network: AgenticNetwork,
): ReturnType<typeof Network.mainnet> {
  return network === 'mainnet' ? Network.mainnet() : Network.testnet()
}
