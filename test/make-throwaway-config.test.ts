import { createRequire } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadAgenticConfig } from '../src/sdk/agentic-config'

/**
 * The throwaway-config generator (#123) hand-builds a config object in an
 * untyped .cjs that MUST satisfy the strict (`.strict()`) StoredStandardWalletSchema
 * the SDK loader enforces. Without this round-trip, a future @ton/mcp schema bump
 * or a field-name drift in the generator would only surface at e2e runtime, never
 * in `bun test` — the exact silent-rot vector `.strict()` exists to catch (#148).
 */
const require = createRequire(import.meta.url)
const { buildThrowawayConfig } = require('../scripts/make-throwaway-agentic-config.cjs') as {
  buildThrowawayConfig: (args: {
    network: 'mainnet' | 'testnet'
    mnemonic: string
    address: string
    id: string
    now: string
  }) => Record<string, unknown>
}

// 24 words satisfies the schema's "mnemonic OR private_key" refine; the loader
// does not parse the mnemonic or the address, so fixed strings are fine.
const MNEMONIC = Array.from({ length: 24 }, () => 'abandon').join(' ')
const ADDRESS = 'UQD0vdSA_NedR9uvbgN9EikRX-suesDxGeFg69XQMavfLqIw'

describe('buildThrowawayConfig — emitted config round-trips the strict loader (#148)', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const d of dirs) {
      try {
        rmSync(d, { recursive: true, force: true })
      } catch {
        /* best-effort */
      }
    }
    dirs.length = 0
  })

  for (const network of ['mainnet', 'testnet'] as const) {
    it(`loadAgenticConfig accepts the generated config (${network})`, () => {
      const id = `e2e-cancel-throwaway-test-${network}`
      const config = buildThrowawayConfig({
        network,
        mnemonic: MNEMONIC,
        address: ADDRESS,
        id,
        now: '2026-06-26T00:00:00.000Z',
      })

      const dir = mkdtempSync(join(tmpdir(), 'throwaway-cfg-'))
      dirs.push(dir)
      const file = join(dir, 'config.json')
      writeFileSync(file, JSON.stringify(config, null, 2))

      const selection = loadAgenticConfig({ config_path: file, network })
      expect(selection.wallet.address).toBe(ADDRESS)
      expect(selection.wallet.network).toBe(network)
      expect(selection.wallet.type).toBe('standard')
      expect(selection.config_path).toBe(file)
    })
  }

  it('a strict-schema violation (an unknown extra key) is rejected loudly', () => {
    const config = buildThrowawayConfig({
      network: 'mainnet',
      mnemonic: MNEMONIC,
      address: ADDRESS,
      id: 'e2e-cancel-throwaway-strict',
      now: '2026-06-26T00:00:00.000Z',
    }) as { wallets: Record<string, unknown>[] }
    // Simulate the exact drift `.strict()` guards against.
    config.wallets[0].unexpected_field = 'drift'

    const dir = mkdtempSync(join(tmpdir(), 'throwaway-cfg-'))
    dirs.push(dir)
    const file = join(dir, 'config.json')
    writeFileSync(file, JSON.stringify(config, null, 2))

    expect(() => loadAgenticConfig({ config_path: file, network: 'mainnet' })).toThrow()
  })
})
