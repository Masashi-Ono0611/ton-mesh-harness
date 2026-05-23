import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { keyPairFromSeed } from '@ton/crypto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  PROVENANCE_MANIFEST_VERSION,
  PROVENANCE_KIT_NAME,
  buildManifest,
  canonicalizeClaim,
  seedFromHex,
  verifyManifest,
  writeManifest,
  type ProvenanceClaim,
} from '../src/sdk/provenance'

function claim(over: Partial<ProvenanceClaim> = {}): ProvenanceClaim {
  return {
    manifest_version: PROVENANCE_MANIFEST_VERSION,
    kit: PROVENANCE_KIT_NAME,
    kit_version: '0.8.0-test',
    domain: 'example.ton',
    deployer_address: '0:abc',
    deployed_at: '2026-05-23T00:00:00.000Z',
    ...over,
  }
}

const SEED = Buffer.alloc(32, 7) // deterministic synthetic Ed25519 seed

const tmpDirs: string[] = []
afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true })
})

describe('provenance canonicalization', () => {
  it('is deterministic regardless of key order', () => {
    const a = canonicalizeClaim(claim())
    const b = canonicalizeClaim({
      deployed_at: '2026-05-23T00:00:00.000Z',
      domain: 'example.ton',
      kit: PROVENANCE_KIT_NAME,
      kit_version: '0.8.0-test',
      manifest_version: PROVENANCE_MANIFEST_VERSION,
      deployer_address: '0:abc',
    })
    expect(a).toBe(b)
  })
})

describe('provenance signing + verification', () => {
  it('signs and verifies a round-trip', () => {
    const m = buildManifest(claim(), SEED)
    expect(m.signed).toBe(true)
    expect(m.signature).toBeTruthy()
    expect(m.public_key).toBe(keyPairFromSeed(SEED).publicKey.toString('hex'))

    const v = verifyManifest(m)
    expect(v.signed).toBe(true)
    expect(v.valid).toBe(true)
  })

  it('rejects a tampered claim', () => {
    const m = buildManifest(claim(), SEED)
    const tampered = { ...m, domain: 'evil.ton' } // signature no longer matches
    const v = verifyManifest(tampered)
    expect(v.valid).toBe(false)
    expect(v.reason).toMatch(/does not match/)
  })

  it('rejects a tampered signature', () => {
    const m = buildManifest(claim(), SEED)
    const tampered = { ...m, signature: Buffer.alloc(64, 1).toString('base64') }
    expect(verifyManifest(tampered).valid).toBe(false)
  })

  it('treats an unsigned manifest as not-valid (signed:false)', () => {
    const m = buildManifest(claim({ deployer_address: null }))
    expect(m.signed).toBe(false)
    expect(m.signature).toBeNull()
    const v = verifyManifest(m)
    expect(v.signed).toBe(false)
    expect(v.valid).toBe(false)
    expect(v.reason).toMatch(/unsigned/)
  })
})

describe('seedFromHex', () => {
  it('accepts 64-hex (32-byte) and 128-hex (64-byte) inputs', () => {
    expect(seedFromHex('aa'.repeat(32))).toHaveLength(32)
    expect(seedFromHex('bb'.repeat(64))).toHaveLength(32)
    expect(seedFromHex('0x' + 'cc'.repeat(32))).toHaveLength(32)
  })
  it('rejects malformed input', () => {
    expect(() => seedFromHex('nothex')).toThrow()
    expect(() => seedFromHex('ab')).toThrow()
  })
})

describe('writeManifest', () => {
  it('writes .well-known/ton-deploy.json that round-trips through verify', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prov-'))
    tmpDirs.push(dir)
    const m = buildManifest(claim(), SEED)
    const file = writeManifest(dir, m)
    expect(file).toBe(path.join(dir, '.well-known', 'ton-deploy.json'))
    const readBack = JSON.parse(fs.readFileSync(file, 'utf8'))
    expect(verifyManifest(readBack).valid).toBe(true)
  })
})
