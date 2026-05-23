import { describe, expect, it } from 'vitest'
import { ensureTonutilsNetworkConfig } from '../src/daemon/tonutils-process'

/**
 * #33 testnet-via-MCP: mainnet must NOT fetch or write a network config —
 * the daemon uses its embedded mainnet default. (The testnet branch fetches
 * + caches the global config; that path is exercised by the gated daemon
 * integration + the live MCP deploy validation, not here, since it hits the
 * network.)
 */
describe('ensureTonutilsNetworkConfig', () => {
  it('returns undefined for mainnet without any network access', async () => {
    await expect(ensureTonutilsNetworkConfig(false)).resolves.toBeUndefined()
  })
})
