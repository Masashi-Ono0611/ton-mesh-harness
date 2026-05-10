import { describe, expect, it } from 'vitest'
import { checkEnv, TONUTILS_DEFAULT_UDP_PORT } from '../src/sdk/check'
import { CheckEnvResultSchema } from '../src/sdk/schemas'

describe('SDK checkEnv()', () => {
  it('returns a value that matches the F2 zod schema', async () => {
    const result = await checkEnv()
    // The function already calls .parse() internally; this re-validates as a defence-in-depth.
    expect(() => CheckEnvResultSchema.parse(result)).not.toThrow()
  })

  it('always reports the running Node version', async () => {
    const result = await checkEnv()
    expect(result.node_version).toBe(process.version)
  })

  it('reports `ready: false` if any blocker is present', async () => {
    const result = await checkEnv()
    expect(result.ready).toBe(result.blocking.length === 0)
  })

  it('UDP port 17555 default is exposed for renderers', () => {
    expect(TONUTILS_DEFAULT_UDP_PORT).toBe(17555)
  })

  it('source_dir_valid is null when no source_dir is provided', async () => {
    const result = await checkEnv({ source_dir: null })
    expect(result.source_dir_valid).toBeNull()
  })

  it('source_dir_valid is true for an existing directory', async () => {
    const result = await checkEnv({ source_dir: process.cwd() })
    expect(result.source_dir_valid).toBe(true)
  })

  it('source_dir_valid is false + blocking entry for a missing dir', async () => {
    const result = await checkEnv({ source_dir: '/this/path/should/not/exist/anywhere' })
    expect(result.source_dir_valid).toBe(false)
    expect(result.ready).toBe(false)
    const codes = result.blocking.map((b) => b.code)
    expect(codes).toContain('SOURCE_DIR_NOT_FOUND')
  })

  it('wallet_signers_available always includes tonconnect (connector code is bundled)', async () => {
    const result = await checkEnv()
    expect(result.wallet_signers_available).toContain('tonconnect')
  })

  it('wallet_signers_available has unique values', async () => {
    const result = await checkEnv()
    expect(new Set(result.wallet_signers_available).size).toBe(result.wallet_signers_available.length)
  })
}, { timeout: 30_000 })
