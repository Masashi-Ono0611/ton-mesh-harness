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

#### B3 prep findings (2026-05-10)

Surveyed `ton-blockchain/adnl-tunnel` (server side) and
`xssnick/tonutils-storage`'s tunnel hookup (client side). The picture
is much simpler than the original v0.6 draft assumed:

- `adnl-tunnel` ships **server binaries** (`tunnel-node-*`) for
  intermediate-node operators. **We don't need to spawn or bundle
  these** — they run on third-party / community machines that rent
  out address+port. Releases at v0.1.8 (2025-10-02) cover all our
  target OSes.
- `adnl-tunnel` also ships `libtunnel.a` + `libtunnel.h` for
  embedding the client in C/C++ code. Not relevant to us — Go
  consumers use the Go package directly.
- `tonutils-storage` already imports
  `github.com/ton-blockchain/adnl-tunnel/config` and **carries a
  `TunnelConfig: *tunnelConfig.ClientConfig` field on its own
  `config.json`**. `GenerateClientConfig()` populates a default
  with all the ed25519 keys needed; the user just supplies a nodes-
  pool path.

So the integration we ship reduces to:

1. Accept `--tunnel-config <nodes-pool.json>` on our CLI (and a few
   convenience flags below).
2. In `ensureTonutilsConfig` (already exists), set
   `cfg.TunnelConfig.NodesPoolConfigPath` to the absolute path the
   user passed.
3. Optional later: `--enable-payments` flag toggling
   `cfg.TunnelConfig.PaymentsEnabled` and sufficient payment fields
   (groundwork for B4).
4. Document where to obtain a `nodes-pool.json` in the README.

ClientConfig shape (from `adnl-tunnel/config/config.go`):

```go
type ClientConfig struct {
    TunnelServerKey     []byte
    TunnelThreads       uint
    TunnelSectionsNum   uint
    NodesPoolConfigPath string  // ← what the user supplies
    PaymentsEnabled     bool
    Payments            PaymentsClientConfig
}

type SharedConfig struct {
    NodesPool []TunnelRouteSection  // list of intermediate-node ADNL keys
}
```

#### B3 work breakdown (revised)

1. `--tunnel-config <path>` flag in `src/cli.ts` (+ `CliOptions`).
2. Extend `ensureTonutilsConfig` to write `TunnelConfig.NodesPoolConfigPath`
   when the flag is present. Resolve to absolute path.
3. Print "  Tunnelling via X intermediate node(s)" on startup so
   users can see the tunnel is live.
4. Detect missing/unreadable nodes-pool file before spawning the
   daemon; surface a clear error.
5. README + dashboard: document where to source a nodes-pool config
   (TON Telegram channels for now; community-run pool list TBD).

Estimated work: **half a day to a day** (much smaller than the
original v0.6 estimate). The expensive part is *not* the code — it's
the operational question of where users get a working pool.

#### B3 reality check (deferring **end-to-end** ship)

Tonutils-storage and TON-Torrent both treat the nodes-pool file as
"obtained from your tunnel provider" — there is **no public,
auto-discoverable pool we can default to today**. Shipping the flag
without a working pool to recommend repeats the lesson of v0.5 Lane
B (provider economy was empty; pretending otherwise hurt users).

Plan therefore:

- Land the **CLI surface + config wiring** (steps 1–4 above) in v0.6
  so the path is wired and tested with a fake `nodes-pool.json`.
- Hold off on documenting "use this pool" until we either find a
  public community pool or run our own intermediate node. Without
  that, the README block under step 5 should explicitly say "bring
  your own nodes-pool.json from a tunnel operator you trust".
- Operating our own intermediate node is its own decision (probably
  v0.7+ once we want a SaaS leg).

Marketing line we **can** honestly write at this stage:

> "Deploy a static site from your laptop. If you have access to an
> ADNL Tunnel pool config, point the CLI at it with
> `--tunnel-config` and your seeding works behind NAT too."

Estimated remaining: ~1 day for steps 1–4 once we decide to ship
them. Tracking as **B3.x** (cli surface) and **B3.y** (default pool /
SaaS decision) in the next session.

### B4 — Payment Network abstraction (groundwork shipped) ✅

`src/payments/index.ts` defines the `PaymentNetworkClient` interface
and exports `noopPaymentClient` for v0.6. `describePayments()` returns
`null`, so callers omit the `TunnelConfig.Payments` section entirely.
`status()` returns a single-line `payments: disabled (v0.7)` for CLI
output.

When v0.7 lands a real `ton-payment-network` node, drop in a
`TonPaymentClient` that implements the same interface — no refactor
of the daemon spawn / connect path needed.

Test coverage: `test/payments.test.ts` (3 trivial tests pinning the
v0.6 contract).

### B5 — `dns_adnl_address` (sites record) write path ✅ (shipped 2026-05-10)

After the on-chain probe revealed piracy.ton, tonnet-sync-check.ton
and most Telegram-visible .ton sites use `dns_adnl_address` records
(`docs/v0.6/sites-record-discovery.md`), B5 was added to v0.6 scope
to align the CLI with the mainstream hosting pattern.

**v0.6 scope (this milestone):**

- New flag: `--site-adnl <hex>` accepts a 64-hex ADNL identity (the
  one printed by your `rldp-http-proxy` instance). Validated up
  front; canonicalised to lowercase, no `0x` prefix.
- New cell builders in `src/dns.ts`:
  - `buildDnsAdnlRecord(adnlHex, flags=0)` — magic `0xad01` +
    256-bit ADNL hash + 8-bit flags (TEP-0081).
  - `buildChangeDnsSiteRecordBody(adnlHex)` — wraps it under
    `op::change_dns_record (0x4eb1f0f9)` keyed by SHA256("site").
- New `TonConnectProvider.sendTransactionMulti(messages[])` bundles
  up to 4 messages per TonConnect tx (Tonkeeper spec). When
  `--site-adnl` is set together with `--domain`, the storage record
  and the site record ship in **one** signed tx — user signs once,
  pays `2 × 0.05 TON = 0.10 TON` gas.
- New TONAPI poller `pollDnsSiteRecord` watches `data.sites[]` for
  the expected ADNL. TONAPI is known to lag/lie for site records, so
  the poller fails open with a "verify in TON Browser" hint instead
  of looping forever.
- Behaviour preserved: `--domain` without `--site-adnl` still writes
  only the storage record (existing v0.5 path, unchanged).

**v0.6 explicitly out of scope (deferred to v0.7):**

- Auto-spawning `rldp-http-proxy` locally + minting an ADNL identity
  (would require either bundling `generate-random-id` from a 96 MB
  ton zip or implementing the on-disk Ed25519 keyring format
  ourselves).
- NAT-traversal for the proxy's UDP listener — needs B3.x tunnel
  follow-up + the future `adnl-tunnel-client` server-side variant.
- A "self-host on a laptop" UX. v0.6 is **bring-your-own
  rldp-http-proxy** (typically a VPS); v0.7 will close the loop.

**Tests:** 13 new cell-builder tests in `test/dns.test.ts` (104 unit
total now, all passing).

## Out of scope for v0.6 (deferred / dropped)

- ⚠ **Auto-spawning `rldp-http-proxy`** — moved to v0.7 alongside
  ADNL tunnel server-side bringup (B5 ships the write path only).
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
