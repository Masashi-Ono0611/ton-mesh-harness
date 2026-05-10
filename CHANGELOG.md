# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project follows [SemVer](https://semver.org/spec/v2.0.0.html).

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
