import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import {
  TL_PRIV_ED25519_ID_LE,
  TL_PUB_ED25519_ID_LE,
  generateAdnlIdentity,
  computeAdnlShortId,
  loadOrCreateSiteSeed,
  resolveSiteKeyringPath,
  writeKeyringFile,
  adnlIdEncode,
  adnlIdDecode,
} from '../../src/daemon/keyring'

// ----- captured fixture from `generate-random-id -m keys` v2026.04-1 -----
// Source: docs/archive/v0.7/c1-design-notes.md spike.
const FIXTURE_PRIV_FILE_HEX = (
  '17236849' +                                                              // pk.ed25519 TL id (LE)
  '7ff7d210cfe8755fbea5dfb3213a73e143e2b75e90cc80341228bd971f661f77'        // 32B seed
)
const FIXTURE_PUB_FILE_HEX = (
  'c6b41348' +                                                              // pub.ed25519 TL id (LE)
  '6a76b93f6a3e8a28e743f388a0c82de6e0b7b045afbf727623421d925db0bb40'        // 32B pubkey
)
const FIXTURE_SEED = Buffer.from(FIXTURE_PRIV_FILE_HEX.slice(8), 'hex')
const FIXTURE_PUB = Buffer.from(FIXTURE_PUB_FILE_HEX.slice(8), 'hex')
const FIXTURE_SHORT_ID =
  '03606123b42319e4b175d4cd8491d94b0f08d71572ea9e6cd83c8c957f2d37e1'
// generate-random-id stdout for the same key (the form `rldp-http-proxy -A`
// expects). 55 chars base32 + CRC16, lowercase, no leading 'f'.
const FIXTURE_ADNL_ENCODED =
  'ubwayjdwqrrtzfroxkm3ber3ffq6cgxcvzovhtm3a6izfl7fu36cddh'

describe('keyring constants', () => {
  it('TL_PRIV_ED25519_ID_LE matches captured fixture', () => {
    expect(TL_PRIV_ED25519_ID_LE.toString('hex')).toBe('17236849')
  })

  it('TL_PUB_ED25519_ID_LE matches captured fixture', () => {
    expect(TL_PUB_ED25519_ID_LE.toString('hex')).toBe('c6b41348')
  })
})

describe('computeAdnlShortId', () => {
  it('reproduces the fixture short id (sha256 of pub file content)', () => {
    const got = computeAdnlShortId(FIXTURE_PUB).toString('hex')
    expect(got).toBe(FIXTURE_SHORT_ID)
  })

  it('rejects pubKey of wrong length', () => {
    expect(() => computeAdnlShortId(Buffer.alloc(31))).toThrow(/32 bytes/)
    expect(() => computeAdnlShortId(Buffer.alloc(33))).toThrow(/32 bytes/)
  })
})

describe('adnlIdEncode / adnlIdDecode', () => {
  it('matches generate-random-id stdout for the captured key', () => {
    const got = adnlIdEncode(Buffer.from(FIXTURE_SHORT_ID, 'hex'))
    expect(got).toBe(FIXTURE_ADNL_ENCODED)
  })

  it('round-trips arbitrary 32-byte ids', () => {
    const random32 = Buffer.from(
      Array.from({ length: 32 }, (_, i) => (i * 17) & 0xff),
    )
    const encoded = adnlIdEncode(random32)
    expect(encoded).toHaveLength(55)
    const decoded = adnlIdDecode(encoded)
    expect(decoded.equals(random32)).toBe(true)
  })

  it('rejects wrong-length encoded input', () => {
    expect(() => adnlIdDecode('too short')).toThrow(/55 chars/)
  })

  it('rejects CRC16 corruption', () => {
    const ok = adnlIdEncode(Buffer.from(FIXTURE_SHORT_ID, 'hex'))
    // mutate one char in the CRC region (last 4 chars are the encoded CRC tail)
    const corrupted = ok.slice(0, -1) + (ok.slice(-1) === 'a' ? 'b' : 'a')
    expect(() => adnlIdDecode(corrupted)).toThrow(/CRC16 mismatch|invalid char|invalid prefix/)
  })

  it('rejects 32-byte input of wrong length to encode', () => {
    expect(() => adnlIdEncode(Buffer.alloc(31))).toThrow(/32 bytes/)
  })
})

describe('generateAdnlIdentity', () => {
  it('reproduces the fixture pub + short id + encoded form when given the fixture seed', () => {
    const id = generateAdnlIdentity(FIXTURE_SEED)
    expect(id.shortIdHex).toBe(FIXTURE_SHORT_ID)
    expect(id.shortIdEncoded).toBe(FIXTURE_ADNL_ENCODED)
    expect(id.privSeed.equals(FIXTURE_SEED)).toBe(true)
    expect(id.pubKey.equals(FIXTURE_PUB)).toBe(true)
  })

  it('produces a fresh, valid identity by default', () => {
    const a = generateAdnlIdentity()
    const b = generateAdnlIdentity()
    expect(a.shortIdHex).not.toBe(b.shortIdHex)            // randomness
    expect(a.privSeed.length).toBe(32)
    expect(a.pubKey.length).toBe(32)
    expect(a.shortIdHex).toMatch(/^[0-9a-f]{64}$/)         // lowercase hex 64 chars
    expect(a.shortIdEncoded).toMatch(/^[a-z2-7]{55}$/)     // base32 lowercase, 55 chars
    // round-trip: short id derives deterministically from the pub
    expect(computeAdnlShortId(a.pubKey).toString('hex')).toBe(a.shortIdHex)
    // round-trip: encoded form decodes back to the hex bytes
    expect(adnlIdDecode(a.shortIdEncoded).toString('hex')).toBe(a.shortIdHex)
  })

  it('rejects malformed seeds', () => {
    expect(() => generateAdnlIdentity(Buffer.alloc(31))).toThrow(/32 bytes/)
    expect(() => generateAdnlIdentity(Buffer.alloc(33))).toThrow(/32 bytes/)
  })
})

describe('writeKeyringFile', () => {
  it('writes the 36-byte file at <dbDir>/keyring/<shortId> and matches fixture bytes', () => {
    const dbDir = mkdtempSync(path.join(tmpdir(), 'tsdk-keyring-'))
    const id = generateAdnlIdentity(FIXTURE_SEED)
    const written = writeKeyringFile(dbDir, id)

    // Path matches the convention rldp-http-proxy reads from: UPPERCASE hex
    // short id (td::Bits256::to_hex). See the uppercase regression test below.
    expect(written).toBe(path.join(dbDir, 'keyring', FIXTURE_SHORT_ID.toUpperCase()))

    // File content is byte-for-byte identical to the fixture priv file
    const buf = readFileSync(written)
    expect(buf.length).toBe(36)
    expect(buf.toString('hex')).toBe(FIXTURE_PRIV_FILE_HEX)
  })

  it('names the keyring file with UPPERCASE hex (rldp-http-proxy lookup convention)', () => {
    // Regression for #70: rldp-http-proxy looks keys up by td::Bits256::to_hex()
    // (uppercase). The kit previously wrote Node's lowercase Buffer.toString('hex'),
    // which only resolved on case-insensitive filesystems (macOS dev); on
    // case-sensitive Linux the proxy aborted at startup with `key not in db`.
    // Confirmed empirically against the installed binary on a GCP Linux host
    // 2026-06-22.
    const dbDir = mkdtempSync(path.join(tmpdir(), 'tsdk-keyring-'))
    const id = generateAdnlIdentity(FIXTURE_SEED)
    const base = path.basename(writeKeyringFile(dbDir, id))
    expect(base).toBe(base.toUpperCase())          // contains no lowercase hex digits
    expect(base).toBe(FIXTURE_SHORT_ID.toUpperCase())
    expect(base).toMatch(/^[0-9A-F]{64}$/)
  })

  it('writes file with mode 0o600 (owner-only readable)', () => {
    const dbDir = mkdtempSync(path.join(tmpdir(), 'tsdk-keyring-'))
    const id = generateAdnlIdentity()
    const written = writeKeyringFile(dbDir, id)

    const mode = statSync(written).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('rejects relative dbDir', () => {
    const id = generateAdnlIdentity()
    expect(() => writeKeyringFile('relative/path', id)).toThrow(/absolute/)
  })
})

describe('resolveSiteKeyringPath', () => {
  it('uses the per-domain default under ~/.ton-sovereign/site-keyring/', () => {
    const p = resolveSiteKeyringPath('mydapp.ton')
    expect(p).toBe(path.join(homedir(), '.ton-sovereign', 'site-keyring', 'mydapp.ton.hex'))
  })

  it('appends .ton when the domain lacks the suffix', () => {
    expect(resolveSiteKeyringPath('mydapp')).toBe(
      path.join(homedir(), '.ton-sovereign', 'site-keyring', 'mydapp.ton.hex'),
    )
  })

  it('sanitizes unexpected separators out of the filename', () => {
    const p = resolveSiteKeyringPath('a/b.ton')
    expect(path.dirname(p)).toBe(path.join(homedir(), '.ton-sovereign', 'site-keyring'))
    expect(path.basename(p)).toBe('a_b.ton.hex')
  })

  it('honors an explicit override, resolved to absolute', () => {
    // Use path.resolve for the expectation too — on Windows the override
    // resolves to a drive-qualified path (C:\tmp\…), not the POSIX literal.
    const override = path.join(tmpdir(), 'custom-seed.hex')
    expect(resolveSiteKeyringPath('mydapp.ton', override)).toBe(path.resolve(override))
  })
})

describe('loadOrCreateSiteSeed', () => {
  it('mints + persists a fresh 32-byte seed (0o600) when absent, created=true', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tsdk-siteseed-'))
    const seedPath = path.join(dir, 'sub', 'site.hex') // nested dir auto-created
    const { seed, created } = loadOrCreateSiteSeed(seedPath)
    expect(created).toBe(true)
    expect(seed.length).toBe(32)
    expect(statSync(seedPath).mode & 0o777).toBe(0o600)
    // File holds the hex of the returned seed.
    expect(readFileSync(seedPath, 'utf8').trim()).toBe(seed.toString('hex'))
  })

  it('reuses the persisted seed on a second call (created=false, same identity)', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tsdk-siteseed-'))
    const seedPath = path.join(dir, 'site.hex')
    const first = loadOrCreateSiteSeed(seedPath)
    const second = loadOrCreateSiteSeed(seedPath)
    expect(second.created).toBe(false)
    expect(second.seed.equals(first.seed)).toBe(true)
    // The whole point: same seed ⇒ same ADNL short id across restarts.
    expect(generateAdnlIdentity(second.seed).shortIdHex).toBe(
      generateAdnlIdentity(first.seed).shortIdHex,
    )
  })

  it('rejects a relative path', () => {
    expect(() => loadOrCreateSiteSeed('relative/site.hex')).toThrow(/absolute/)
  })

  it('rejects a present-but-malformed seed file instead of silently re-minting', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tsdk-siteseed-'))
    const seedPath = path.join(dir, 'site.hex')
    writeFileSync(seedPath, 'not-a-valid-seed\n')
    expect(() => loadOrCreateSiteSeed(seedPath)).toThrow(/64-hex|32-byte/)
  })
})
