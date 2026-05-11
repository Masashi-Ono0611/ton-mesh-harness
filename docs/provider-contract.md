# Storage-provider contracts (v0.4 → v0.5)

> **⚠ EXPERIMENTAL — as of the 2026-05-10 mainnet field-test, the mainnet storage-provider economy is largely dormant.**
> The five cheapest providers have never once issued `accept_storage_contract`, and `foundation.ton` itself self-hosts via its own daemon. For the foreseeable future, self-hosting via `--watch` is the recommended path. Details: [`v0.5/round-postmortem.md`](v0.5/round-postmortem.md).
>
> This document is preserved to record the mechanism and the behaviour it will exhibit if the provider economy revives.

A procedure (experimental) for keeping your site reachable even when your PC is offline.

---

## Overview

In a default deploy, **your PC is the seed node**. If it goes offline, the bag becomes unreachable.

With the `--provider` flag, you contract with a storage provider on the TON network to host the bag **24/7** (**by design**). Payment is in TON. From v0.5, the **contract duration is specified in seconds** (`--span`; default 1 day).

**Current constraint** (restated): nearly no registered providers on mainnet are active, so after signing, `accept_storage_contract` may never arrive. If that happens, 0.3 TON is held in the contract — fully recoverable via the `op::close_contract` route below.

---

## Fund recovery (`op::close_contract`)

If you signed a `--provider` flow on mainnet and the contract never activated, the bundled script recovers the funds:

```bash
node scripts/close-storage-contract.cjs <storage-contract-address>
```

**Mechanism** (from `storage-contract.fc`):
- When the contract has `is_active=false`, either the client (you) or the provider can send `op::close_contract (0x79f937ea)`. The full contract balance is then returned to the client (mode 128+32) and the contract self-destructs.
- Field-verified (Round 7 → close): 0.05 TON sent → `0.3281 TON` returned → contract `nonexist`. Net loss only 0.022 TON.

The script reuses your existing TonConnect session (`~/.ton-sovereign/tonconnect.json`), so no wallet pairing is required.

---

## Usage

```bash
# Deploy + auto-pick the cheapest provider + 1-day contract (default)
node dist/cli.js ./build/ --provider

# Deploy + a specific provider + 30-day contract
node dist/cli.js ./build/ --provider 0:ca5f6e597d3eab8a4e... --span 2592000

# 1-year contract
node dist/cli.js ./build/ --provider --span 31536000
```

`--span` accepts positive integers 1 – 4 294 967 295 (uint32 max, ≈ 136 years).

### Flow

1. **Deploy** — upload `./build/` to TON Storage.
2. **Pick provider** — fetch candidates from TONAPI, auto-select the cheapest.
3. **Build contract message** — invoke the daemon CLI's `new-contract-message` to extract `TorrentInfo` + `microchunk_hash`, then **regenerate a BOC for any span** on the TS side via `@ton/core`'s `beginCell()` (the self-built-BOC route).
4. **Show QR + URL** — render the TON Connect deep-link.
5. **Sign** — approve in Tonkeeper or another wallet.
6. **Confirm** — poll TONAPI until the contract is active.

---

## Testnet

**`--provider` does not work on testnet** (mutually exclusive with `--testnet`).

The testnet provider list has 171 entries registered, but no real ADNL nodes exist behind them and there's zero overlap with mainnet. The entries are test fixtures, not functional, so we early-exit with an explicit error.

```bash
# Errors out by design
node dist/cli.js ./build/ --testnet --provider
# ⚠ --provider is not supported on testnet.
```

---

## Known limitations / bugs (daemon v2026.02-1)

### `--max-span` uint8 bug — worked around in v0.5

`storage-daemon-cli`'s `new-contract-message --rate --max-span` mode **only accepts 0–255** for `--max-span` (the on-chain storage-provider contract takes `expected_max_span:uint32`, but the CLI parser narrows it to `uint8`).

- Location: `storage/storage-daemon/storage-daemon-cli.cpp:681` (affects v2026.02-1 through v2026.04-1).
- Surrounding code uses `uint32` — clearly a copy-paste error.

**v0.5 workaround — self-built BOC route**

To avoid blocking on upstream, we assemble the BOC in TypeScript. Details: `docs/v0.5/lane-b-self-generated-boc.md`.

1. Invoke the daemon CLI with `--max-span 200` (within its accepted range) to produce a draft BOC.
2. Parse that BOC with `Cell.fromBoc` and extract `TorrentInfo` (ref Cell) + `microchunk_hash` (256-bit).
3. Use `buildOfferStorageContractMessage` (in `src/provider.ts`) to regenerate a BOC with the user's actual `span` value.
4. Serialize via `Cell.toBoc({ idx: false, crc32: false })` to produce **byte-identical output** to the daemon's `vm::std_boc_serialize`.

`test/provider-parity.integration.test.ts` (live with `RUN_DAEMON_TESTS=1`) proves byte-equality and accepts arbitrary span values against a real daemon.

### `--provider <addr>` P2P timeout

`new-contract-message --provider <addr>` is a mode that opens a P2P ADNL connection to the provider to fetch its rate. Connections frequently fail to establish even on mainnet.

```
# Avoid this form (it times out)
new-contract-message <bagId> <outFile> --provider <addr>

# Use this form instead (manual rate + span)
new-contract-message <bagId> <outFile> --rate <rate> --max-span 200
```

### Flag exclusivity

`--provider <addr>` and `--rate --max-span` are **mutually exclusive**. Combining them yields an `Incompatible flags` error.

---

## Implementation details

### `src/provider.ts`

```
fetchProviders(testnet)  →  TONAPI /v2/storage/providers  →  Provider[]
  filter: accept_new_contracts && rate_per_mb_day > 10 && max_span >= 3600
  (rate > 10 excludes dummy entries with rate=0/1)

selectCheapestProvider(providers)  →  providers[0]   (sorted ascending by ratePerMbDay)

getBagSizeBytes(bagId, daemon)  →  storage-daemon-cli get <bagId> --json

buildOfferStorageContractMessage({ queryId, torrentInfo, microchunkHash,
                                   expectedRateNanoPerMbDay,
                                   expectedMaxSpanSeconds })
  →  Cell  // op=0x107c49ef, ref=TorrentInfo, span free uint32

generateContractMessage(bagId, sizeBytes, provider, daemon, spanSeconds=86400)
  1. Invoke daemon CLI's new-contract-message (discard its bugged span)
  2. Parse the BOC; extract TorrentInfo + microchunk_hash
  3. Regenerate the BOC with arbitrary span via buildOfferStorageContractMessage
  4. Recompute amountNano against the new span
  →  ContractMessage { bocBase64, amountNano, providerAddress, spanDays, rateTonPerGbYear }
```

### Amount calculation

```
sizeMb = max(sizeBytes / 1_000_000, 0.1)   ← minimum 0.1 MB
spanDays = spanSeconds / 86400              ← user-specified (default 1 day)
storageCostNano = ceil(sizeMb * ratePerMbDay * spanDays)
amountNano = storageCostNano + 300_000_000  ← 0.3 TON buffer (contract deployment cost)
```

For multi-KB bags, `storageCostNano` is negligible even with long spans — essentially **only the 0.3 TON buffer** is paid. For large bags or year-scale spans, `storageCostNano` dominates and should be estimated up front.

### `src/cli/provider.ts`

```
runProviderContract(opts)
  1. Testnet check → early exit
  2. fetchProviders + select / find provider
  3. getBagSizeBytes
  4. generateContractMessage
  5. buildTonConnectDeeplink(provider.address, bagId, { amountNano, payloadBase64: bocBase64 })
  6. displayTonConnectQr(deeplink, ...)
  7. Print the URL directly (for environments without QR rendering)
  8. pollProviderContract (TONAPI /v2/storage/bag/{id}) — poll 5 minutes
```

---

## Manual local test procedure

```bash
# 1. Build
npm run build

# 2. Create a test site
mkdir -p /tmp/ton-test-site
echo '<h1>Hello TON</h1>' > /tmp/ton-test-site/index.html

# 3. Mainnet deploy + provider contract (1-day)
node dist/cli.js /tmp/ton-test-site --provider --span 86400
```

The run prints, in order:

```
📦 Storage Provider Contract

✔ Selected provider: 0:ca5f6e597d3eab8a4e... (20 nanoTON/MB/day)
✔ Bag size: 0.00 MB
✔ Contract: 86400s (1.0000 days) @ 0.01 TON/GB/year

💸 Storage Payment — Sign to Contract
  Amount: 0.3000 TON
  Duration: 86400 seconds (~1.0000 days)

  → 0:ca5f6e597d3eab8a4e...

  Scan with your TON wallet:
  [QR code]

  TON Connect URL (open on mobile or paste in Tonkeeper):

  tc://?v=2&id=...&r=...

  Waiting for you to sign the transaction...
  (Press Ctrl+C to skip provider contract)
```

4. **Sign in Tonkeeper**
   - Scan the QR or open the `tc://` URL in a browser.
   - Verify amount + recipient, then sign.

5. **Confirmation**
   - 1–3 minutes after signing, the contract activates.
   - The CLI detects it and exits.

---

## Inspecting the provider list

You can query current providers via TONAPI:

```bash
curl https://tonapi.io/v2/storage/providers | jq '.providers[] | {address, rate_per_mb_day, max_span}'
```

---

## Future improvements

- ✅ ~~Make the contract span configurable once the daemon `--max-span` bug is fixed upstream~~ → resolved in v0.5 via the self-built-BOC route (`--span <seconds>` accepts arbitrary uint32 seconds).
- Stabilize provider P2P connections (`--provider <addr>` mode).
- Option to contract with multiple providers in parallel.
- Mainnet soak test (`--span 86400` 1-day contract end-to-end signed + verified).
- Port the `microchunk_hash` derivation to TS (full daemon-CLI independence).
