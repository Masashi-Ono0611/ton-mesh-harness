# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [0.8.0-rc1] – 2026-05-10

First-useful flag-plant for the **agent-surface track**. v0.8.0-rc1 ships
no MCP server yet — the GA tag (week 6) introduces `ton-sovereign-mcp`.
This rc tag plants discoverability artifacts and the rescoped design docs
that encode the [P-1 probe](docs/v0.8/at-mcp-probe.md) verdict, so an agent
that later searches for `"deploy a static site to .ton"` can already find
the kit (via the existing CLI). The acceptance hypothesis behind that
discovery claim is verified by the [V4 red-team test](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/26)
(rc1 run = CLI path).

### Added

- **README "Agent quickstart"** section pointing at the existing
  `npx -y ton-sovereign-deploy` CLI flow, with explicit guidance for
  agent runtimes (Claude Code / Cursor / etc.) and a discoverability
  caveat. The GA section sketches the future MCP server config using the
  correct dual-bin invocation: `npx -y --package ton-sovereign-deploy ton-sovereign-mcp`.
- **npm keywords** (`mcp`, `mcp-server`, `agent-skill`, `claude-skill`,
  `ton-storage`, `ton-dns`, `dot-ton`, `adnl`, `static-site`, `website`,
  `decentralized-web`, `tonconnect`, `agentic-wallet`) added to
  `package.json` so agent / npm searches surface the kit for static-site
  + .ton + agent-callable queries.
- **package description rewritten** to lead with the deploy-static-site-to-.ton
  capability and to flag the rc1 / GA scope honestly (no MCP server yet
  at rc1; planned for GA).
- **Concept update doc** at `docs/v0.8/concept-update-2026-05-10.md`
  capturing the dual-track (v0.8 agent surface / v0.9 C2 NAT + C3 Payments)
  framing, premises P1–P5' (Codex-refined), OQ#0–#7 resolutions, the
  agency-transfer red-team test definition, and the canonical compose
  model after the P-1 verdict.
- **P-1 probe memo** at `docs/v0.8/at-mcp-probe.md`. Verdict: B (with
  nuance). The original `@ton/mcp::wallet_connect` handoff doesn't exist
  — `@ton/mcp` is agentic-wallet-first (keys at `~/.config/ton/config.json`,
  no TonConnect tool). The workable composition is **filesystem-level**:
  `ton-sovereign-mcp` will read the same config file via `@ton/walletkit`,
  the lib `@ton/mcp` itself uses. `@ton/mcp` is NOT a runtime dep — it's
  a peer MCP server an agent may load alongside `ton-sovereign-mcp`.

### Changed

- **`docs/v0.8/agent-native-pivot.md` rewritten** ("v0.9 plan — agent-native
  pivot" → "v0.8 plan — agent-surface track parallel to self-host UX
  track"). Removes the `mcp.ton.org`-as-third-party-registry claim
  (it's a curated landing page for the official `@ton/mcp`, not a
  registry — verified during P-1 Phase 2.75 landscape audit). Q1
  (signing) marked DECIDED via the dual-path `WalletSpec`. P3 split
  into P3a (signing, GA) and P3b (daemon lifecycle, deferred to 0.8.x).
  P4 (discoverability) promoted from "deferred to 0.9.x" → "in v0.8.0",
  with rc1/GA artifact split spelled out.
- **`docs/v0.8/mcp-core-requirements.md` rescoped.** F2 `wallet` field
  becomes a discriminated union (`WalletSpec`: `{kind: "tonconnect"}`
  for human-signed | `{kind: "agentic"}` for autonomous). F4 cancellation
  rewritten with phase-dependent semantics — daemon always killed, but
  DNS publication is best-effort post-`awaiting_signature` (the wallet
  may sign + broadcast even after cancellation in Path 1). New §NF6
  documents the filesystem-level `@ton/walletkit` compose. Acceptance
  criteria split into rc1 (week 1) and GA (week 6) tiers.
- Directory rename: **`docs/v0.9/` → `docs/v0.8/`.** The agent-surface
  track now occupies the v0.8 slot; the v0.7-deferred C2 NAT + C3 Payments
  move to a v0.9 reserve slot. CHANGELOG `[0.7.0]` "Out of scope" updated
  from "deferred to v0.8" → "deferred to v0.9" with explanatory note.
  `src/cli.ts` C1 comment updated. README "v0.9 構想" section
  rewritten to "v0.8 構想 (agent-surface track)" with a separate
  "v0.9 reserve" pointer.

### Out of scope (deferred to v0.8.0 GA — week 6)

- The MCP server itself (`src/mcp.ts`, dual `bin` entry).
- SDK extraction (`src/sdk/`).
- In-repo skill markdown at `skills/sovereign-deploy.md`.
- `templates/.well-known/mcp.json` template.
- PR to `ton-org/skills`.
- The MCP-path run of the [V4] red-team test.

### Out of scope (deferred to v0.8.x or later)

- `mcp.ton.org` registry submission — no submission flow exists today.
- `sovereign_status`, `sovereign_redeploy`, `sovereign_stop` MCP tools —
  validate the two-tool contract first.
- Daemon detached / launchd / systemd / remote — orthogonal to the
  agent-surface track.
- Agentic Wallet integration via MCP-RPC handoff with `@ton/mcp` —
  doesn't exist at the protocol level (P-1 verdict). The agentic flow
  is filesystem-level, not RPC.
- `.well-known/ton-deploy.json` provenance manifest (Codex C axis from
  the concept update) — noted as candidate, no commitment.

### Internal

- 121 unit tests (carry-over from v0.7.0; no new test additions in
  rc1 — the rc1 ship is doc + metadata only). v0.7.0 CLI behaviour is
  unchanged; `--site-auto` continues to work.

## [0.7.0] – 2026-05-10

v0.7 closes the v0.6 BYO gap: `--site-auto` now spins up
`rldp-http-proxy` from one CLI command and the .ton domain serves
your build directory end-to-end without manual VPS setup.

### Added

- **`--site-auto`** flag (mutually exclusive with `--site-adnl`).
  Mints a fresh Ed25519 ADNL identity in pure JS, downloads
  `rldp-http-proxy` from `ton-blockchain/ton@v2026.04-1`, spawns it
  with the minted identity, runs a tiny Node http server rooted at
  the build directory, and feeds the resulting hex into the
  existing `dns_adnl_address` write path. Storage + site DNS
  records still bundle into a single TonConnect signature.
- **`--site-public-ip <ip>`** override for the IPv4 published in the
  ADNL DHT entry. Default: `api.ipify.org` probe.
- **`--site-udp-port <port>`** override for the proxy's UDP listener
  (default: free port in `17600-17699`).
- **`src/daemon/keyring.ts`** new module: `generateAdnlIdentity` +
  `writeKeyringFile` + `adnlIdEncode` / `adnlIdDecode` (TON's
  base32+CRC16 user-friendly form, the value `-A` actually expects).
  Constants captured from a `generate-random-id` v2026.04-1 spike
  and pinned in `docs/v0.7/c1-design-notes.md`.
- **`src/daemon/rldp-http-proxy-installer.ts`** + **`-process.ts`**
  mirror the tonutils-storage installer / spawn pattern.
- **`scripts/probe-providers.cjs`** (C4): re-ran the storage-provider
  liveness probe under v0.7. Verdict: still **dormant** (top-8
  cheapest, zero `accept_storage_contract` ops in 30d). `--provider`
  stays disabled. Snapshot: `docs/v0.7/provider-probe-2026-05-10.md`.
- **doctor extension** (C5.1): surfaces the rldp-http-proxy binary
  + the persisted site ADNL hex from `~/.ton-sovereign/site-adnl.txt`.

### Internal

- 121 unit tests (was 106; +15 keyring including base32+CRC16
  fixture round-trips against `generate-random-id` output).
- New `test/daemon/rldp-http-proxy-process.integration.test.ts`
  gated behind `RUN_DAEMON_TESTS=1` validates a live proxy spawn
  with the minted identity end-to-end.
- `findFreeUdpPort` now exported from `src/daemon/tonutils-process.ts`
  for reuse by the new proxy module.

### Out of scope (deferred to v0.9)

> **Renumbered 2026-05-10:** originally targeted v0.8. The v0.8 slot is now
> the agent-surface track (formerly drafted as v0.9; see
> `docs/v0.8/concept-update-2026-05-10.md`). C2 / C3 moved one slot down.

- **C2 NAT traversal via tunnel** — TON Foundation's `rldp-http-proxy`
  is C++ and doesn't import `adnl-tunnel`; xssnick's tunnel only
  handles outbound (which v0.6 already uses). Inbound HTTP-over-RLDP
  via tunnel needs us to write a Go drop-in — 1-2 weeks of new work.
- **C3 Payment Network real client** — its purpose was paying tunnel
  rentals; without C2 it has no real-world exercise.

The v0.6 `byo-rldp-http-proxy.md` guide stays in tree as a fallback
for users who prefer the C++ proxy or already have a VPS provisioned.

## [0.6.3] – 2026-05-10

### Fixed
- **`--no-watch` deploy now exits cleanly after the success message.**
  The @tonconnect/sdk bridge keeps an HTTP/SSE listener alive after
  `sendTransaction` resolves, which kept the Node event loop running
  even though the CLI's logical flow was done. New `dispose()` method
  on `TonConnectProvider` calls `connector.pauseConnection()` (does
  NOT unpair the on-disk session — `restoreConnection()` next run
  still works). `cli/dns.ts` and `cli/provider.ts` now wrap their
  wallet flow in try/finally and dispose at the end. Caught during
  the v0.6.2 Tier-3.1 e2e verification on `masashi-ono0611.ton`.

## [0.6.2] – 2026-05-10

Tier-3.1 mainnet soak on `masashi-ono0611.ton` produced two findings.

### Fixed
- **`pollDnsRecord` parser drift** (`src/dns.ts`): TONAPI
  `/v2/dns/{domain}/resolve` now returns `storage` as a hex string
  (e.g. `"a4df8074…"`), not the v0.2-era `{ bag_id: "…" }` shape the CLI
  expected. The poller therefore never matched and every successful
  deploy hit the 5-minute "DNS propagation timed out" warning even
  though the on-chain write had already settled. New `extractStorageBagId`
  helper accepts both shapes (current string + legacy object) so a future
  schema flip won't bite us again. Pure-function form makes it unit
  testable.

### Changed
- **DNS gas amount lowered from 0.05 TON to 0.02 TON per
  `change_dns_record` message** (`src/cli/dns.ts`). Live measurement on
  the v0.6.1 soak transaction showed `total_fees = 0.001536 TON`
  (compute 8419 gas + storage), so 0.02 TON keeps a >10× buffer while
  shrinking each call's "stuck in NFT balance" excess from ~0.048 TON
  to ~0.018 TON. Matches the default Tonkeeper uses in its own DNS UI.
  When `--site-adnl` bundles two messages, the wallet sees `0.04 TON`
  instead of `0.10 TON`.

## [0.6.1] – 2026-05-10

### Fixed
- npm `bin` map: dropped the leading `./` from `bin[ton-sovereign-deploy]`
  so npm doesn't strip the entry on publish (auto-correction noticed
  during a v0.6.0 publish dry-run). v0.6.0 was tagged on git only and
  never published to npm; v0.6.1 is the first npm release.

## [0.6.0] – 2026-05-10

v0.6 reframes the project around the **TON digital-resistance stack**
([TON Core 2025-03 announcement](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08),
[xssnick's Resistance Tools](https://github.com/xssnick/TON-Torrent)).
Self-host (`--watch`) is now the canonical mode; the bundled daemon is
swapped to xssnick's `tonutils-storage` (Go) — the same daemon
TON-Torrent ships. ADNL Tunnel and Payment Network groundwork is in
place for v0.7.

### Changed (potentially breaking)
- **Default backend swap**: the daemon `ton-sovereign-deploy` installs
  is now `tonutils-storage` v1.4.1 (xssnick / Go). The legacy TON Core
  C++ daemon stays available via `--daemon-backend=ton-core`. Both
  produce identical bag IDs for identical content (verified
  byte-for-byte against the TON Core daemon's `new-contract-message`
  output in v0.5).
- **`--watch` is on by default** for interactive runs. Pass `--no-watch`
  for one-shot deploys. `--ci-mode` and `--json-output` automatically
  apply `--no-watch` so existing CI invocations don't hang.
- **`--testnet` is rejected on the tonutils backend** (mainnet config
  only). Use `--daemon-backend=ton-core` if you need testnet.
- **`--provider` is temporarily disabled in v0.6** during the daemon
  migration. The mainnet provider economy is dormant (see
  `docs/v0.5/round-postmortem.md`); v0.7 will reintroduce provider
  support against whichever protocol has liveness by then. The
  `op::close_contract` recovery path remains documented (and a
  one-shot script is shipped) for users who need to recover funds
  locked in storage contracts deployed under v0.5.

### Added
- **`--site-adnl <hex>`** (v0.6 B5) writes a `dns_adnl_address`
  (`0xad01`, the `site` record) on top of the existing `storage`
  (`0x7473`) record when combined with `--domain`. Both record
  changes ride in a **single TonConnect transaction** (one user
  sign), matching the mainstream .ton hosting pattern (piracy.ton,
  tonnet-sync-check.ton, …). Bring-your-own `rldp-http-proxy`:
  v0.6 takes the ADNL identity hex as input; auto-spawning the
  proxy + minting the ADNL key is v0.7.
- **`TonConnectProvider.sendTransactionMulti(messages[])`** bundles
  up to 4 messages per TonConnect tx (Tonkeeper spec). Underpins
  the storage + site DNS-record bundling above; `sendTransaction`
  is now a 1-message specialisation.
- **`pollDnsSiteRecord`** watches TONAPI's `data.sites[]` for the
  expected ADNL hex with a fail-open behaviour (TONAPI is known to
  lag/lie for site records — see
  `docs/v0.6/sites-record-discovery.md`).
- **`--tunnel-config <path>`** wires an ADNL Tunnel `nodes-pool.json`
  into the tonutils-storage daemon (NAT-traversal). Bring-your-own
  pool: no public community pool exists yet. Tilde expansion (`~/`)
  supported.
- **`doctor` subcommand** prints a 7-line pre-flight environment check
  (daemon binaries, TONAPI / manifest reachability, TonConnect
  pairing, session dir).
- **Auto-redeploy on file change for the tonutils backend**: build
  changes (add / change / unlink / addDir / unlinkDir) trigger
  `tonutilsCreate`; same content yields the same bag ID
  (idempotent).
- **Payment Network abstraction (groundwork only)** at
  `src/payments/`: `PaymentNetworkClient` interface +
  `noopPaymentClient` for v0.6. v0.7 will swap in a real
  `ton-payment-network` client without refactor.
- **Recovery script** `scripts/close-storage-contract.cjs`: sends
  `op::close_contract (0x79f937ea)` to a stuck storage contract via
  the existing TonConnect session. Mainnet-validated (Round 7
  recovered 0.328 TON; net loss for the entire 7-round mainnet soak
  was 0.022 TON ≈ ¥4).

### Fixed
- `--json-output` and `--ci-mode` no longer hang in watch mode
  (Codex P1).
- Installer "Downloading…" banner is sent to stderr / silenceable so
  `--json-output` stdout stays parseable JSON (Codex P2).
- `mv` replaced with `fs.renameSync` so the tonutils + ton-core
  installers work on Windows where `mv` isn't on PATH (Codex P2).
- Watch-mode now re-seeds the initial bag on the fresh daemon (Codex
  P2 caught the deploy-then-watch handoff race).
- `parseNumericField` only treats `> 0` as valid so `total_size: 0`
  with a positive `downloaded_size` falls through correctly (Codex
  regression P2 — fix completed for the v0.5 self-review's earlier
  partial fix).
- `waitForApi` aborts each fetch via `AbortController` and bails out
  early when the daemon's `child.exitCode` becomes non-null (UDP race
  diagnostic).
- `child.on('error')` no longer throws inside the event handler; the
  error is captured and surfaced via the awaited promise.
- `ensureTonutilsConfig` resolves the `settled` race between its
  polling timer and `child.on('exit')` cleanly.
- `chokidar` subscription uses the `all` event so add / unlink /
  atomic rename writes also trigger redeploy (previously only
  `change` was watched).
- TonConnect signing is on the official `@tonconnect/sdk` (v3.4.x)
  with persistent session at `~/.ton-sovereign/tonconnect.json`
  (`mode 0o600`); `validUntil` is now correctly Unix epoch seconds
  and `network: CHAIN.MAINNET` is set explicitly.
- Provider auto-select rejects scam-rate entries
  (`rate_per_mb_day > 10_000` filtered) and refuses requests over
  1 TON as a final safety cap.

### Docs
- Reframed README / dashboard around **self-host first** and the
  digital-resistance stack.
- `docs/v0.5/round-postmortem.md`: detailed Round 1–7 mainnet soak
  results, the dormant provider economy finding, and the on-chain
  cost ledger.
- `docs/v0.5/lane-b-self-generated-boc.md`: design + verification of
  the self-generated `op::offer_storage_contract` BOC route around
  the daemon CLI's `--max-span` uint8 bug.
- `docs/v0.6/roadmap-draft.md`: v0.6 plan + B3.x design + B4 hand-off
  to v0.7.

### Internal
- `src/wallet/`: TonConnect SDK integration ported from
  `@ton/blueprint` (MIT, Ton Tech).
- `src/daemon/tonutils-{installer,process}.ts`: install + spawn +
  HTTP API client for tonutils-storage.
- `src/cli/deploy-tonutils.ts`: backend-specific deploy path mirroring
  the existing `cli/deploy.ts`.
- 110 unit tests (96 v0.5 + new tunnel-config + payments) and 4+4
  daemon parity / tonutils-integration tests under `RUN_DAEMON_TESTS=1`.

## [0.5.0] – 2026-05-10

A v0.4.0 → v0.5 hardening release. Most user-visible changes are
labelled experimental; v0.5 was about getting the protocol layer right
on mainnet before the v0.6 ecosystem realignment.

### Added
- **Self-generated provider contract BOC** (`src/provider.ts`) bypasses
  the daemon CLI's `--max-span` uint8 cap by emitting the
  `op::offer_storage_contract` (0x107c49ef) message directly from
  `@ton/core`. Verified byte-for-byte against the daemon CLI's output
  at `span=200` (parity test, `RUN_DAEMON_TESTS=1`).
- **`--span <seconds>`** flag (1 second to 4 294 967 295 / ~136 years).
- **`--wallet <name>`** preferred wallet selection (Tonkeeper by
  default).
- **`@tonconnect/sdk@^3.4.1`** dependency. Persistent TonConnect
  session at `~/.ton-sovereign/tonconnect.json` with `0o600`
  permissions.
- **TonConnect manifest** at `tonconnect/manifest.json` (served via
  GitHub raw).
- Defence-in-depth guards: `MAX_REASONABLE_RATE_NANO_PER_MB_DAY`
  filters scam providers; bag size vs `provider.minimal_file_size` /
  `maximal_file_size` rejected before sign; absolute 1-TON safety
  cap.

### Fixed
- TonConnect `validUntil` is now Unix epoch seconds (was milliseconds
  — the requested transactions would have been valid for ~50 000
  years).
- TonConnect `sendTransaction` now sets `network: CHAIN.MAINNET`
  explicitly so wallets refuse cross-chain misuses.
- File-mode 0o600 on the TonConnect session JSON (contains bridge
  session secret).

### Docs
- `docs/v0.5/round-postmortem.md` (Round 1–7 mainnet soak record)
- `docs/v0.5/lane-b-self-generated-boc.md`
- `docs/dashboard.html` v0.5 status banner

## [0.4.0] – 2026-04-26

Initial provider-contract integration (the implementation that v0.6
later mothballed because mainnet had no providers willing to accept
the contracts).

### Added
- `--provider [address]` flag for storage-provider contracts.
- TONAPI provider list filter + cheapest auto-select.

### Known issues
- mainnet provider economy is empty; the flag works at the protocol
  level but nobody on the other end accepts the contract. Documented
  in `docs/v0.5/round-postmortem.md`.

## [0.3.0] – 2026-03-28

- TONAPI bag verification (`verifyBagOnNetwork`).
- GitHub Actions template + `--ci-mode` / `--json-output`.
- Windows support.
- `--watch` mode (opt-in; v0.6 made it default).

## [0.2.0] – 2026-04 (early)

- `--domain <domain>`: register the bag under a `.ton` domain via
  TON Connect deeplink + QR.

## [0.1.0] – 2026-03 (early)

- One-command bag upload to TON Storage with auto-installed
  `storage-daemon`. Vite / Next.js / CRA build dirs auto-detected.
