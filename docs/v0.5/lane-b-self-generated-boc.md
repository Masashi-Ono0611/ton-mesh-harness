# Lane B · Self-generated contract BOC — the route around the upstream bug

**Date:** 2026-05-10
**Owner:** masashi.ono
**Status:** design accepted (route identified), implementation pending

---

## TL;DR

The `--max-span` uint8 cap is **a CLI parser bug only**. The on-chain provider contract accepts `uint32`. We can sidestep the entire CLI by **building the contract message BOC ourselves in TypeScript** and feeding it to TON Connect, the same way we already build the DNS update message.

This unblocks v0.5 without any upstream dependency.

---

## Why this works

### The contract layer is already correct

`storage-provider.fc` (verified against v2026.04-1) declares the inbound message TL-B as:

```funC
;; new_storage_contract#00000001 query_id:uint64
;;     info:(^ TorrentInfo)
;;     microchunk_hash:uint256
;;     expected_rate:Coins
;;     expected_max_span:uint32       ← uint32, not uint8
;;     = NewStorageContract;
```

`op::offer_storage_contract = 0x107c49ef` (from `constants.fc`).

The provider contract's `recv_internal` reads `expected_max_span` with `load_uint(32)`, then passes it through to `deploy_storage_contract`, which serializes the storage contract's state with `.store_uint(max_span, 32)`. **Every byte path on chain is uint32 already.** The 200s cap is a regression introduced solely by the CLI parser on line 681 of `storage-daemon-cli.cpp`.

### What we currently use the CLI for

`src/provider.ts` calls `storage-daemon-cli` for two things:

1. **`get <bagId> --json`** — returns total size in bytes (used for amount calculation)
2. **`new-contract-message <bagId> <outFile> --rate <r> --max-span 200`** — generates the BOC

(1) is fine. (2) is what we replace.

### What we need to build the BOC

| Component             | Where it comes from                                            |
|-----------------------|----------------------------------------------------------------|
| `op` (uint32)         | constant `0x107c49ef`                                          |
| `query_id` (uint64)   | random / monotonic — we choose                                 |
| `info` (^TorrentInfo) | daemon `get-meta <bag> <file>` returns the Cell as a BOC dump  |
| `microchunk_hash`     | also exposed by `get-meta` / `get … --json`                    |
| `expected_rate`       | from TONAPI provider list (already fetched)                    |
| `expected_max_span`   | **user-chosen, uint32**, default e.g. 86400 (1 day)            |
| `amount` (msg value)  | recompute on real span: `sizeMb * rate * spanDays + buffer`    |

The `info` Cell is already serialized by the daemon — we don't have to construct TorrentInfo ourselves. We only have to wrap it in the outer message and ship the BOC to TON Connect.

### Why this isn't risky

- Provider contract is **deployed mainnet code**, public, audited by usage.
- We are not changing the contract — we are emitting **the same message the CLI emits**, with one type widened on our side.
- Output BOC can be diffed byte-for-byte against the CLI's output for span ≤ 255 to prove parity.
- @ton/ton already has `beginCell()` / `BitBuilder` primitives we use elsewhere (DNS update path).

---

## Implementation plan

### Step 1 — daemon meta extraction

Replace the current `getBagSizeBytes` flow with one richer call:

```ts
// src/daemon.ts (or src/provider.ts)
interface BagMeta {
  totalSize: number          // uint64
  torrentInfoBoc: Buffer     // raw BOC of TorrentInfo cell
  microchunkHash: Buffer     // 32 bytes
  rootHash: Buffer           // 32 bytes (debug / logging)
}

function getBagMeta(bagId: string, daemon: DaemonHandle): BagMeta
```

Internally, run `storage-daemon-cli`:
- `get <bagId> --json` for size + microchunk
- `get-meta <bagId> <tmpFile>` to dump the TorrentInfo cell, then `Cell.fromBoc(readFileSync(tmpFile))[0]`

### Step 2 — pure-TS BOC builder

```ts
// src/provider/contractMessage.ts
import { beginCell, Cell, Address } from '@ton/ton'

const OP_OFFER_STORAGE_CONTRACT = 0x107c49ef

export function buildOfferStorageContractMessage(args: {
  queryId: bigint
  torrentInfo: Cell
  microchunkHash: Buffer       // 32 bytes
  expectedRateNanoPerMbDay: bigint
  expectedMaxSpanSeconds: number  // any uint32
}): Cell {
  return beginCell()
    .storeUint(OP_OFFER_STORAGE_CONTRACT, 32)
    .storeUint(args.queryId, 64)
    .storeRef(args.torrentInfo)
    .storeUint(BigInt('0x' + args.microchunkHash.toString('hex')), 256)
    .storeCoins(args.expectedRateNanoPerMbDay)
    .storeUint(args.expectedMaxSpanSeconds, 32)
    .endCell()
}
```

### Step 3 — wire into provider.ts

`generateContractMessage` becomes:

```ts
export function generateContractMessage(
  bagId: string,
  meta: BagMeta,
  provider: Provider,
  spanSeconds: number,         // ← new, default 86400
): ContractMessage {
  const msgCell = buildOfferStorageContractMessage({
    queryId: BigInt(Math.floor(Date.now() / 1000)),
    torrentInfo: Cell.fromBoc(meta.torrentInfoBoc)[0],
    microchunkHash: meta.microchunkHash,
    expectedRateNanoPerMbDay: BigInt(provider.ratePerMbDay),
    expectedMaxSpanSeconds: spanSeconds,
  })

  const sizeMb = Math.max(meta.totalSize / 1_000_000, 0.1)
  const spanDays = spanSeconds / 86400
  const storageCostNano = BigInt(Math.ceil(sizeMb * provider.ratePerMbDay * spanDays))
  const amountNano = storageCostNano + 300_000_000n

  return {
    bocBase64: msgCell.toBoc().toString('base64'),
    amountNano,
    providerAddress: Address.parse(provider.address),
    spanDays,
    rateTonPerGbYear: (provider.ratePerMbDay * 1000 / 1e9) * 365,
  }
}
```

### Step 4 — CLI flag

`src/cli.ts`:
```ts
.option('--span <seconds>', 'Provider contract span in seconds (default 86400 = 1 day)', '86400')
```

Validate: positive integer, ≤ `2**32 - 1`.

### Step 5 — parity test ✅ done 2026-05-10

Before unpinning, generate two BOCs for the same `(bagId, rate, span=200)` — one via `new-contract-message`, one via the new builder — and `assert(bocCli.equals(bocSelf))`. This pins the byte layout and protects against TL-B drift.

**Status:** complete. `test/provider-parity.integration.test.ts` (run with `RUN_DAEMON_TESTS=1`) demonstrates:

1. CLI's BOC parses with the expected layout (op + queryId + ^TorrentInfo + microchunk + rate + span).
2. Self-generated BOC is **byte-equal** to the CLI's at span=200.
3. Self-generated BOC at span=86400 round-trips correctly (uint32 encoding).
4. CLI's daemon parser rejects span=256 — the uint8 cap is real.

**Confirmed serialization flag:** the daemon uses `vm::std_boc_serialize`, which equals `Cell.toBoc({ idx: false, crc32: false })` in `@ton/core`. Default `toBoc()` adds a crc32 trailer and produces a different first byte (0x41 vs 0x01) — when wiring step 3 below, **always use `{ idx: false, crc32: false }`** for the outbound BOC.

Sample CLI BOC header (mode `0x01`, no crc32):
```
b5ee9c72 01 0102 ... 0163107c49ef 0000000000000000 ...
              └ refs/cells               └ opcode  └ queryId
```

### Step 6 — soak test

Sign on mainnet at `--span 86400` for a small bag (~10 KB). Verify:
- contract appears at the expected stateinit address
- TONAPI `/v2/storage/bag/{id}` shows the contract as active for ≥ 24 h
- after span elapses, contract enters expected state (terminate or extend, depending on provider)

### Step 7 — remove the pin in docs

Update:
- `docs/provider-contract.md` — delete the "uint8 bug" section; describe `--span`
- `README.md` — note removal of 200s cap
- this dir — close the lane

---

## What still depends on the daemon binary

After this lane lands, the daemon is used for exactly:

- bag creation (`create`) — uploads files, computes Merkle tree
- `get` / `get-meta` — read-only metadata extraction
- ADNL serving (`--watch` mode keeps it alive)

We never call `new-contract-message` again. The buggy code path is dead from our perspective.

---

## Why not just use tonutils-storage instead

`tonutils-storage` (xssnick, Go) is a credible alternative implementation with an HTTP API. Tempting, but:

1. Switching the daemon binary is a much larger change than building one BOC ourselves.
2. tonutils-storage's HTTP API surface (per its README) is `/api/v1/{add, list, details, create, remove, stop, piece/proof, verify}` — **no contract-message endpoint** is documented. We would still have to build the BOC ourselves.
3. Two daemons to support (TON official + tonutils) doubles our test matrix.
4. The official daemon is what TON's provider ecosystem speaks to. Sticking with it minimizes interop risk.

Keep tonutils-storage in the back pocket as a fallback, but the BOC route is strictly smaller in scope.

---

## Order of execution

1. Step 5 first (parity test) — proves the route works before any user-facing change.
2. Steps 1–4 — implementation.
3. Step 6 — mainnet soak.
4. Step 7 — close-out.

Estimated effort: **1–2 days** end-to-end.

---

## Update to `lane-b-max-span-status.md`

The recommended option becomes **D: self-generated BOC**, replacing A/B/C (which all assumed dependence on upstream). See that file for the new option block.
