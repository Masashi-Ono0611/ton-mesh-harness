/**
 * Tiny isolation layer for walletkit-specific factories. Keeping this
 * in its own module means modules that DON'T sign or look up txs
 * (e.g. agentic-config.ts, endpoints.ts, deploy.ts) don't pull in
 * `@ton/walletkit` — which matters because walletkit ships ESM files
 * with directory imports that Node 22+ rejects unless the build inlines
 * `@ton/walletkit` (bun build externalizes every other dep but bundles
 * this one — see scripts/build.ts).
 *
 * Only `agentic-sign.ts` and `resolve-tx.ts` import from here.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { ApiClientToncenter, Network } from '@ton/walletkit'
import type { AgenticNetwork } from './agentic-config'
import { TONCENTER_ENDPOINTS } from './endpoints'

/**
 * Convert our string-discriminated `AgenticNetwork` to walletkit's
 * chainId-tagged `Network` object.
 */
export function getWalletkitNetwork(
  network: AgenticNetwork,
): ReturnType<typeof Network.mainnet> {
  return network === 'mainnet' ? Network.mainnet() : Network.testnet()
}

/**
 * Build an `ApiClientToncenter` for the given network using the
 * canonical Toncenter v3 endpoint (single source of truth in
 * `endpoints.ts`). The API key is optional — without it the client
 * uses the public per-IP rate limit.
 *
 * Centralised so the signer (`agentic-sign.ts`) and the tx-hash
 * resolver (`resolve-tx.ts`) don't both reconstruct the same config.
 */
export function buildToncenterClient(
  network: AgenticNetwork,
  apiKey: string | undefined,
): ApiClientToncenter {
  return new ApiClientToncenter({
    endpoint: TONCENTER_ENDPOINTS[network],
    apiKey,
    network: getWalletkitNetwork(network),
  })
}
