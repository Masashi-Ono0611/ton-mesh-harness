import { describe, expect, it } from 'vitest'
import { checkEnv } from '../src/sdk/check'
import { CheckEnvResultSchema } from '../src/sdk/schemas'

/**
 * checkEnv() invariants the schema test cannot catch — actual probe behaviour
 * against this machine. Network-dependent assertions intentionally avoided
 * (CI without network would flake).
 */
describe('SDK checkEnv()', () => {
  it('output validates against CheckEnvResultSchema', async () => {
    const result = await checkEnv()
    expect(() => CheckEnvResultSchema.parse(result)).not.toThrow()
  })

  it('ready ⇔ blocking.length === 0', async () => {
    const result = await checkEnv()
    expect(result.ready).toBe(result.blocking.length === 0)
  })

  it('source_dir_valid is null when no source_dir is provided', async () => {
    const result = await checkEnv({ source_dir: null })
    expect(result.source_dir_valid).toBeNull()
  })

  it('source_dir_valid + blocking entry for a missing dir', async () => {
    const result = await checkEnv({ source_dir: '/this/path/should/not/exist/anywhere' })
    expect(result.source_dir_valid).toBe(false)
    expect(result.ready).toBe(false)
    expect(result.blocking.map((b) => b.code)).toContain('SOURCE_DIR_NOT_FOUND')
  })

  it('wallet_signers_available always includes tonconnect (Path 1 connector is bundled)', async () => {
    const result = await checkEnv()
    expect(result.wallet_signers_available).toContain('tonconnect')
  })
}, { timeout: 30_000 })
