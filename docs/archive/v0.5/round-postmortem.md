# v0.5 Lane B — Round 1–7 mainnet soak post-mortem

**Date:** 2026-05-10
**Status:** code path validated end-to-end, but ecosystem assumption proven wrong

## What we set out to prove

Lane B Step 6: a `--provider --span 86400` deploy on mainnet results in a
**24-hour active storage contract** — the headline promise of v0.5.

## What actually happened

Seven rounds of mainnet sign attempts, summarised:

| Round | Bag | Result | Cost |
|---|---|---|---|
| 1   | 76 B | CLI poll timed out (5 min); deeplink expired before user signed | 0 TON |
| 2   | 76 B | Same flow, fresh deeplink — user did not sign in time | 0 TON |
| 3   | 76 B | Telegram Wallet auto-picked (not Tonkeeper); aborted | 0 TON |
| 4   | 76 B | Tonkeeper signed; provider compute_exit=1004 (file_too_small); bounce | **−0.000252 TON** (gas only) |
| 5   | 1685 B | Aborted in Tonkeeper UI (10.3 TON request — scam provider auto-picked) | 0 TON |
| 6   | 1685 B | `getBagSizeBytes` returned 0 due to JSON shape mismatch; fail-fast triggered | 0 TON |
| 7   | 1685 B | Tonkeeper signed; provider deployed contract (compute_exit=0); **provider never `accept_storage_contract`-ed** within 10 min | locked in contract |
| 7-close | — | `op::close_contract` → contract self-destructed → 0.3281 TON returned | **−0.022 TON** (deploy gas only) |

**Total mainnet spend: ~0.022 TON (≈ ¥4) for end-to-end validation.**

## What works (proven on mainnet)

- TonConnect SDK session, restoration, and tx delivery to Tonkeeper.
- Self-generated `op::offer_storage_contract` (op 0x107c49ef) BOC reaching the
  provider master with the correct TL-B layout.
- `expected_max_span` survives the daemon CLI's uint8 cap because we no longer
  go through `new-contract-message` for the final BOC. We sent
  `--span 86400` and the on-chain contract ingested it as uint32.
- `op::close_contract` recovery path for stuck funds — verified on the live
  contract `0:0dee7827b0c57732b307f3240ca18f5f2cb19354fc88427ac09beb18aac10864`.
- Defence-in-depth guards (rate cap, file-size guard, 1-TON sign cap) all
  fired correctly and prevented at least one ~10 TON wallet popup.

## What doesn't work — the real finding

**The TON Storage Provider economy is empty on mainnet.** Concrete evidence:

1. **All five cheapest "active" providers are dead.** Looked at the last 50
   transactions for each — none of them have ever sent `accept_storage_contract`
   (op 0x7a361688) or `proof_storage` (op 0x419d5d4d):
   - `0:ca5f6e597d3eab8a4e…` rate=20: 9 tx in 230 days, our 2 offers were the
     only "real" inbound. No accepts, no proofs, no withdrawals.
   - `0:805c91c9c64c9f05…` rate=50: last tx **2024-08-10** (≈ 1.5 years dormant).
   - `0:ad0847107ae94fbe…` rate=60: 17 tx in ~3 years, no accepts/proofs.
   - `0:152e55f99bb19893…` rate=100: last tx **2023-09-24**.
   - `0:8ff83b9bcfa4a516…` rate=100: last tx **2024-02-20**.

2. **TONAPI's `accept_new_contracts: true` is not a liveness signal.**
   It only reflects an `update_storage_params` call by the provider master,
   not whether the provider's ADNL/fetch backend is actually running.

3. **Even `foundation.ton` doesn't use provider hosting.** It declares a
   `storage` DNS record (bag `7fea7af2…`), but TONAPI returns 404 for that
   bag's provider list — meaning the TON Foundation itself self-hosts via a
   private daemon rather than relying on the provider economy.

4. **Most user-facing TON sites use `sites` records, not `storage`.**
   `tonnet-sync-check.ton`, `boards.ton`, `piracy.ton` all resolve to either
   ADNL Address records (`sites`) or just `wallet` records, not the
   bag-based `storage` record path our `--domain` flag targets.

## Implication for the product

Our v0.4 README + dashboard pitch — *"sign with `--provider` and your site is
hosted 24/7"* — **cannot be fulfilled on mainnet today**. There is no
provider that will actually accept a contract.

This is not a bug in our code: every layer we control works. It is an
ecosystem-level problem. The fix is one of:

- **A. Lead with self-host (`--watch`)** as the canonical mode, position
  `--provider` as "opt-in, provider must be live." Update README and
  dashboard accordingly.
- **B. Operate our own provider** (rented VPS, daemon kept alive) and have
  the CLI default to it. Becomes a SaaS layer.
- **C. Add `sites` (ADNL Address) record support** alongside `storage`,
  matching what real TON sites already use. Likely more useful than the
  storage-bag path right now.
- **D. Bridge to IPFS pinning + `.ton` DNS pointing at an IPFS gateway.**
  Drops TON-storage-purity but works today.

These are not exclusive — A is mandatory regardless; C is the most aligned
with where the ecosystem already is; B and D are business decisions.

## Cost summary

```
Round 7 sign:                         −0.3000 TON  (at user wallet)
Round 7 deploy gas:                   −0.0215 TON  (consumed by provider master)
Locked in storage contract:           +0.2785 TON  (recovered next step)
close_contract sign:                  −0.0500 TON  (gas reserve)
close_contract self-destruct return:  +0.3281 TON  (entire balance + carry)
                                      ─────────────
Net all-rounds spend:                  0.022 TON   (≈ ¥4)
```

Other rounds (4) cost an additional 0.000252 TON gas. Practical total ≈ 0.022 TON.

## Recovery path proven

If a future user runs `--provider`, signs, and the provider fails to accept
the contract within a reasonable window, `scripts/close-storage-contract.cjs`
recovers their funds via `op::close_contract`. The on-chain contract refunds
the entire stash (carry + self-destruct) to the original client. We
confirmed this with our own funds.

## Files of record

- `scripts/close-storage-contract.cjs` — one-shot recovery script (committed
  with this post-mortem so a future user hitting the same dead-provider trap
  can recover).
- `docs/v0.5/lane-b-self-generated-boc.md` — the route around the daemon's
  `--max-span` uint8 bug, validated.
- `test/provider-parity.integration.test.ts` — byte-equal proof that our
  self-generated BOC matches the daemon's CLI output.

## Decision deferred

The product direction (A/B/C/D above) is deferred to a separate research
session that will take a wider look at the TON Storage / TON Sites ecosystem,
including provider liveness rates beyond just the cheapest 5, what TON
Foundation's docs say vs what's actually deployed, and how IPFS bridging
could integrate with `.ton` DNS.

See `docs/v0.5/next-research-plan.md` (forthcoming) for the research outline.

## Update: 2026-05-10 v0.7 dormancy re-probe

Re-ran the same probe under v0.7 (`scripts/probe-providers.cjs`,
top-8 cheapest, 30-day window). Same verdict: **all 8 providers
zero `accept_storage_contract` ops** in the window. Provider economy
still dormant ~2 months after the v0.5 round; v0.7 keeps `--provider`
disabled. Raw data: `docs/v0.7/provider-probe-2026-05-10.md`.
