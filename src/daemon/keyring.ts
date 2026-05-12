// Pure-JS port of `generate-random-id -m keys` for `rldp-http-proxy` keyrings.
// Spike output and TL constructor ID derivation: docs/v0.7/c1-design-notes.md.

import { createHash, createPrivateKey, randomBytes } from 'node:crypto'
import {
  closeSync,
  constants as fsConstants,
  fchmodSync,
  lstatSync,
  mkdirSync,
  openSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import path from 'node:path'

// TL constructor IDs derived empirically from `generate-random-id` v2026.04-1
// (CRC32 of canonical TL lines `pk.ed25519 ...` and `pub.ed25519 ...`).
// If the upstream scheme rotates, the keyring fixture test will catch it.
export const TL_PRIV_ED25519_ID_LE = Buffer.from('17236849', 'hex') // 0x49682317
export const TL_PUB_ED25519_ID_LE  = Buffer.from('c6b41348', 'hex') // 0x4813b4c6

// PKCS8 v1 prefix that wraps a raw 32-byte Ed25519 seed for Node's createPrivateKey.
// Layout: SEQUENCE { INTEGER 0, AlgorithmIdentifier { OID id-Ed25519 }, OCTET STRING { OCTET STRING { seed } } }
export const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')

export interface AdnlIdentity {
  /** 64-char lowercase hex of `sha256(tl_serialize(pub.ed25519))`; the keyring filename. */
  shortIdHex: string
  /**
   * 55-char lowercase base32 user-friendly form (TON's `adnl_id_encode`).
   * This is what `rldp-http-proxy -A <…>` expects on the command line —
   * NOT the hex form. The encoding embeds a CRC16 checksum so a typo is
   * caught at parse time.
   */
  shortIdEncoded: string
  /** Raw 32-byte seed (used to rebuild the pub later if needed). */
  privSeed: Buffer
  /** Raw 32-byte public key, useful for diagnostics / dns_adnl_address writes. */
  pubKey: Buffer
}

/**
 * Mint a fresh Ed25519 ADNL identity. Matches the byte-for-byte format
 * `generate-random-id -m keys` produces — see the captured fixture in
 * docs/v0.7/c1-design-notes.md.
 */
export function generateAdnlIdentity(seed?: Buffer): AdnlIdentity {
  const privSeed = seed ?? randomBytes(32)
  if (privSeed.length !== 32) {
    throw new Error(`Ed25519 seed must be 32 bytes, got ${privSeed.length}`)
  }
  const pubKey = derivePubFromSeed(privSeed)
  const shortIdBuf = computeAdnlShortId(pubKey)
  const shortIdHex = shortIdBuf.toString('hex')
  const shortIdEncoded = adnlIdEncode(shortIdBuf)
  return { shortIdHex, shortIdEncoded, privSeed, pubKey }
}

/**
 * Write `<dbDir>/keyring/<shortIdHex>` with the 36-byte private-key file format
 * `[pk.ed25519 TL id LE 4B][priv 32B]`. Mode 0o600. Auto-creates the keyring/
 * subdirectory.
 *
 * Returns the absolute path of the file written.
 */
export function writeKeyringFile(dbDir: string, identity: AdnlIdentity): string {
  if (!path.isAbsolute(dbDir)) {
    throw new Error(`writeKeyringFile: dbDir must be absolute (got ${dbDir})`)
  }
  // shortIdHex is the keyring filename — used by rldp-http-proxy to look up
  // the key by ADNL short id. Validate the hex shape strictly so a caller
  // can never inject a path traversal component (e.g. `..` / `/`) or a
  // symlink lure. Per computeAdnlShortId() it MUST be 64 hex chars.
  if (!/^[0-9a-f]{64}$/.test(identity.shortIdHex)) {
    throw new Error(
      `writeKeyringFile: malformed shortIdHex (expected 64 hex chars, got ${JSON.stringify(identity.shortIdHex).slice(0, 80)})`,
    )
  }
  const keyringDir = path.join(dbDir, 'keyring')
  // Codex pre-GA review round 9 LOW: defend the parent dir from
  // symlink/junction redirection too. mkdirSync's `recursive: true`
  // is idempotent on existing dirs but silently follows symlinks
  // (mkdir at a symlink-to-elsewhere creates files under that
  // elsewhere). lstatSync the dir first; if it's a symlink, refuse.
  // If it's a regular dir, leave it alone. If it doesn't exist,
  // mkdirSync creates it.
  try {
    const dirStat = lstatSync(keyringDir)
    if (dirStat.isSymbolicLink()) {
      throw new Error(
        `writeKeyringFile: refusing to write into a symlinked keyring dir ${keyringDir} — ` +
          `delete the symlink and retry.`,
      )
    }
    if (!dirStat.isDirectory()) {
      throw new Error(
        `writeKeyringFile: ${keyringDir} exists but is not a directory (mode=${dirStat.mode.toString(8)})`,
      )
    }
  } catch (err) {
    if (!(err instanceof Error) || (err as { code?: string }).code !== 'ENOENT') {
      throw err
    }
  }
  mkdirSync(keyringDir, { recursive: true, mode: 0o700 })

  const filePath = path.join(keyringDir, identity.shortIdHex)
  const fileContent = Buffer.concat([TL_PRIV_ED25519_ID_LE, identity.privSeed])
  if (fileContent.length !== 36) {
    throw new Error(`Internal: keyring file content must be 36 bytes, got ${fileContent.length}`)
  }
  // Defence against an attacker who can place a symlink (or, on
  // Windows, a junction / reparse point) at filePath BEFORE we open
  // it. Codex pre-GA review round 7 MAJOR; round 8 caught that the
  // round-7 O_NOFOLLOW fix was POSIX-only — Node defines
  // `fsConstants.O_NOFOLLOW` only on macOS/Linux. On Windows the
  // fallback `?? 0` removed any protection.
  //
  // Portable approach:
  //   1. `lstatSync` to see if anything exists at filePath.
  //   2. If it does and is a regular file → unlink it (recreation
  //      is the intended semantic: rldp-http-proxy keyring rotation).
  //      If it's a symlink (or anything else: dir, socket, fifo) →
  //      refuse, since legitimate keyring entries are only regular
  //      files written by this function.
  //   3. Open with `O_CREAT | O_EXCL` — fails if anything raced in
  //      between unlink and open (TOCTOU window). Works identically
  //      on POSIX + Windows.
  //   4. `fchmodSync` via fd to tighten permissions on the open
  //      descriptor (closes the open-then-chmod TOCTOU window).
  try {
    const stat = lstatSync(filePath)
    if (stat.isSymbolicLink()) {
      throw new Error(
        `writeKeyringFile: refusing to write through a symlink at ${filePath} — ` +
          `keyring entries must be regular files. Delete the symlink and retry.`,
      )
    }
    if (!stat.isFile()) {
      throw new Error(
        `writeKeyringFile: refusing to write — ${filePath} exists but is not a regular file (mode=${stat.mode.toString(8)})`,
      )
    }
    // Pre-existing regular file: keyring rotation. Unlink first so
    // the O_EXCL open below succeeds.
    unlinkSync(filePath)
  } catch (err) {
    // ENOENT is expected — nothing was there, proceed to create.
    if (!(err instanceof Error) || (err as { code?: string }).code !== 'ENOENT') {
      throw err
    }
  }
  const fd = openSync(
    filePath,
    fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | (fsConstants.O_NOFOLLOW ?? 0),
    0o600,
  )
  try {
    // chmod via fd (fchmod) so we tighten permissions on the open file
    // descriptor — closes a TOCTOU window where another process could
    // hardlink an existing file into filePath between open and chmod.
    fchmodSync(fd, 0o600)
    writeSync(fd, fileContent)
  } finally {
    closeSync(fd)
  }
  return filePath
}

// ----- helpers -----

/**
 * The ADNL short_id is `sha256(tl_serialize(pub.ed25519))`, i.e.
 * `sha256([pub.ed25519 TL id LE 4B][pub 32B])`. Returns the 32-byte digest.
 */
export function computeAdnlShortId(pubKey: Buffer): Buffer {
  if (pubKey.length !== 32) {
    throw new Error(`computeAdnlShortId: pubKey must be 32 bytes, got ${pubKey.length}`)
  }
  return createHash('sha256')
    .update(TL_PUB_ED25519_ID_LE)
    .update(pubKey)
    .digest()
}

/**
 * Encode a 32-byte ADNL short id into the 55-char base32+CRC16 form
 * `rldp-http-proxy -A` expects. Mirrors `td::adnl_id_encode` in
 * `crypto/common/util.cpp`. Format:
 *   [0x2d][32B id][CRC16-XMODEM(33B) big-endian 2B] → base32 → drop leading 'f'
 */
export function adnlIdEncode(shortId: Buffer, upper = false): string {
  if (shortId.length !== 32) {
    throw new Error(`adnlIdEncode: shortId must be 32 bytes, got ${shortId.length}`)
  }
  const buf = Buffer.alloc(35)
  buf[0] = 0x2d
  shortId.copy(buf, 1)
  const crc = crc16Xmodem(buf.subarray(0, 33))
  buf[33] = (crc >>> 8) & 0xff
  buf[34] = crc & 0xff
  // base32 of 35 bytes = 56 chars; the first char is always 'F'/'f' due
  // to the 0x2d (00101101) prefix → first 5 bits 00101 → index 5.
  const encoded = base32Encode(buf, upper)
  return encoded.slice(1)
}

/**
 * Decode the user-friendly 55-char ADNL short id back to 32 bytes.
 * Performs the CRC16 check; throws on mismatch or wrong length.
 */
export function adnlIdDecode(encoded: string): Buffer {
  if (encoded.length !== 55) {
    throw new Error(`adnlIdDecode: expected 55 chars, got ${encoded.length}`)
  }
  const padded = 'f' + encoded
  const buf = base32Decode(padded)
  if (buf.length !== 35) {
    throw new Error(`adnlIdDecode: base32 decode produced ${buf.length} bytes, want 35`)
  }
  if (buf[0] !== 0x2d) {
    throw new Error(`adnlIdDecode: invalid prefix 0x${buf[0].toString(16)}, want 0x2d`)
  }
  const expected = (buf[33] << 8) | buf[34]
  const got = crc16Xmodem(buf.subarray(0, 33))
  if (expected !== got) {
    throw new Error(`adnlIdDecode: CRC16 mismatch (got 0x${got.toString(16)}, want 0x${expected.toString(16)})`)
  }
  return Buffer.from(buf.subarray(1, 33))
}

// CRC-16/XMODEM (poly 0x1021, init 0x0000, no reflect, no XOR-out).
// Matches td::crc16 in tdutils/td/utils/crypto.cpp (table-driven there;
// we use the bit-by-bit form for clarity since this runs once per deploy).
function crc16Xmodem(buf: Buffer): number {
  let crc = 0
  for (const byte of buf) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xffff
    }
  }
  return crc
}

const BASE32_LOWER = 'abcdefghijklmnopqrstuvwxyz234567'
const BASE32_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(buf: Buffer, upper = false): string {
  const alphabet = upper ? BASE32_UPPER : BASE32_LOWER
  let out = ''
  let value = 0
  let bits = 0
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += alphabet[(value >>> bits) & 0x1f]
    }
  }
  if (bits > 0) {
    out += alphabet[(value << (5 - bits)) & 0x1f]
  }
  // No padding for canonical TON usage (35 bytes ÷ 5 bits = 56 chars exactly).
  return out
}

function base32Decode(s: string): Buffer {
  const map = new Map<string, number>()
  for (let i = 0; i < BASE32_LOWER.length; i++) {
    map.set(BASE32_LOWER[i], i)
    map.set(BASE32_UPPER[i], i)
  }
  let value = 0
  let bits = 0
  const out: number[] = []
  for (const ch of s) {
    const v = map.get(ch)
    if (v === undefined) throw new Error(`base32Decode: invalid char ${JSON.stringify(ch)}`)
    value = (value << 5) | v
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 0xff)
    }
  }
  return Buffer.from(out)
}

function derivePubFromSeed(seed32: Buffer): Buffer {
  const pkcs8 = Buffer.concat([PKCS8_ED25519_PREFIX, seed32])
  const keyObj = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
  // JWK export gives `{ kty: 'OKP', crv: 'Ed25519', x: <base64url pub>, d: <base64url priv> }`.
  // We only need `x` here; we already have the seed.
  const jwk = keyObj.export({ format: 'jwk' }) as { x?: string }
  if (!jwk.x) {
    throw new Error('Failed to derive Ed25519 public key (jwk.x missing)')
  }
  return Buffer.from(jwk.x, 'base64url')
}
