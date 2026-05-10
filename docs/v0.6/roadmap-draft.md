# v0.6 roadmap — confirmed direction (2026-05-10)

**Status:** direction locked after Round 1–7 mainnet soak + ecosystem
research (`storage` records dominate, `sites` records virtually unused).
We're aligning with the TON Core 2025-03 official direction (Proxy +
ADNL Tunnel + Payment Network) and the Resistance Tools stack
(`tonutils-storage`, `TON-Torrent`, `ton-payment-network`, all xssnick-
authored, recently grant-funded by Pavel Durov).

## Why this revision

The first roadmap draft listed `sites` (ADNL Address) record support as
a high-value addition. Field-checking revealed:

- `foundation.ton` resolves to `sites: []` (empty) and a populated
  `storage` record. The Foundation itself does not use `sites`.
- All sampled "famous" `.ton` domains (piracy.ton, manifesto.ton,
  boards.ton, getgems.ton, scaleton.ton, etc.) return either `sites: []`
  or no records at all on TONAPI — they are resolved through
  Telegram/TON Browser internal paths, not through the publicly-readable
  `.ton` DNS records.
- `sites` records require an HTTP-over-ADNL server (`rldp-http-proxy`)
  the daemon does not provide, so writing the record without serving it
  produces dead URLs.
- Conclusion: the **storage-record path we already implement is the
  current mainstream**. No work needed there in v0.6.

The actual mainstream gap is the **NAT-traversal layer**, which the
ecosystem solves with ADNL Tunnel rentals paid through the Payment
Network. That's where v0.6 should go.

## Scope of v0.6 (in priority order)

### B1 — `--watch` becomes the default ✅ (shipped 2026-05-10, `a5d08f2`)

`--watch` was an opt-in flag. Since the ecosystem reality is "self-host
is the canonical mode", v0.6 makes `--watch` the default behaviour.
Users get `--no-watch` to opt out for CI / one-shot deploys. Multi-model
self-review then caught that `--json-output` and `--ci-mode` should not
inherit the default — those modes auto-apply `--no-watch` to avoid CI
job hangs (fixed in `c815cf5`).

What changed:
- `src/cli.ts`: `--watch` now defaults on; `--no-watch` is the explicit opt-out
- README + dashboard updated to describe the new default and v0.6 plan
- `provider-contract.md` already labels `--provider` as experimental (Step A)

### B2 — Switch the bundled daemon to `tonutils-storage` (xssnick / Go)

Today we install `storage-daemon` (TON Core, C++, v2026.02-1).
`tonutils-storage` is the alt implementation from xssnick (recipient
of Pavel Durov's 10K TON personal grant) and is **the daemon
TON-Torrent and the Resistance Tools stack already run**. It:

- has a Go binary (smaller than the 18 MB C++ build),
- ships an HTTP API (`--api ip:port`) which is far cleaner to integrate
  with than the C++ daemon's ADNL CLI,
- has built-in tunnel support (paves the way to B3),
- is actively maintained (v1.4.1 / 2026-04-06).

#### B2 prep findings (2026-05-10)

Surveyed the tonutils-storage HTTP API and source. What we get:

| Capability | tonutils endpoint | Status |
|---|---|---|
| Create bag from a directory | `POST /api/v1/create { path, description }` → `{ bag_id }` | ✅ direct fit |
| List bags | `GET /api/v1/list` | ✅ |
| Bag size + completeness | `GET /api/v1/details?bag_id=…` → `size`, `bag_size`, `completed` | ✅ |
| Bag root hash | `GET /api/v1/details` → `merkle_hash` (= `TorrentInfo.RootHash`) | ✅ |
| Bag seeding | daemon stays alive while running | ✅ |
| **`microchunk_hash` for `op::offer_storage_contract`** | **not exposed** | ❌ |

The `merkle_hash` field is `TorrentInfo.RootHash`, not the
`microchunk_hash` the TON Core provider master expects. xssnick's
ecosystem uses a **different provider protocol**
(`tonutils-storage-provider`, repo `xssnick/tonutils-storage-provider`)
with its own opcodes and contract layout — not interoperable with the
TON Core `op::offer_storage_contract` (0x107c49ef) we built in v0.5.

#### B2 design decision

Disable `--provider` in v0.6 while we migrate. Concretely:

- v0.6 default backend = `tonutils-storage` (xssnick / Go)
- v0.6 fallback `--daemon-backend=ton-core` keeps the TON Core C++
  daemon for users who explicitly want it
- v0.6 `--provider` returns a clear error message pointing to
  `docs/v0.5/round-postmortem.md` regardless of backend (the mainnet
  provider economy is dormant for both protocols anyway, so disabling
  it costs the user nothing real)
- v0.7 will reintroduce provider support against whichever provider
  protocol turns out to actually have liveness (xssnick's or TON Core's)

This avoids the trap of trying to maintain two non-interoperable
provider integrations during a migration. The DNS path (`--domain`,
`buildChangeDnsRecordBody`, TonConnect signing) is unchanged — it
sits above the daemon and doesn't care which backend is in use.

#### B2 work breakdown

1. **Daemon installer** ✅ — download tonutils-storage v1.4.1 per OS/arch
2. **Daemon process** ✅ — spawn + waitForApi (with AbortController per
   probe; spawn errors captured to shared state). Adds an extra
   pre-stage step: tonutils-storage panics if UDP 17555 is taken
   (e.g. TON Browser.app), so we run a short-lived spawn to let the
   daemon write `config.json`, then patch `ListenAddr` to a free UDP
   port, then spawn the real one.
3. **HTTP client** ✅ — `tonutilsCreate / Details / List / Remove`
4. **Refactor `cli/deploy.ts`** ✅ — split into `deploy.ts` (ton-core)
   and `deploy-tonutils.ts` (new default), dispatched from `cli.ts`
5. **`--daemon-backend` flag** ✅
6. **Disable `--provider` in v0.6** ✅ — early throw with pointer to
   post-mortem and roadmap; ton-core path is preserved so v0.7 can
   re-enable provider against whichever protocol has liveness
7. **Tests** ✅ unit (96 green) + ✅ daemon parity (4 green) + ⏳ tonutils
   integration test under RUN_DAEMON_TESTS=1 (deferred — manual
   smoke proved bag id matches ton-core's byte-for-byte for the same
   content)

**Status: shipped 2026-05-10 (`d9072a2`), self-review fixes in `c815cf5`.**

Outstanding follow-ups before B3:
- Auto-redeploy on file change for the tonutils backend (the daemon
  is alive in `--watch`; we just need a chokidar loop calling
  `tonutilsCreate` on changes). Current behaviour is "seed the
  initial bag and hold". Tracking this as **B2.x**.
- A tonutils integration test mirroring `provider-parity.integration.test.ts`
  (boots tonutils, creates a bag, asserts on `/api/v1/details`).

### B3 — ADNL Tunnel client integration

Once B2 puts a tunnel-capable daemon in place, this is mostly
configuration. Add `--tunnel-config <path>` (the same JSON shape
TON-Torrent accepts — a list of intermediate-node URLs with their
ADNL public keys) and pipe it into the daemon at startup.

Marketing line we want to be able to honestly write:

> "Deploy a static site from your laptop. Even if you're behind NAT,
> the ADNL Tunnel route keeps your bag reachable while the daemon runs."

Estimated work: 1–2 weeks. Most of the cost is curating a default
tunnel pool config to bundle (so users don't have to find one
themselves) and surfacing tunnel status in the CLI.

### B4 — Payment Network abstraction (groundwork only in v0.6)

Tunnel rentals settle through PN micro-payments. We won't ship a PN
integration in v0.6 — that's v0.7 — but we can keep the daemon
abstraction layer payment-aware so v0.7 doesn't require a refactor.

Concretely: thread a "payment plumbing" hook through the daemon
spawn / connect path now, return null/no-op in v0.6, and wire the
real `ton-payment-network` client into it in v0.7.

## Out of scope for v0.6 (deferred / dropped)

- ❌ **`sites` record support** — empirical evidence says it's not in use
  (foundation.ton, all sampled .ton domains)
- ❌ **`rldp-http-proxy` bundling** — not needed without sites support
- ❌ **Building or operating a storage provider ourselves** — economics
  are wrong while no one else is doing it
- ❌ **Full Payment Network integration** — pushed to v0.7

## Decision criteria (recap)

- B1 ships in this commit. If even our own smoke shows surprises (e.g.
  CI users expected one-shot-by-default), revert is one config flip.
- B2 ships only after we've confirmed `tonutils-storage` exposes the
  meta endpoints we need (`get`, `get-meta` equivalents). If it doesn't,
  B2 stays speculative and we revisit.
- B3 sequencing depends on B2; do not start until tonutils backend is
  stable.
- B4 is design-only, not user-facing.

## Open questions (still)

- For B2, do we double-bundle (offer both daemons via `--daemon-backend=`)
  or hard-cut? Default direction: double-bundle in v0.6, hard-cut to
  tonutils in v0.7.
- For B3, do we ship our own tunnel pool config or just teach users to
  paste one? Default direction: bundle a curated minimal config (1–2
  community-run intermediate nodes) and document how to swap.
- For docs: do we keep the dashboard's "Resistance Tools stack" framing
  as the headline, or push it as a sub-headline? Going with sub-headline
  for now since the primary user is still the DeFi-UI builder.
