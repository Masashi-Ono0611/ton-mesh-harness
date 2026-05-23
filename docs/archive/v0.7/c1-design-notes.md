# v0.7 C1 keyring spike — captured constants

**Date**: 2026-05-10
**Source**: `generate-random-id` from `ton-blockchain/ton@v2026.04-1`
(extracted from `ton-mac-arm64.zip`)

This file pins the TL constructor IDs that `keyring.ts` depends on. If any of
these change in a future TON release, the unit tests `test/daemon/keyring.test.ts`
(byte-for-byte fixture comparison) will fail and surface the drift.

## Captured fixture

`generate-random-id -m keys -n test-keys` produced:

```
ADNL short id (stdout):
  03606123B42319E4B175D4CD8491D94B0F08D71572EA9E6CD83C8C957F2D37E1
  A2BhI7QjGeSxddTNhJHZSw8I1xVy6p5s2DyMlX8tN+E= (base64 of same 32B)

test-keys (private key file, 36 bytes):
  17 23 68 49 7f f7 d2 10 cf e8 75 5f be a5 df b3
  21 3a 73 e1 43 e2 b7 5e 90 cc 80 34 12 28 bd 97
  1f 66 1f 77

test-keys.pub (public key file, 36 bytes):
  c6 b4 13 48 6a 76 b9 3f 6a 3e 8a 28 e7 43 f3 88
  a0 c8 2d e6 e0 b7 b0 45 af bf 72 76 23 42 1d 92
  5d b0 bb 40
```

## Decoded format

| Layer | Field | Value | Size |
|---|---|---|---|
| Priv file | TL ID `pk.ed25519` | `0x49682317` (LE: `17 23 68 49`) | 4B |
| Priv file | private seed | 32B raw Ed25519 seed | 32B |
| Pub file  | TL ID `pub.ed25519` | `0x4813b4c6` (LE: `c6 b4 13 48`) | 4B |
| Pub file  | public key | 32B raw Ed25519 point | 32B |

ADNL short id derivation (verified byte-for-byte):

```
short_id = sha256(<pub_file_content>)
        = sha256([0xc6 0xb4 0x13 0x48] || <pub_32B>)
```

Verified against the stdout `ADNL short id` value: ✅ MATCH.

Ed25519 derivation in Node:

```ts
import { createPrivateKey } from 'node:crypto'

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
const seed32 = randomBytes(32) // or Node's crypto.generateKeyPairSync output
const pkcs8 = Buffer.concat([PKCS8_ED25519_PREFIX, seed32])
const key = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
const pub32 = Buffer.from(key.export({ format: 'jwk' }).x!, 'base64url')
```

Spike verified: derived pub matches the `.pub` file body for the captured fixture.

## Path layout for `rldp-http-proxy`

```
<db_root>/
  keyring/
    <short_id_hex_lowercase>   ← contents = [pk.ed25519_LE 4B][priv 32B]
```

The `-A <short_id_hex>` flag tells `rldp-http-proxy` to use that key as the
server ADNL identity. `<short_id_hex>` is case-insensitive on the CLI but
the file on disk should be lowercase (TON's `td::buffer_to_hex` outputs
lowercase).

## Constants to lock into `src/daemon/keyring.ts`

```ts
// Captured 2026-05-10 from generate-random-id v2026.04-1.
// xxd output preserved at docs/v0.7/c1-design-notes.md.
export const TL_PRIV_ED25519_ID_LE = Buffer.from('17236849', 'hex') // 0x49682317
export const TL_PUB_ED25519_ID_LE  = Buffer.from('c6b41348', 'hex') // 0x4813b4c6
export const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
```

If TL scheme changes upstream (`ton-blockchain/ton/tl/generate/scheme/ton_api.tl`)
the constructor IDs will recompute via CRC32 and these constants need a refresh.
The fixture test will catch this on the next CI run.
