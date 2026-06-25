# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
the project follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **e2e driver emits a machine-readable PASS/SKIP/BLOCKED/FAIL verdict (#122).**
  The driver previously had only exit 0 vs exit 1, so a stage-1-only run, a full
  green run, and a silently-skipped stage were all indistinguishable. It now
  emits one grep-able line per run —
  `[e2e] VERDICT verdict=<…> scope=<…> stages=<…>` — and reserves exit 1 for a
  true FAIL (exit 2 for BLOCKED, exit 0 for PASS/SKIP), so CI can tell a
  stage-1-only run (`scope=stage1-only`) from a full E2E (`scope=full-e2e`) and
  see each stage's PASS / SKIP / BLOCKED.

- **Toncenter tx-hash resolve is now key-able on the TonConnect path and
  reports throttling instead of a silent null (#120).** The agentic path
  threaded a Toncenter API key into the tx-hash resolve but the TonConnect path
  did not, so it hit the public per-IP rate limit and `dns_tx_hash` came back
  null even on a landed write — indistinguishable from "not indexed yet". The
  resolve now (a) accepts a key on the TonConnect path (`DnsWriteOptions.toncenter_api_key`,
  sourced from `TONCENTER_API_KEY` by `deploy()`), and (b) returns
  `{ txHash, throttled }` so a rate-limited/unauthorized resolve surfaces a
  `next_actions` hint ("supply a Toncenter API key") rather than a silent null.
  A BOC that isn't a parseable external-in message now emits a (DEBUG-gated)
  `warn` so it is diagnosable separately from index lag.

- **Storage-vs-site viewability breadcrumb + opt-in render confirmation
  (#118).** A `mesh_deploy` writes only the `.ton` **storage** (bag) record,
  not a **site** (ADNL) record, so `<domain>.ton` is not browser-openable via
  the `ton.run` RLDP gateway — but the result carried no signal of this, so a
  "green" deploy could 404 everywhere with no explanation. The deploy result's
  `next_actions` now includes a breadcrumb explaining this and the would-be
  `<domain>.ton.run` URL (stronger when `seed_status` is `stopped`), the
  `mesh_deploy` tool description states it is storage-only and points to
  `mesh_site_record`, and the e2e driver gains an opt-in `E2E_VERIFY_RENDER=1`
  **Stage 2b** that fetches a site's gateway URL, asserts HTTP 200, and surfaces
  the URL for a human to confirm the rendered content (BLOCKED, never PASS, for
  a storage-only deploy). `siteGatewayUrl` moved to `src/sdk/endpoints.ts`
  (re-exported from `src/output.ts`) so the SDK can build the URL without the
  CLI-output module.

### Changed

- **BREAKING — renamed to `ton-mesh-harness`.** The package, both bins, the MCP
  tool names, env vars, the daemon service labels, the on-disk session directory,
  and the debug namespace all moved off the `sovereign` brand. No runtime
  behaviour changed — this is a pure rebrand; the published artifact, the
  CJS / Node ≥ 18 target, and the inlined `@ton/walletkit` are all unchanged.
  - npm package `ton-sovereign-deploy` → **`ton-mesh-harness`** (install the new
    name; the old package is no longer the canonical one).
  - bins `ton-sovereign-deploy` / `ton-sovereign-mcp` → **`ton-mesh-harness`** /
    **`ton-mesh-harness-mcp`**.
  - MCP tools `sovereign_deploy` / `sovereign_check_env` / `sovereign_status` /
    `sovereign_site_record` → **`mesh_deploy`** / **`mesh_check_env`** /
    **`mesh_status`** / **`mesh_site_record`** — update any MCP client config.
  - env vars `SOVEREIGN_ANNOUNCE_IP` / `SOVEREIGN_ANNOUNCE_PORT` →
    **`MESH_ANNOUNCE_IP`** / **`MESH_ANNOUNCE_PORT`**.
  - daemon service labels `ton-sovereign.<bag>` / `ton-sovereign-site.<domain>` →
    **`ton-mesh.<bag>`** / **`ton-mesh-site.<domain>`** — stop and reinstall any
    service installed by an older version, which still carries the old label.
  - session dir `~/.ton-sovereign/` → **`~/.ton-mesh/`** — the binary cache,
    seeds, site keyring, and TonConnect session re-create on first run; the old
    directory can be removed.
  - debug namespace `DEBUG=sovereign:*` → **`DEBUG=mesh:*`**.
  - public SDK constants `SOVEREIGN_DEPLOY_VERSION` → **`MESH_HARNESS_VERSION`**
    and the JSON-schema exports `SOVEREIGN_*_TOOL` → **`MESH_*_TOOL`** — update any
    SDK import that referenced them by name.
- **Dev toolchain migrated to Bun.** Package manager, task runner, and CI now
  run on [Bun](https://bun.sh) (pinned 1.3.8): `bun install` with a single
  `bun.lock` (`package-lock.json` removed), and the build uses `bun build`
  (replacing tsup) with `tsc` emitting the SDK `.d.ts`. The published artifact
  is unchanged — the bins stay CJS targeting plain Node ≥ 18 (consumers use
  `npx` / `node`, never Bun), `@ton/walletkit` stays inlined to avoid the Node
  22+ directory-import crash, and tests still run under Vitest behind the SDK
  no-console ESLint gate. npm publish (OIDC trusted publishing) and the Node
  smoke matrix are retained.

### Fixed

- **A landed DNS write is no longer thrown back as a failed deploy when
  TONAPI's cache lags — now confirmed authoritatively on-chain (#119).** When
  `pollDnsConfirmationOrThrow` times out (TONAPI's flaky `/dns/resolve` didn't
  reflect the write), the deploy now reads the domain NFT's `storage` record
  directly via the `dnsresolve` get-method (`resolveStorageRecordOnChain`,
  Toncenter `runMethod`) and confirms iff it equals the deployed bag. This
  proves the `change_dns_record` ACTION succeeded — unlike trusting a resolved
  wallet tx hash, which only proves the wallet's transaction was indexed (a
  non-owner wallet's tx still indexes while the DNS never changes). Both deploy
  paths go through `confirmDnsWriteOrThrow`; a timeout with no on-chain match
  still surfaces the recoverable error.
- **e2e driver no longer mutates the committed test fixture (#121).** A domain
  deploy injects a provenance manifest (`.well-known/ton-deploy.json`) into its
  `source_dir` before bagging; the e2e driver passed the version-controlled
  `test/fixtures/minimal-site`, so a run left an untracked artifact and
  perturbed the bag content-hash for the integration tests that bag the same
  fixture. The driver now deploys from a throwaway tmp copy (created lazily, so
  importing the script for unit tests has no filesystem side effect), and
  `.gitignore` covers `test/fixtures/*/.well-known/` as belt-and-suspenders.
- **e2e acceptance gate no longer false-fails a successful on-chain deploy
  (#117).** The MCP e2e driver (`scripts/e2e-mcp-deploy.cjs`) gated on a
  non-null `dns_tx_hash`, but that field is best-effort and is legitimately
  null when Toncenter's tx index lags the TONAPI DNS poll — a fully-successful
  2026-06-25 mainnet deploy (`change_dns_record` tx landed, TONAPI `storage`
  == `bag_id`) was reported FAILED. The driver now verifies the write landed
  on-chain via TONAPI `/v2/dns/<domain>/resolve` (`storage` == `bag_id`)
  instead of trusting the convenience hash, and the tx-hash grace window
  (`awaitTxHashWithGrace` default, now `TX_HASH_GRACE_MS`) was raised 3s → 15s
  so `dns_tx_hash` populates more often when Toncenter lags. The runbook
  pass-criteria and the `dns_tx_hash` / `resolve-tx` doc comments were
  corrected to drop the false "Toncenter always indexes before TONAPI
  propagates" premise.

## [0.12.0] – 2026-06-22

### Added

- **Browser-viewable site gateway URL (#70).** A deploy that writes a `site`
  record (`--site-auto` / `--site-adnl`, either backend, TonConnect or agentic)
  now prints `https://<domain>.ton.run` as its **Gateway URL** — but only after
  the site record is signed, so a rejected/failed sign never advertises a dead
  link. The ton.run site gateway resolves the `site` ADNL over RLDP, so the page
  opens in an ordinary browser once the record is on chain and the proxy is
  reachable (verified: `foundation.ton.run` → 200; mainnet only — ton.run has no
  testnet selector, so a `--testnet` deploy prints the generic TON-DNS line
  instead). A storage-only deploy prints no gateway URL — it has no ADNL for the
  gateway to resolve (`<domain>.ton.run` 404s). README +
  `docs/v0.10/site-hosting.md` document both browser paths (`tonsite://` and
  `<domain>.ton.run`).
- **systemd lingering advisory (#83).** On Linux, `--daemon-mode service`
  installs a `systemd --user` unit that won't restart after an unattended
  reboot unless lingering is enabled once. The kit now detects this and prints
  the exact `loginctl enable-linger` command (advisory-only — parity with the
  `--site-auto` ip-alias hint; the kit never runs the privileged op itself).
  Surfaced both as a bag-seeder `nextAction` and in the site-gateway install
  banner. macOS launchd is unaffected.

### Security

- **Dependency CVE overrides (#88).** Pin transitive deps via `overrides` to
  patched ranges — `axios>=1.16.0`, `form-data>=4.0.6`, `hono>=4.12.25`,
  `ws>=8.21.0` — clearing the HIGH/CRITICAL advisories flagged against the
  shipped dependency tree.

## [0.11.0] – 2026-06-22

Site hosting is now reproducible end-to-end from the kit alone — a `.ton` site
can be deployed, persistently identified, and kept online by an OS service
without a hand-written unit. See [`docs/v0.10/site-hosting.md`](./docs/v0.10/site-hosting.md).

### Added

- **`site-record <domain> <adnl-hex>` subcommand (#77).** Sets ONLY the `site`
  (`dns_adnl_address`) record for a domain and prints a Tonkeeper transfer
  deeplink to sign it — no bag, no storage write, no daemon, no TonConnect.
  Point a domain at a resident `rldp-http-proxy` without re-deploying or
  overwriting the storage record. `--json-output` emits the deeplink + raw
  message BOC for agents / CI.
- **SDK `siteRecord()` + MCP `mesh_site_record` (#78).** The site-record
  builder is exposed programmatically and as a 4th MCP tool (one-shot; builds
  the deeplink, never broadcasts). The CLI subcommand is now a thin renderer
  over the shared SDK function.
- **`--site-keyring <path>` — persistent `--site-auto` identity (#79).** The
  proxy's ADNL seed is persisted (default `~/.ton-mesh/site-keyring/<domain>.hex`,
  mode `0600`) and reused across restarts, so the on-chain `site` record stays
  valid. Previously every run minted a fresh ADNL, silently breaking the site
  on restart.
- **Cloud-NAT reachability advisory (#79).** Before spawning, `--site-auto`
  checks whether the announced public IP is assigned to a local interface; on a
  1:1-NAT VM it prints the exact `sudo ip addr add <ip>/32 dev <iface>` fix.
  Advisory only — the kit never runs the privileged command.
- **Persistent site hosting — `--site-auto --daemon-mode service` (#81).** Hands
  the proxy + static server to launchd / systemd via a new foreground
  `site-serve` command, so a `.ton` site survives CLI exit and reboots. The
  service re-derives the same ADNL from the persisted seed on every restart.
  `service list` now shows bag seeders **and** site gateways; `service
  stop-site <domain>` manages the latter. Restart-on-failure only (a clean stop
  stays stopped). Previously `--daemon-mode service` was rejected with
  `--site-auto`.
- **rldp-http-proxy live-spawn integration test in Linux CI (#76).** A new
  `rldp-integration` job (ubuntu-latest, FUSE3, `RUN_DAEMON_TESTS=1`) spawns the
  real binary and asserts it loads the keyring and stays up — the structural
  catch for the "passes on macOS, aborts on case-sensitive Linux" class.

### Fixed

- **`--site-auto` aborted on every case-sensitive Linux host (#74).** The
  rldp-http-proxy keyring file was written with a lowercase hex name, but the
  proxy looks it up by `td::Bits256::to_hex()` (uppercase) — so it resolved only
  on case-insensitive macOS and aborted with `key not in db` everywhere else.
  Written uppercase now.
- **Self-diagnosing rldp startup errors (#75).** A failed proxy start now
  inlines the `proxy.log` tail + captured stdout/stderr into the thrown error
  *before* the session dir is cleaned up (the old message pointed at a log it
  then deleted). Draining the proxy's piped stdio also removes latent backpressure.

## [0.10.0] – 2026-06-22

### Fixed

- **Deploy output no longer advertises a dead gateway URL.** `ton.run/<bag_id>`
  returns 404 — public HTTP gateways resolve `.ton` domains (the on-chain DNS
  storage record), not raw bag ids. `buildUrls` no longer emits a
  `fallbackUrl` for a bag-only deploy, and `printResult` drops the misleading
  "Fallback URL" line and the absolute "cannot be taken down" claim in favour
  of the honest condition: the site stays online for as long as a reachable
  node seeds the bag. README + skill docs corrected to match.

### Added

- **Cloud-seeder announce controls — `--announce-ip` / `--announce-port` (and
  the `MESH_ANNOUNCE_IP` / `MESH_ANNOUNCE_PORT` env vars).** Run the
  kit *as* a publicly-reachable seeder on a cloud VM: they set the
  tonutils-storage `config.json` `ExternalIP` (DHT announce) and a fixed,
  firewall-able `ListenAddr` UDP port. Without them a 1:1-NAT VM (GCP/AWS)
  auto-detects no public IP and silently runs download-only ("server mode:
  false"). IPv4 only; invalid values fail fast; a flag overrides the matching
  env var per-field; rejected on `--daemon-backend=ton-core`. The schema knobs
  (`announce_ip` / `announce_port`) are exposed to MCP callers too. Pair with
  `--daemon-mode service`; a free GCP `e2-micro` suffices.
- **Honest deploy-time reachability signal.** Public gateways and TONAPI do not
  index raw self-hosted bags, so they can't confirm a deploy is downloadable.
  The kit now reads the tonutils-storage daemon's own port-checker verdict and
  reports `✓ Publicly reachable` (others can download), `✓ reachable but stops
  when this command exits` (one-shot modes), or `⚠ Download-only` (behind NAT /
  no public IP) — and the legacy TONAPI check no longer reads a self-hosted
  404 as "unreachable".

## [0.9.0] – 2026-06-21

**The v0.8 agent-surface track and the v0.9 reserve, shipped together as
one GA.** First public release with the CLI + MCP server + SDK all on the
same deploy contract — and the first published automatically via OIDC
trusted publishing (npm `0.6.3` was the last manual one).

### Agent-surface track

- **Two wallet paths, one surface.** `wallet: { kind: "tonconnect", … }`
  for human-signed flows; `wallet: { kind: "agentic", … }` for
  autonomous agents. Both produce the same `DeployResult` shape with a
  real on-chain `dns_tx_hash`. Agentic supports BOTH wallet types in
  @ton/mcp's schema: `type: "standard"` (direct mnemonic/key sign) AND
  `type: "agentic"` (NFT-delegated operator-key signing via the agentic
  collection contract — @ton/mcp is an optional peer dep, lazy-loaded
  only when needed).
- **MCP server `ton-mesh-harness-mcp`** with three GA tools:
  `mesh_check_env`, `mesh_deploy`, `mesh_status`.
  Structured F5 errors, F3 phase events via `notifications/progress`.
- **CLI `--wallet-mode agentic`** brings the autonomous path to the
  terminal (no QR, no phone).
- **Programmable SDK** — `import { deploy, checkEnv, status } from
  'ton-mesh-harness'`. CJS + TypeScript declarations shipped.
- **Agent discoverability** — `skills/mesh-deploy.md` (Anthropic
  skill format), `.well-known/mcp.json` template, expanded npm keywords.
- **`dns_tx_hash` is honest** — real on-chain hash via Toncenter v3
  `transactionsByMessage`, resolved in parallel with TONAPI propagation
  poll. Zero added latency on the happy path.
- **Observability** — `DEBUG=mesh:*` enables structured stderr logs
  at SDK boundaries. Always stderr-only so `--json-output` stdout / MCP
  stdio framing stay valid.

### Added

- **OS-managed daemon ownership (#37)** — `--daemon-mode <embedded|detached|service>`
  (SDK/MCP `daemon_mode`). `service` hands the seeding daemon to launchd
  (macOS) / systemd `--user` (Linux) with a persistent db under
  `~/.ton-mesh/seeds/<bag_id>/`, so it keeps seeding after the CLI
  exits / across reboots. New `service list` / `service stop [--purge]`
  subcommands. The **MCP server now accepts `daemon_mode: "service"`** (the
  OS owns the lifecycle) while still rejecting `detached` / `keep_alive`.
  Windows: TODO. Docs: `docs/v0.9/daemon-service-mode.md`.
- **HTTP transport for `ton-mesh-harness-mcp` (#33)** — opt-in `--http <addr>`
  binds a Streamable-HTTP MCP endpoint at `/mcp` (stdio stays the default;
  mutually exclusive). Binds `127.0.0.1` by default; a non-loopback bind
  requires `MCP_HTTP_TOKEN` (bearer auth) or refuses to start. CORS off
  unless `MCP_HTTP_CORS_ORIGINS` lists origins. DNS-rebinding protection on.
  Docs: `docs/v0.9/mcp-http-transport.md`.
- **testnet deploys on the tonutils/MCP path** — `mesh_deploy`
  (and the CLI tonutils backend) now accept `testnet: true`: the daemon is
  started with the testnet `--network-config` and DNS writes use testnet
  endpoints. Removes the prior "mainnet-only / use ton-core" guard.
- **Signed provenance manifest (#34)** — a deploy with a domain emits
  `.well-known/ton-deploy.json` into the bag (signed on the agentic path
  via Ed25519; unsigned on TonConnect). New `verify-provenance <file>` CLI
  subcommand. Opt out with `--no-provenance` / `provenance: false`.
  Docs: `docs/v0.9/provenance.md`.
- **Real-world examples (#36)** — `examples/vite-spa/` (Vite + React,
  `base: './'`) and `examples/nextjs-static-export/` (Next.js
  `output: 'export'`), each with build → deploy (TonConnect + agentic) →
  watch → DNS walkthroughs.

### Tooling / tests

- **`scripts/bump-daemon-hashes.cjs` (#32)** — recompute + patch the pinned
  daemon `expectedSha256` after a version bump (`--check` dry-run).
  Docs: `docs/v0.9/release-runbook.md`.
- **MCP cancellation cleanup integration test (#31)** —
  `test/mcp-cancel.integration.test.ts` (gated by `RUN_MCP_INTEGRATION=1`):
  drives a real daemon, cancels mid-flight, asserts no orphaned daemon.
- **Cross-agent compatibility groundwork (#35)** —
  `docs/v0.9/agent-compat.md`: per-agent MCP discovery config + red-team
  protocol (runs are manual + publish-gated).

### Changed

- **tonutils-storage daemon `v1.4.1` → `v1.5.0`** — upstream perf/reliability
  release (faster fresh-bag availability, download tuning, RLDP queue split;
  no breaking changes to the `--api`/`--db`/`--network-config` flags or HTTP
  API the kit uses). Pinned SHA-256 hashes refreshed via
  `scripts/bump-daemon-hashes.cjs` (#32) and validated against a live
  download + daemon-spawn integration run.

### Removed

- Vestigial `@types/chokidar` devDependency — `chokidar@4` ships its own
  types; the ancient `@types/chokidar@1.7.5` stub was dead weight.

### Docs

- `docs/archive/` — historical/point-in-time records (v0.5–v0.7 + v0.8
  planning) physically separated from current docs, with all inbound links
  updated. New `docs/README.md` index (Current/Reference/Historical).

### Security

v0.8 hardening (rc6–rc11): a pre-GA pipeline ran 11 Codex multi-model
audit rounds + 1 self-audit against the SDK / MCP / wallet / daemon /
installer modules. **Cumulative: 4 BLOCKERs + 22 MAJORs + 3 MINORs + 1
LOW + 4 NITs resolved (34 findings).** Headline fixes:

- **Wallet-payload exfiltration closed.** `@tonconnect/sdk` v3.4.1 logged
  the unsigned payload + signed BOC to `console.debug`; reference-counted
  suppression around every TonConnect SDK call (escape hatch
  `TONCONNECT_DEBUG=1`), analytics hard-disabled.
- **Wallet-key symlink redirect closed.** `lstat`s parent dir + final
  file, opens with `O_CREAT | O_EXCL`, `fchmod` via fd.
- **Daemon binary supply-chain integrity.** All 3 installers verify
  SHA-256 against pinned hashes (20 hashes × 5 platforms) before chmod.
- **Daemon orphan-on-signal closed.** Drain pattern lets async cleanup +
  SIGKILL escalation run before forced exit.
- **MCP contract enforcement.** Explicit `DeployOptionsSchema.parse` at
  the MCP boundary rejects bare-string wallets; smoke-gated.

v0.9 surface hardening: `service` mode validates the bag id is 64 hex
before using it in a filesystem path / unit label (guards `service stop
--purge` against traversal); the MCP HTTP transport uses constant-time
bearer-token comparison + a 4 MiB request-body cap.

### Stability

- The three MCP tools and the programmable SDK are GA. Their JSON Schemas
  are snapshot-tested; breaking changes bump the minor.

### Release automation

- **First OIDC trusted publishing.** `.github/workflows/publish.yml`
  takes a `v*` tag push → verify gate → `npm publish` (OIDC, no token) →
  `gh release create`, all automatic. `NPM_CONFIG_PROVENANCE=false`
  avoids an intermittent Sigstore 409.

### Deferred

- **V4 (#26) agency-transfer red-team** — runs post-publish (needs the
  package on npm), targeted before v0.9.x.
- **Cross-agent compatibility (#35)** — manual, real-device, per-agent;
  groundwork in `docs/v0.9/agent-compat.md`.
- **NFT-delegated agentic on-chain validation** — unit-tested with mocks;
  on-chain behaviour with a real collection contract is still
  experimental.
- **C2 NAT traversal (#29) / C3 Payment Network (#30)** — upstream-blocked
  on the C++ binaries.

## [0.8.0-rc11] – 2026-05-12

[S2.16 — Path C polish] User-requested follow-ups after rc10 ship.
**1 additional MAJOR** (Windows installer 404 — pre-existing bug
caught while pinning legacy hashes) + 3 additive polish items:

### Added

- **Legacy `storage-daemon` SHA-256 verification** — the v0.5
  legacy `--daemon-backend=ton-core` path (`src/daemon/installer.ts`)
  was the last installer downloading binaries without integrity
  checks. Pinned 10 hashes (storage-daemon + storage-daemon-cli ×
  5 platforms each) for ton-blockchain/ton v2026.02-1. The
  `verifyDownloadedBinary` helper from `installer-utils.ts` was
  generalised to a public `verifyFileSha256({ name, version,
  platformKey, filePath, expected })` so installers that don't go
  through `installBinary` can use the same machinery inline.
- **`RLDP_HTTP_PROXY_SHA256` env-var-pin** — users who override the
  pinned rldp-http-proxy version via `RLDP_HTTP_PROXY_VERSION` can
  now also pin the expected SHA-256 hash via
  `RLDP_HTTP_PROXY_SHA256=<hex64>` so the override path gets
  integrity checking too. Without the hash env var, the override
  path falls back to TOFU + stderr warning (unchanged).
- **Inner-generator cleanup regression test**
  (`test/sdk-deploy-inner-cleanup.test.ts`) — 2 vitest tests
  exercising the Codex r3 BLOCKER fix (deploy() must cascade
  `inner.return()` to the DNS-write generator on outer break /
  abort). Deep-mocks `../src/daemon/tonutils-process` +
  `../src/sdk/dns` to drive deploy() to the inner-iteration
  block, then aborts (test 1) or for-await breaks (test 2);
  asserts the inner generator's `finally` actually fires.

### Fixed

- **`src/daemon/platform.ts::getBinaryName` Windows mismatch** —
  returned `storage-daemon-win-x86-64.exe` but
  ton-blockchain/ton releases ship `storage-daemon.exe` (no
  platform suffix on Windows — single x86_64 asset). Windows
  legacy ton-core installs would have 404'd at curl. Now returns
  the suffix-free name on win32. Caught while pinning legacy
  hashes (`storage-daemon.exe` 404 from concurrent download
  surfaced the bug).

323 tests pass / 11 skip / 0 fail (+2 inner-cleanup).

## [0.8.0-rc10] – 2026-05-12

[S2.15] Codex round 11 self-audit (external review daily-cap
blocked) caught supply-chain + process-lifecycle gaps across
modules rounds 7-10 already touched. **1 BLOCKER-class +
5 MAJORs resolved** before they could ship.

### Fixed

- **[BLOCKER-class]** Daemon binaries (`storage-daemon`,
  `tonutils-storage`, `rldp-http-proxy`) were downloaded from
  GitHub releases and `chmod +x`'d with **no integrity check**.
  A compromised release asset / MITM'd CDN / typo-squatted
  version would execute as the user on a wallet-signing kit.
  Fix: `installer-utils.ts` now verifies SHA-256 after download,
  before chmod+x, against hashes pinned in each installer spec
  (10 hashes pinned: tonutils-storage v1.4.1 × 5 platforms +
  rldp-http-proxy v2026.04-1 × 5). Mismatch → `unlinkSync` +
  throw with expected vs actual hex. Missing hash falls back to
  TOFU + loud stderr warning. Threat model in `SECURITY.md`.
- **[MAJOR × 3]** Same class as Codex r7 daemon-process bugs,
  audited across remaining process modules:
  - `src/daemon/rldp-http-proxy-process.ts` — session dir was
    NEVER `rmSync`'d (every `--site auto` invocation leaked a
    `/tmp` dir with ADNL keyring + log); `kill()` was sync.
    Fix: `mkdtempSync` + async `proxy.once('exit', cleanup)`
    + 2 s SIGKILL escalation; mode 0o700 on dbDir.
  - `src/daemon/process.ts` (legacy ton-core) — same class
    (sync `kill()`, PID-only session dir, throw-from-event-
    handler). Same fixes applied for consistency.
  - `src/wallet/FSStorage.ts` — `fs.writeFile` followed
    symlinks on the TonConnect session JSON. Added `lstatSync`
    + `unlink` (write) and lstat-refuse (read), mirroring
    keyring.ts's r7-r8 fix.
- **[MAJOR]** `src/utils/http.ts::httpsGet` accumulated the
  response body unboundedly. Added 8 MiB default cap
  (`maxBodyBytes` configurable). Defends against malicious /
  buggy servers OOM-ing the Node process.

### Added

- `test/daemon/installer-sha256.test.ts` — 4 tests covering the
  SHA-256 verify path (match / mismatch+unlink / TOFU warning /
  pinned-hash shape sanity). 321 pass / 11 skip total.

## [0.8.0-rc9] – 2026-05-12

[S2.11-14] Codex rounds 7-10 audited v0.8 modules NOT covered by
rounds 1-6: keyring, TonConnect bridge, daemon process lifecycle,
legacy DNS helpers, CLI signal handlers. **3 BLOCKERs + 7 MAJORs
+ 1 MINOR + 1 LOW resolved.** Cumulative across rounds 1-10:
3 BLOCKERs + 15 MAJORs + 3 MINORs + 4 NITs.

### Fixed

Per-finding detail in `git log --grep=codex-r[7-9]` and per-commit
messages. Class summary:

- **BLOCKER × 3** — wallet payload / signing key exfiltration paths:
  - r7 `@tonconnect/sdk` v3.4.1 `console.debug` logs unsigned-payload
    + signed-BOC at bridge boundaries → reference-counted `withQuietTonConnect()`
    silence + `TONCONNECT_DEBUG=1` opt-in escape hatch.
  - r8 round-7 silence raced on concurrent calls → module-level depth
    counter + saved-original.
  - r10 round-7 daemon `kill()` made cleanup async, but primary CLI
    path's signal handler called `process.exit()` synchronously after
    `kill()` → `drainExit()` pattern (`process.exitCode` + 2.5 s
    ref'd safety timer) replaces all 4 `process.exit` sites.
- **MAJOR × 7**:
  - r7 TonConnect telemetry leaks `signed_boc` to analytics.ton.org →
    `analytics: { mode: 'off' }` short-circuits `initAnalytics`.
  - r7 `writeKeyringFile` follows symlinks + chmod TOCTOU → `lstatSync`
    + `O_EXCL` + `fchmod` via fd (portable POSIX + Windows).
  - r7 daemon session-dir collision via `process.pid` only → `mkdtempSync`.
  - r7 daemon `kill()` rmSync'd before SIGTERM took effect → `child.once('exit', cleanup)`
    + 2 s `setTimeout` SIGKILL escalation (unref'd).
  - r8 round-7 `Atomics.wait` blocked main thread → non-blocking
    listener pattern (above).
  - r8 round-7 `O_NOFOLLOW` POSIX-only → portable `lstatSync` +
    `O_EXCL` (above).
  - r9 `installCleanupOnExit` `process.exit` killed loop before
    async cleanup → same `drainExit` pattern.
- **MINOR**: r7 `buildDnsStorageRecord` lax hex parse → strict
  `/^[0-9a-fA-F]{64}$/` regex gate.
- **LOW**: r9 keyring parent dir not lstat'd → added.

### Added

- 4 regression tests across `test/wallet/tonconnect-dispose.test.ts`
  (silence + restore + concurrent-safety + escape hatch),
  `test/dns.test.ts` (strict hex), `test/cli-output-mode.test.ts`
  (drain timer with `vi.useFakeTimers()`).
- 317 pass / 11 skip (was 310 in rc8).

## [0.8.0-rc8] – 2026-05-12

[S2.10] Codex round 4 + 5 + 6 closure. Round 4 found 1 NEW MAJOR
introduced by the rc7 mcp.ts dedup refactor; round 5 confirmed fix
+ flagged 2 NITs; round 6 final pass = 0 findings ("Nothing else
worth flagging for the v0.8.0 GA tag"). Cumulative across all 6
rounds: **1 BLOCKER + 8 MAJORs + 1 MINOR + 4 NITs resolved**.

### Fixed (Codex review 2026-05-12, rounds 4-5)

- **[MAJOR]** rc7's `src/mcp.ts` dedup refactor lost MCP wallet-
  strictness defense-in-depth. The removed `DeployOptionsSchema.parse()`
  was serving two roles: (a) the redundancy Codex round 3 flagged,
  AND (b) enforcing the MCP contract that `wallet` must be a
  structured object union. The SDK's `deploy()` is more permissive —
  `parseWalletInput()` lifts bare strings (`"Tonkeeper"`) into
  structured objects for CLI backwards-compat. A non-compliant
  MCP client could send `wallet: "Tonkeeper"` and silently bypass
  the contract. **Restored explicit parse with a clarified
  comment about the contract role** (not redundant — defense-in-
  depth). Probe confirmed: `{wallet: 'Tonkeeper'}` now rejects
  with `{ code: 'ERR_INVALID_INPUT', firstIssuePath: ['wallet'],
  firstIssueMessage: 'Expected object, received string' }` BEFORE
  the testnet guard or any deploy side-effect fires.
- **[NIT]** F5 diagnostics regression — `SdkError.data.zod_issues`
  was dropped by the SDK ZodError wraps in `check.ts` / `deploy.ts`
  normalize(). Enriched both wraps to detect ZodError shape and
  include `data: { zod_issues }` when applicable. SDK consumers and
  MCP clients both benefit.
- **[NIT]** Stale comment in `src/mcp.ts` claiming the SDK wrap
  "sets no data" — corrected after the above fix.

### Added

- `scripts/mcp-smoke.cjs` adds an `id=4 tools/call mesh_deploy`
  step with `{wallet: "Tonkeeper", testnet: true}` and asserts that
  the MCP gate rejects it BEFORE the testnet guard fires. The
  `testnet: true` element is critical: if the strict gate were
  silently dropped, the deploy would later fail with the testnet
  message — a different failure mode. This makes the wallet-
  strictness regression catchable in CI.
- 2 new unit tests in `test/sdk-deploy.test.ts`:
  - SDK bare-string wallet lift still works (CLI-compat preserved)
  - `SdkError.data.zod_issues` surfaces on schema parse failures

### Tests

- 310 pass / 11 skip (up from 308 in rc7).
- MCP smoke ends with `wallet_strict=rejected` token.
- All 4 smokes (cli + mcp + sdk + tarball) green.

## [0.8.0-rc7] – 2026-05-12

[S2.9 polish] Codex pre-GA review pass against rc6 + mcp.ts dedup
refactor. 5 MAJORs + 1 MINOR + 1 refactor resolved at the SDK
public-surface level. Final rc before V3/V4 acceptance gates.

### Refactored

- `src/mcp.ts` removed redundant `Schema.parse()` calls + dead
  `ZodError`-catch branches in `handleCheckEnv` / `handleDeploy`.
  Now that `checkEnv()` / `deploy()` both wrap `ZodError` → `SdkError`
  themselves, the MCP layer was double-parsing every call. -12 lines,
  single source of validation. No behaviour change.

### Fixed (Codex pre-GA review 2026-05-12)

- **[MAJOR]** `DeployOptionsSchema` had dead public fields
  `daemon_backend` and `skip_verify`. Schema said they did
  something; the SDK never read either (`daemon_backend` was
  silently ignored — `'ton-core'` would still run on tonutils;
  `skip_verify` had no callsite at all). Removed both from
  `DeployOptionsSchema`. The CLI's `--daemon-backend=ton-core` is
  a separate code path that bypasses the SDK and stays. The
  `daemon_backend_installed` field in `CheckEnvResult` is
  informational (which backends are present on the machine) and
  stays.
- **[MAJOR]** Stale `testnet` error message referenced the now-
  removed `daemon_backend` option. Updated to point CLI users at
  the CLI's separate `--daemon-backend=ton-core` flag while
  making clear the SDK path is mainnet-only in v0.8.
- **[MAJOR]** `src/sdk/check.ts::checkEnv()` threw raw `ZodError`
  on malformed SDK input — violating the SdkError-on-every-error
  contract that `deploy()` / `status()` honour. Wrapped the
  `CheckEnvOptionsSchema.parse()` call in try/catch that
  re-throws as `SdkError(ERR_INVALID_INPUT)`. MCP server already
  wrapped this, but the npm SDK consumer surface was leaking.
- **[MAJOR]** `src/sdk/deploy.ts` manually iterated the inner DNS
  generator and never called `inner.return()` if the outer
  consumer broke out of the `for await` (e.g. agent disconnects
  mid-deploy). Inner's own `finally` (TonConnect bridge dispose,
  AbortController cleanup, in-flight Toncenter promises) never
  ran. Wrapped the iteration loop in `try { ... } finally { await
  inner.return(undefined).catch(() => {}) }` to cascade cleanup
  on all exit paths.
- **[MAJOR]** `docs/v0.8/agent-stack-compose.md` said the final
  deploy result "carries dns_tx_hash + a tonviewer URL" — the
  schema actually allows `dns_tx_hash: null` (best-effort
  Toncenter indexing). Doc now spells out the null semantic +
  the "re-poll later, don't fail the deploy" guidance.
- **[MAJOR]** Same doc said `wallet.kind: "agentic"` still works
  without `@ton/mcp`. True for `type: "standard"` config entries
  (mnemonic / direct key sign through `@ton/walletkit`); false
  for `type: "agentic"` config entries (NFT-delegated signing
  needs `AgenticWalletAdapter` from the optional peer). Doc now
  distinguishes the two cases + spells out the `ERR_NO_WALLET`
  fallback signal.
- **[MINOR]** `DeployInput` and `DeployControl` types were not
  exported from the public barrel (`src/sdk.ts`) even though the
  signature of `deploy()` uses them. TS consumers of the npm
  package would get `deploy: (rawInput: DeployInput, control?: DeployControl) => ...`
  with both type names unresolvable. Re-exported from the barrel.

## [0.8.0-rc6] – 2026-05-12

[S2.9] Full v0.8 feature ship: NFT-delegated agentic, `mesh_status`
MCP tool, SDK external entry, observability logger, GA release script,
4 smoke harnesses. Two Codex multi-model review rounds resolved 1
BLOCKER + 4 MAJORs. Final pre-GA snapshot — awaits V3 (E2E) + V4
(red-team) acceptance.

### Fixed (Codex review 2026-05-12)

- **[BLOCKER]** `src/sdk/agentic-sign.ts::loadAgenticWalletAdapter` —
  the version-skew guard rejected the real `@ton/mcp` export. The
  installed `AgenticWalletAdapter` is a CLASS (`typeof === 'function'`),
  but the guard required `typeof === 'object'`. Every NFT-delegated
  agentic deploy would have hit `ERR_NO_WALLET` despite a correctly
  installed peer dep. Probe-verified by Codex: `{ adapterType:
  'function', createType: 'function', guardRejects: true }`. Fix:
  accept both `'object'` and `'function'`; test mock now mirrors the
  real class shape (function with a static `create`).
- **[MAJOR]** `src/sdk/log.ts::parseDebugPattern` — `DEBUG='?'`
  crashed module import with `SyntaxError: Nothing to repeat`. The
  regex-meta escape list omitted `?`. Fix: added `?` to the escape
  list AND wrapped `new RegExp()` in try/catch so any future unknown
  meta gets skipped instead of crashing import. 4 new tests
  (DEBUG='?' / metas / bare '-' / live `require()` round-trip).
- **[MAJOR]** `src/sdk/status.ts` — `bag_accessible: false` could
  mean either "TONAPI says not_found" (genuine "bag not propagated")
  or "TONAPI unreachable / endpoint drifted" (which would silently
  mask future endpoint changes as "not propagated"). New schema
  field `bag_unavailable_reason: 'not_found' | 'network_error' |
  null` distinguishes. 3 new tests; snapshot updated.
- **[MAJOR] (verify pass)** `src/sdk/status.ts` — `httpsGet` throws
  `"Not found: <url>"` / `"HTTP 404"` on TONAPI 404 BEFORE the body
  inspection. The initial fix went through the catchall and emitted
  `network_error` for genuine 404s. Now detects both error messages
  → `unavailable_reason: 'not_found'` with no retry (404 is
  definitive). 2 new tests.

### Added

- **Programmatic SDK entry** — `import { deploy, checkEnv, status,
  type DeployOptions } from 'ton-mesh-harness'`. tsup now builds
  `dist/sdk.js` + `dist/sdk.d.ts` (37 KB types) alongside the two
  binaries. `package.json` `main` flips from `dist/cli.js` (was
  wrong; main should not be a binary) to `dist/sdk.js`, with
  `exports` field providing both `'.'` and `'./sdk'` subpaths.
  Bin entries unchanged. Smoke: `require('ton-mesh-harness')` /
  `require('ton-mesh-harness/sdk')` both work; TS consumers get
  full types via `dist/sdk.d.ts`.
- **Observability log layer** — `DEBUG=mesh:*` style env var
  enables structured stderr logs at SDK boundaries. Namespaces
  available: `mesh:deploy` (phase transitions),
  `mesh:agentic-sign` (adapter build + broadcast),
  `mesh:resolve-tx` (Toncenter poll attempts + hits/misses).
  Grammar matches `debug.js`: `*` wildcard, comma- or space-separated
  lists, `-prefix` exclusion. Hand-rolled — no `debug` runtime dep.
  Output ALWAYS on stderr so `--json-output` stdout / MCP stdio
  framing stay valid. 19 new unit tests in `test/sdk-log.test.ts`.
- **`mesh_status` MCP tool** — third GA tool. One-shot snapshot
  of a bag's network state: input `{bag_id, domain?, testnet?}`,
  output `{bag_id, bag_accessible, bag_size_bytes, bag_file_count,
  domain?: {name, nft_address, resolved_bag_id, matches}}`. Designed
  for agents that ran a `keep_alive: false` deploy and want to
  poll whether the bag has propagated. Network failures are absorbed
  (bag_accessible=false), not thrown — so the answer is always a
  clean snapshot. New SDK module: `src/sdk/status.ts`. 11 new mocked
  unit tests cover happy path, TONAPI 404, network-failure absorb,
  domain-NFT lookup failure paths, case-insensitive bag-id match.
- **NFT-delegated agentic signing** — `wallet.kind: "agentic"` with a
  `type: "agentic"` entry in `~/.config/ton/config.json` now signs
  through `@ton/mcp`'s `AgenticWalletAdapter`. The operator key
  signs on behalf of `owner_address` via the agentic collection
  contract. The SDK lazy-loads `@ton/mcp` (declared as an optional
  peer dependency) only when this path is selected, so TonConnect-
  only / standard-wallet users don't pay the ~19 MB install cost.
- New unit tests (7) in `test/sdk-agentic-sign.test.ts` for the
  NFT-delegated path: adapter routing, operator-key vs mnemonic
  selection, `wallet_nft_index` / `collection_address` plumbing,
  missing-operator-key rejection, abort handling.
- `examples/hello-ton/` — minimal reference site for the V3 E2E
  acceptance test and first-touch users. Three-mode deploy
  walkthrough in the README (TonConnect mainnet / TonConnect testnet
  / agentic mainnet).
- New unit tests across the refactor pass (49 new tests in
  `sdk-abort` / `cli-output-mode` / `sdk-dns-helpers` /
  `sdk-endpoints`). Total 265 pass / 11 skip (was 207).

### Changed

- `agentic-config.ts` schema now accepts `type: "agentic"` entries
  (refine: requires `operator_private_key`). `AgenticConfigSelection`
  exposes the union `StoredSelectableWallet = StoredStandardWallet |
  StoredNftAgenticWallet`.
- 13 refactor commits consolidating duplication: shared
  `dns-helpers` (post-broadcast pipeline + event builders),
  `abort.ts` (`makeAbortChecker` + `safeAbort`),
  `endpoints.ts` (Toncenter / tonviewer URLs + `networkFromTestnetFlag`),
  `walletkit-network.ts` (`buildToncenterClient` + isolated walletkit
  imports), `cli/output-mode.ts` (`resolveCliOutputMode` +
  `installCleanupOnExit`), `version.ts` (single VERSION source),
  daemon `installer-utils.ts::installBinary` (collapses
  tonutils + rldp-http-proxy installers), wallet
  `signRequestValidUntilSeconds`.
- Project docs fully translated to English (`README.md`,
  `docs/provider-contract.md`, two CHANGELOG entries, two test
  comments). `grep -rlP '[\x{3040}-\x{30FF}\x{4E00}-\x{9FFF}]'` across
  the repo returns zero matches.

### npm

- `@ton/mcp` moved from `dependencies` → `peerDependencies` (optional)
  + `devDependencies` (for in-repo tests). Bundles stay at
  `cli.js` 1.28 MB / `mcp.js` 1.27 MB; users who don't use
  NFT-delegated agentic don't transitively install 19 MB of @ton/mcp.

## [0.8.0-rc5] – 2026-05-11

[S2.8] CLI agentic mode + critical Node 22+ runtime fix.

### Fixed (CRITICAL — broke rc2 / rc3 / rc4 CLI binaries)

- **CLI binary failed to load on Node 22+** with
  `ERR_UNSUPPORTED_DIR_IMPORT`. Root cause:
  `@ton/walletkit@0.0.12-alpha.3` ships `dist/cjs/utils/mnemonic.mjs`
  whose top-level `import { ... } from '../errors'` uses a directory
  import — unsupported in Node ESM resolver strict mode (Node 22+).
  Since the package's `main` points at the CJS index but internal
  files mix `.mjs` (ESM), Node's loader picks up the broken `.mjs`
  when our externalized `require('@ton/walletkit')` walks into the
  package. The MCP smoke (`scripts/mcp-smoke.cjs`) didn't catch this
  because it only exercised `dist/mcp.js`, not `dist/cli.js`. Tests
  use vitest which has its own resolver, also unaffected.
- Fix: `tsup.config.ts` now sets `noExternal: ['@ton/walletkit']`.
  Inlining walletkit causes tsup to resolve directory imports at
  build time, so the published bundle works on Node 18-24.
- Bundle size cost: `dist/cli.js` 694 KB → 1.28 MB,
  `dist/mcp.js` 686 KB → 1.27 MB. Acceptable for fixing a runtime
  load failure that affected every CLI invocation on Node 22+.
- **Affects rc2 / rc3 / rc4**. Users on Node 18 / 20 are unaffected
  (those Nodes accept directory imports). rc5 fixes for all.

### Added

- **CLI `--wallet-mode agentic`** — the agentic signing path is now
  reachable from the terminal, not just SDK / MCP. Reads the wallet
  key from `~/.config/ton/config.json` (the @ton/mcp-managed file)
  and signs `.ton` DNS updates locally — no QR / phone approval.
  Routes through `src/cli/dns-agentic.ts`, a thin CLI adapter over
  the SDK's `writeDnsRecordAgentic` generator. Phase events map to
  spinners; the final `tx_hash` (when Toncenter has indexed) prints
  a tonviewer link.
- **CLI `--wallet-label`** — wallet selector for agentic mode
  (id / name / address). Defaults to `active_wallet_id`.
- **CLI `--wallet-config`** — override the config file path
  (default `~/.config/ton/config.json` or `$TON_CONFIG_PATH`).
- **Validation**: `--wallet-mode agentic` requires `--domain` and
  `--daemon-backend=tonutils`; `--wallet-label` and `--wallet-config`
  require `--wallet-mode=agentic`. Invalid `--wallet-mode` value
  rejected at flag parse time.

### Verified

- 200 tests pass / 11 skip (unchanged from rc4 — CLI adapter is a
  thin shim over the already-tested SDK).
- `node dist/cli.js --help`, `--wallet-mode bogus`, `--wallet-label foo`
  all behave as expected (help text shows new flags; invalid values
  hit the validation gate).
- MCP smoke unchanged.

## [0.8.0-rc4] – 2026-05-11

[S2.7] Real `dns_tx_hash` exposure. Both paths (TonConnect + agentic)
now resolve the on-chain transaction hash via Toncenter v3's
`transactionsByMessage` lookup, in parallel with the TONAPI DNS
propagation poll. Zero added latency on the happy path.

### Added

- **`src/sdk/resolve-tx.ts`** — `resolveTxHashFromMessageHash`:
  polls Toncenter v3 with exponential bounds (2s default interval,
  60s default timeout), converts hex → padded-base64 for the
  `transactionsByMessage` query, lower-cases & `0x`-prefixes the
  result. Best-effort: swallows 429 / 5xx / DNS errors and keeps
  polling until the deadline; returns `null` on timeout without
  throwing. AbortSignal honoured.
- **TonConnect path tx hash**: `src/sdk/dns.ts::writeDnsRecord` now
  computes `Cell.fromBase64(messageBoc).hash().toString('hex')` —
  that hash IS the inbound message hash Toncenter indexes for the
  external-in tx. Passed to `resolveTxHashFromMessageHash`.
- **Agentic path tx hash**: `src/sdk/dns.ts::writeDnsRecordAgentic`
  passes the Toncenter-returned `message_hash` directly.
- **`DeployResult.dns_tx_hash` now populated** on both paths when
  Toncenter has indexed by the time the DNS poll succeeds. Falls
  back to `null` + `next_actions` message_boc / message_hash hint
  if Toncenter's index lagged.
- **`DnsWriteResult.tx_hash` + `DnsWriteAgenticResult.tx_hash`** —
  generator return values now carry the resolved hash.
- **`next_actions` upgrade**: when `dns_tx_hash` is non-null, surfaces
  a tonviewer.com link instead of the message-hash-with-disclaimer
  text.

### Tests

- `test/sdk-resolve-tx.test.ts` — 11 new mocked tests: malformed-hex
  fast-fail (no network call), Toncenter hit, lower-case +
  0x-prefix normalization, multi-poll until success, timeout, error
  swallowing, pre-aborted signal, network/endpoint selection, API
  key passthrough, hex → padded-base64 round-trip.
- Total: 195 pass / 11 skip.

### Note

The 90s resolve timeout + 3s post-DNS-confirm grace period means
the worst case is a 93s wait that strictly overlaps the DNS
propagation poll (which itself takes 30-300s). In practice
Toncenter's tx index catches up within ~5-15s of the broadcast,
well before DNS propagation completes, so dns_tx_hash is populated
synchronously with the `done` event.

## [0.8.0-rc3] – 2026-05-11

[S2.6] Agentic DNS path lands. The last v0.8.0 GA code gate closes:
`wallet: { kind: "agentic" }` + `domain` now signs autonomously from
`~/.config/ton/config.json` (the file `@ton/mcp@alpha` writes) and
broadcasts via Toncenter v3. No human in the loop.

Codex multi-model review caught 2 BLOCKERs + 3 MAJORs + 1 MINOR + 1 NIT;
all addressed below.

### Added

- **`src/sdk/agentic-config.ts`** — strict zod loader for
  `~/.config/ton/config.json` (the `@ton/mcp@alpha` schema, version 2).
  Mirrors `@ton/mcp@0.1.15-alpha.15`'s `TonConfig` shape. Supports the
  `standard` wallet type (mnemonic OR private_key) and resolves the
  active wallet via `wallet_label` (matches id/name/address) or
  `active_wallet_id` fallback. Network-filtered, removed-entry-aware.
  Rejects `type: "agentic"` (NFT-delegated) with a clear v0.8.x
  follow-up pointer.
- **`src/sdk/agentic-sign.ts`** — builds a `WalletAdapter` from a
  `StoredStandardWallet` via `@ton/walletkit`'s `Signer.fromMnemonic`
  / `Signer.fromPrivateKey` and the version-appropriate
  `WalletV5R1Adapter` / `WalletV4R2Adapter`. Signs the change_dns_record
  body batch (storage + optional site/ADNL) and broadcasts via
  `ApiClientToncenter.sendBoc`. Returns the normalized message hash
  (`0x<hex>`) — the indexable identifier explorers and TONAPI resolve
  to the on-chain tx within ~10s.
- **`src/sdk/dns.ts::writeDnsRecordAgentic`** — async-generator parallel
  to `writeDnsRecord` (TonConnect). Yields the same F3 phase contract:
  `awaiting_signature` (informational, near-instant) →
  `dns_signing` (after Toncenter accepts the BOC; data includes
  `message_hash`, `from_address`) → `dns_confirmed` → `verifying`.
- **`src/sdk/deploy.ts`** — replaces the rc2 `ERR_INVALID_INPUT` early
  reject with a real branch into `writeDnsRecordAgentic`. The F4
  cancellation contract is unified across both paths
  (`dnsAwaitingSignatureSeen` decorates `may_have_published`).
- **`dns_tx_hash` exposure** — agentic path populates `dns_tx_hash`
  with the Toncenter normalized message hash (NOT null). TonConnect
  path still null (`message_boc` surfaced via `next_actions` — same
  rc2 behaviour). Schema unchanged; consumers that branch on
  `dns_tx_hash !== null` now see a real value on the agentic path.

### Codex review fixes (BLOCKER + MAJOR + MINOR + NIT)

- **[BLOCKER 1]** `@ton/mcp`'s `saveConfig` ALWAYS writes encrypted via
  its protected-file format (`\x8aTM\x01` magic + AES-256-GCM with a
  self-contained key). The rc3-initial assumption that configs are
  plaintext was wrong — every real `@ton/mcp@alpha` config would have
  been rejected. Ported the `decodeProtectedConfig` decoder (not
  passphrase-protected; key is in the file alongside ciphertext) so
  the loader transparently handles both formats. Updated
  `src/sdk/check.ts` to use the correct magic bytes too. Original
  guess (`\x8aTON`) was wrong by 2 bytes.
- **[BLOCKER 2]** F4 cancellation `may_have_published` was unsound
  for the agentic path. The TonConnect logic flips `true` on
  `awaiting_signature` (assumes user might be approving the QR
  out-of-band), but agentic has no human approval step — only the
  broadcast inside `agenticSignAndSend` enqueues a BOC. Split the
  flag: tonconnect → `dnsAwaitingSignatureSeen`; agentic →
  `dnsBroadcastEnqueued` (set on `dns_signing` after sendBoc
  returned). Threaded `AbortSignal` through `writeDnsRecordAgentic`
  with abort checks at each phase boundary so cancel-between-
  awaiting_signature-and-broadcast yields `may_have_published: false`.
- **[MAJOR 1]** `dns_tx_hash` was misleading on the agentic path.
  Toncenter v3 `/api/v3/message` returns the normalized external-in
  *message* hash, NOT the resulting on-chain transaction hash.
  Restored `dns_tx_hash: null` on both paths; surface the message
  hash via `next_actions` with explicit "NOT the on-chain tx hash"
  wording matching the TonConnect path's BOC disclosure. A future
  GA can add a TONAPI poll to resolve the actual tx hash.
- **[MAJOR 2]** Schema was looser than `@ton/mcp`'s `TonConfig`.
  Made `name`, `created_at`, `updated_at` required on agentic
  entries; added required `owner_address`; made top-level `networks`
  required (not defaulted). Strict-mode `passthrough()` only at
  shape-level, not field-level.
- **[MAJOR 3]** `agentic-sign.ts` was untested. Added
  `test/sdk-agentic-sign.test.ts` (10 vitest-mocked unit tests):
  wallet-version routing (v5 vs v4), Signer.fromMnemonic vs
  fromPrivateKey, 64-byte combined keypair seed extraction, invalid
  private_key rejection, validUntil ≤ 5min cap, base64 payload
  shape, message_hash return, sign-error → ERR_INTERNAL mapping,
  sendBoc-error → ERR_DNS_TX_TIMEOUT mapping, toncenter_api_key
  passthrough, testnet endpoint switch.
- **[MINOR]** Error routing — `ERR_NO_WALLET` was overloaded.
  Split: ERR_NO_WALLET (no config / no usable wallet),
  ERR_INVALID_INPUT (malformed JSON, schema version mismatch,
  corrupt protected-file, NFT-delegated type unsupported).
- **[NIT]** Removed the explicit `mode: DEFAULT_DNS_SEND_MODE`
  parameter from `getSignedSendTransaction` calls — walletkit
  hardcodes `PAY_GAS_SEPARATELY + IGNORE_ERRORS` (=3) internally
  for V5R1 and V4R2 anyway.

### Tests

- 27 new unit tests in this commit (17 config + 10 sign). Total:
  180 pass / 11 skip.

### Not yet (deferred to v0.8.x / v0.9)

- NFT-delegated agentic signing (`type: "agentic"` wallets in
  `@ton/mcp`'s parlance, NOT our SDK's `wallet.kind: "agentic"`).
  Requires the `@ton/mcp` collection-contract operator-key dance —
  tracked separately.
- TonConnect-path `dns_tx_hash` upgrade (currently null). Would
  require a TONAPI poll on the connected wallet's outgoing tx
  history after the BOC dispatch.

## [0.8.0-rc2] – 2026-05-11

MCP server ships. v0.8.0-rc2 is the agent-surface track's first
release where `ton-mesh-harness-mcp` is a real binary, not a fail-fast
stub. The .ton DNS write is NOT yet integrated into the SDK / MCP path
— that lands at [S2.5] before v0.8.0 GA. The CLI continues to chain
DNS today.

### Added

- **`ton-mesh-harness-mcp` MCP server** (`src/mcp.ts`) — implemented via
  the low-level `Server.setRequestHandler` API (not the high-level
  `McpServer.registerTool`) so we own validation and emit F5
  structured error payloads. Implements `initialize`, `tools/list`,
  `tools/call`, `notifications/progress`, and accepts (but suppresses
  response on, per protocol) `notifications/cancelled`.
- **`src/sdk/deploy.ts`** — programmatic deploy SDK as an
  `AsyncGenerator<DeployEvent, DeployResult>`. Bag-creation core only
  in this release; DNS deferred to S2.5. AbortSignal honoured.
  `ERR_BUSY` serialisation gate per F5. Daemon ownership flips before
  the `done` yield so consumers can break early without leaking.
- **`src/sdk/check.ts`** — `checkEnv()` programmatic environment
  probe. Powers `runDoctor` AND the MCP `mesh_check_env` tool.
  Detects agentic-wallet config with a strict-shape probe (file
  exists + at least one entry that looks like a wallet) — surfaces
  `AGENTIC_CONFIG_SCHEMA_UNKNOWN` warning if the file shape is
  unrecognised, so a future `@ton/mcp` schema change fails loud.
- **`src/sdk/schemas.ts`** — single zod source of truth.
  `WalletSpec` discriminated union (`tonconnect` | `agentic`).
  `ErrorPayload` code-aware discriminated union with strict F4
  `CancelledDataSchema`. `ERR_BUSY` added to stable codes.
- **`src/sdk/json-schemas.ts`** + snapshot test — JSON Schema
  artefacts for `tools/list`. Snapshot-tested so any zod drift fails
  loud.
- **ESLint v9 flat config** (`eslint.config.mjs`) enforcing
  `no-console` on `src/sdk/**`.
- **`skills/mesh-deploy.md`** — Anthropic skill format,
  documenting both signing paths + V4 heuristic trigger phrases.
- **`templates/.well-known/mcp.json`** — opt-in MCP server
  self-description users can copy into their deployed site's
  `.well-known/`.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — matrix Node
  18/20/22 × ubuntu/macos. Steps: install, lint, tsc, test, build,
  MCP smoke (portable Node harness at `scripts/mcp-smoke.cjs`).
- **CONTRIBUTING.md + PR template** under `.github/`.
- **`docs/v0.8/`** restructured: concept update, P-1 probe memo,
  rescoped requirements, ton-org/skills PR draft.

### Changed

- **Doctor command** (`src/cli/doctor.ts`) is now a thin renderer
  over `checkEnv()`. v0.7 output preserved + three new lines
  (Agentic wallet config / Disk free / Node version).
- **`runDeployTonutils`** is now an SDK adapter. Drives
  `sdkDeploy()` and renders events. AbortController threaded
  through SIGINT handling. `onDaemonReady` hook captures the real
  TonutilsHandle for watch-mode (no synthetic handle).
- **`DeployResult.dashboard_url` → `daemon_api_url`** — the daemon
  serves a JSON API, not a dashboard HTML page.
- **`docs/v0.9/` → `docs/v0.8/`** — v0.8 became the agent-surface
  track slot (was drafted as v0.9). C2 NAT + C3 Payments moved to a
  v0.9 reserve slot.
- **Project-wide cleanup** (refactor/v0.8-cleanup branch, merged
  c112ed9): tsconfig `noUnusedLocals` + `noUnusedParameters` enabled.
  Shared `src/utils/tunnel-config.ts` extracted. Dead `src/cli/provider.ts`
  removed. Port probes moved to `src/daemon/ports.ts`. Installer
  utilities deduplicated in `src/daemon/installer-utils.ts`. Orphan
  `src/payments/` placeholder removed. Net: -290 LOC.
- `package.json` `version` 0.8.0-rc1 → 0.8.0-rc2. Description
  rewritten to lead with "CLI + MCP server".

### Out of scope (deferred to v0.8.0 GA)

- **[S2.5] SDK DNS write** (`awaiting_signature` → `dns_signing` →
  `dns_confirmed` → `verifying` phases). CLI continues to chain
  `runDnsRegistration()` outside the SDK at rc2. MCP `mesh_deploy`
  returns `dns_tx_hash: null` plus a `next_actions` hint pointing at
  the CLI.
- **[V3] #18** Claude Code MCP client → testnet deploy E2E. Blocked
  on S2.5.
- **[V4] #26** Agency-transfer red-team test. Manual, fresh agent
  session required. Run at GA before publishing the ton-org/skills PR.
- **[D3] #21** Release prep (final version bump, README roadmap,
  CHANGELOG GA section).

### Codex review history

Each block went through Codex multi-model review. Cumulative findings
resolved in rc2: 7 BLOCKER + 23 MAJOR + 17 MINOR + 7 NIT across F1+F2,
S1, S2, S3, S4+V1+V2, M1-M5, project-wide refactor, and D5+D1+D2 sweeps.
Notable architectural pivots from review:
- `@ton/mcp` does NOT do TonConnect — compose is filesystem-level
  via shared `~/.config/ton/config.json`, NOT inter-MCP RPC. The
  `@ton/walletkit` exposes `Signer` + adapters only, NOT a config
  loader; the kit reads the config file itself.
- MCP server uses LOW-LEVEL handlers (not `McpServer.registerTool`)
  so SDK-level zod validation can produce F5 structured errors.
- MCP cancellation is fire-and-forget — the protocol suppresses any
  response after `notifications/cancelled`.

## [0.8.0-rc1] – 2026-05-10

First-useful flag-plant for the **agent-surface track**. v0.8.0-rc1 ships
no MCP server yet — the GA tag (week 6) introduces `ton-mesh-harness-mcp`.
This rc tag plants discoverability artifacts and the rescoped design docs
that encode the [P-1 probe](docs/archive/v0.8/at-mcp-probe.md) verdict, so an agent
that later searches for `"deploy a static site to .ton"` can already find
the kit (via the existing CLI). The acceptance hypothesis behind that
discovery claim is verified by the [V4 red-team test](https://github.com/Masashi-Ono0611/ton-mesh-harness/issues/26)
(rc1 run = CLI path).

### Added

- **README "Agent quickstart"** section pointing at the existing
  `npx -y ton-mesh-harness` CLI flow, with explicit guidance for
  agent runtimes (Claude Code / Cursor / etc.) and a discoverability
  caveat. The GA section sketches the future MCP server config using the
  correct dual-bin invocation: `npx -y --package ton-mesh-harness ton-mesh-harness-mcp`.
- **npm keywords** (`mcp`, `mcp-server`, `agent-skill`, `claude-skill`,
  `ton-storage`, `ton-dns`, `dot-ton`, `adnl`, `static-site`, `website`,
  `decentralized-web`, `tonconnect`, `agentic-wallet`) added to
  `package.json` so agent / npm searches surface the kit for static-site
  + .ton + agent-callable queries.
- **package description rewritten** to lead with the deploy-static-site-to-.ton
  capability and to flag the rc1 / GA scope honestly (no MCP server yet
  at rc1; planned for GA).
- **Concept update doc** at `docs/archive/v0.8/concept-update-2026-05-10.md`
  capturing the dual-track (v0.8 agent surface / v0.9 C2 NAT + C3 Payments)
  framing, premises P1–P5' (Codex-refined), OQ#0–#7 resolutions, the
  agency-transfer red-team test definition, and the canonical compose
  model after the P-1 verdict.
- **P-1 probe memo** at `docs/archive/v0.8/at-mcp-probe.md`. Verdict: B (with
  nuance). The original `@ton/mcp::wallet_connect` handoff doesn't exist
  — `@ton/mcp` is agentic-wallet-first (keys at `~/.config/ton/config.json`,
  no TonConnect tool). The workable composition is **filesystem-level**:
  `ton-mesh-harness-mcp` will read the same config file via `@ton/walletkit`,
  the lib `@ton/mcp` itself uses. `@ton/mcp` is NOT a runtime dep — it's
  a peer MCP server an agent may load alongside `ton-mesh-harness-mcp`.

### Changed

- **`docs/archive/v0.8/agent-native-pivot.md` rewritten** ("v0.9 plan — agent-native
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
  `src/cli.ts` C1 comment updated. README "v0.9 vision" section
  rewritten to "v0.8 vision (agent-surface track)" with a separate
  "v0.9 reserve" pointer.

### Out of scope (deferred to v0.8.0 GA — week 6)

- The MCP server itself (`src/mcp.ts`, dual `bin` entry).
- SDK extraction (`src/sdk/`).
- In-repo skill markdown at `skills/mesh-deploy.md`.
- `templates/.well-known/mcp.json` template.
- PR to `ton-org/skills`.
- The MCP-path run of the [V4] red-team test.

### Out of scope (deferred to v0.8.x or later)

- `mcp.ton.org` registry submission — no submission flow exists today.
- `mesh_status`, `mesh_redeploy`, `mesh_stop` MCP tools —
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
  and pinned in `docs/archive/v0.7/c1-design-notes.md`.
- **`src/daemon/rldp-http-proxy-installer.ts`** + **`-process.ts`**
  mirror the tonutils-storage installer / spawn pattern.
- **`scripts/probe-providers.cjs`** (C4): re-ran the storage-provider
  liveness probe under v0.7. Verdict: still **dormant** (top-8
  cheapest, zero `accept_storage_contract` ops in 30d). `--provider`
  stays disabled. Snapshot: `docs/archive/v0.7/provider-probe-2026-05-10.md`.
- **doctor extension** (C5.1): surfaces the rldp-http-proxy binary
  + the persisted site ADNL hex from `~/.ton-mesh/site-adnl.txt`.

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
> `docs/archive/v0.8/concept-update-2026-05-10.md`). C2 / C3 moved one slot down.

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
- npm `bin` map: dropped the leading `./` from `bin[ton-mesh-harness]`
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
- **Default backend swap**: the daemon `ton-mesh-harness` installs
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
  `docs/archive/v0.5/round-postmortem.md`); v0.7 will reintroduce provider
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
  `docs/archive/v0.6/sites-record-discovery.md`).
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
  with persistent session at `~/.ton-mesh/tonconnect.json`
  (`mode 0o600`); `validUntil` is now correctly Unix epoch seconds
  and `network: CHAIN.MAINNET` is set explicitly.
- Provider auto-select rejects scam-rate entries
  (`rate_per_mb_day > 10_000` filtered) and refuses requests over
  1 TON as a final safety cap.

### Docs
- Reframed README / dashboard around **self-host first** and the
  digital-resistance stack.
- `docs/archive/v0.5/round-postmortem.md`: detailed Round 1–7 mainnet soak
  results, the dormant provider economy finding, and the on-chain
  cost ledger.
- `docs/archive/v0.5/lane-b-self-generated-boc.md`: design + verification of
  the self-generated `op::offer_storage_contract` BOC route around
  the daemon CLI's `--max-span` uint8 bug.
- `docs/archive/v0.6/roadmap-draft.md`: v0.6 plan + B3.x design + B4 hand-off
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
  session at `~/.ton-mesh/tonconnect.json` with `0o600`
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
- `docs/archive/v0.5/round-postmortem.md` (Round 1–7 mainnet soak record)
- `docs/archive/v0.5/lane-b-self-generated-boc.md`
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
  in `docs/archive/v0.5/round-postmortem.md`.

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
