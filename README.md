# Sovereign Deploy Kit

> One-command CLI for the digital-resistance web: publish a static site to the TON Storage + TON DNS stack.

Aligned with TON Foundation's 2025 **digital-resistance stack** ([TON Proxy + ADNL Tunnel + Payment Network](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08); xssnick's [Resistance Tools](https://github.com/xssnick/TON-Torrent)). This kit uploads a static site to TON Storage as a bag, points a `.ton` domain at it via TON DNS, and seeds it from your own daemon (= your PC). The minimal toolkit for builders who need a **web that governments, Cloudflare, and hosting providers cannot take down** — like Tornado Cash / Uniswap UI.

```bash
npx ton-sovereign-deploy ./build/ --watch
```

```
📦 Uploading 47 files...
  ✓ index.html
  ✓ assets/main.js (1.2 MB)
  ✓ assets/style.css
  ... 44 more files

✅ TON Storage (ADNL):  ton://bag-a3f9c82e1b4d...
📦 Bag ID: a3f9c82e1b4d...

watching ./build/ — daemon stays alive to seed your bag.
Press Ctrl+C to stop seeding.
```

> **Read `--watch` as first-class.** Your site is alive on the network for as long as your machine runs the daemon. The 24/7 "via-provider" path (`--provider`) is implemented but **experimental** — the mainnet provider economy is currently dormant (details below). This mirrors TON Foundation's own approach: they self-host `foundation.ton`.

---

## Agent quickstart (v0.9.0)

This kit is designed to be invoked directly by AI agents. When an agent runtime gets a prompt like "deploy a static site to .ton", we *aim* for the agent to discover this kit via npm search + README + skill registry — but that's a hypothesis, validated empirically by the [V4 red-team test](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/26). If discovery misses, you can invoke explicitly:

**Three paths available in rc5**

```bash
# 1. CLI (TonConnect — human approval via phone wallet):
npx -y ton-sovereign-deploy ./dist --domain myprotocol.ton --json-output
```

```bash
# 2. CLI (Agentic — autonomous, signs locally from ~/.config/ton/config.json):
npx -y ton-sovereign-deploy ./dist --domain myprotocol.ton \
  --wallet-mode agentic --wallet-label main-mainnet --json-output
```

```jsonc
// 3. MCP server (since rc2; both TonConnect and Agentic paths complete DNS write end-to-end):
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    }
  }
}
// → tools/call sovereign_check_env → sovereign_deploy
```

`--json-output` emits one JSON line per event for easy agent parsing.

**MCP flow shipped in rc5**

```jsonc
// Add to your MCP client config:
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    }
    // optional: load @ton/mcp alongside so the agent can also manage wallets
    // "ton": { "command": "npx", "args": ["-y", "@ton/mcp@alpha"] }
  }
}
```

The agent calls `sovereign_check_env` → `sovereign_deploy` in order. `sovereign_deploy` runs the SDK end-to-end through `awaiting_signature → dns_signing → dns_confirmed → verifying` (both paths supported).

**Wallet modes** (since rc4 both paths complete DNS write end-to-end; rc5 makes them available from the CLI too):

- **`wallet: {kind: "tonconnect", connector}`** (default) — human approves via QR + phone wallet.
- **`wallet: {kind: "agentic", config_path?, wallet_label?}`** — autonomous, signs with a key in `~/.config/ton/config.json` (the file `@ton/mcp@alpha` manages). Broadcasts via `@ton/walletkit` → Toncenter v3. Supports BOTH wallet types in `@ton/mcp`'s schema:
   - **`type: "standard"`** — mnemonic / private_key direct sign. No extra install.
   - **`type: "agentic"`** — NFT-delegated operator key; signs via the agentic collection contract on behalf of `owner_address`. Requires the optional peer dependency: `npm install @ton/mcp@alpha`. The SDK lazy-loads it only when a `type: "agentic"` entry is selected, so TonConnect-only users don't pay the install cost.

**`dns_tx_hash`** (since rc4): both paths resolve the real on-chain tx hash via Toncenter v3's `transactionsByMessage` lookup. The lookup runs in parallel with DNS propagation polling — zero added latency on the happy path. Details: [`docs/v0.8/mcp-core-requirements.md`](docs/v0.8/mcp-core-requirements.md) §F2.

**Discoverability is a hypothesis.** README copy, npm keywords, the `.well-known/mcp.json` template, and the skill registry submission are all artefacts toward the hypothesis that an agent will find this kit organically. We validate that empirically with the [V4 red-team test](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/26). If discovery fails, we fix the artefacts and re-ship.

> **Note for agents:** `--watch` mode leaves the agent's host responsible for keeping the daemon alive. Short-lived agent sessions should pass `--no-watch` and rely on bag propagation completing out-of-band. **The MCP server rejects `keep_alive: true`** (daemon tracking is unimplemented) — if you need a keep-alive flow, use the CLI.

---

## Why this exists

DeFi front-ends have repeatedly been forced offline:

- **Tornado Cash** → US OFAC sanctions removed the front-end entirely.
- **Uniswap** → restricted front-end access for specific tokens.
- **1inch, Balancer, etc.** → geo-blocking, domain takedowns.

The shape is always the same: **the smart contract is alive but the website is dead.** The cause is also simple: they're served from ordinary servers with ordinary domains.

TON already has the infrastructure to fix this. Using it required specialist knowledge and complex setup. This tool reduces that to zero.

---

## How it works

### TON Storage (decentralized file storage)

- Stores files distributed across the blockchain network.
- Identified by content address (Bag ID) — the URL doesn't change unless the content does.
- No central host that can delete it; the content address never changes. It stays reachable for as long as at least one reachable node seeds the bag.

**Architecture:**
- Bags are accessible via the ADNL protocol (`ton://` URLs) — any TON Storage client can fetch a bag by its id.
- Propagation across the network can take minutes to hours.
- Public HTTP gateways resolve `.ton` domains (the on-chain DNS storage record), not raw bag ids — `ton.run/<bag_id>` returns 404. To open a bag in an ordinary browser you need a `.ton` domain pointing at it.
- Self-hosting (the default) means your bag is unreachable while your machine is offline — or while it sits behind NAT with no public IP, since downloaders can't reach it.

**Realistic hosting options:**
- **The primary option is running your own daemon continuously** (`--watch`, or `--daemon-mode service` to hand it to launchd/systemd). This is exactly how TON Foundation operates `foundation.ton`.
- **On a cloud VM with a public IP**: run the kit *as* a publicly-reachable seeder. Set `SOVEREIGN_ANNOUNCE_IP=<vm public ip>` and `SOVEREIGN_ANNOUNCE_PORT=<udp port>` (and open that UDP port in the VM firewall), then deploy with `--daemon-mode service`. The daemon then advertises a reachable address to the DHT so anyone can download the bag — without it a 1:1-NAT VM (GCP/AWS) auto-detects no public IP and silently runs download-only. A free GCP `e2-micro` is enough.
- **Behind NAT / no public IP**: `--tunnel-config` routes the daemon through an ADNL Tunnel pool (shipped in v0.6; bring-your-own pool — see [`docs/v0.6/byo-rldp-http-proxy.md`](docs/v0.6/byo-rldp-http-proxy.md)).
- A 24/7 escape hatch is the "storage provider contract" (`--provider`), implemented but **the mainnet provider economy is currently dormant** (Round 1–7 mainnet soak results: [`docs/archive/v0.5/round-postmortem.md`](docs/archive/v0.5/round-postmortem.md)) and gated off pending the payment-network real client ([#30](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/30)). Treat it as experimental.

### TON DNS (.ton domains)

- Register a human-readable domain like `myprotocol.ton` directly on chain.
- Cannot be seized; updates only with your signature.
- Accessible via TON Proxy (v0.2).

### Data flow

```
npx ton-sovereign-deploy ./build/
         │
         ├─→ Validate ./build/ (auto-detects dist/ | build/ | out/ | public/)
         │
         ├─→ Check ~/.ton-sovereign/bin/storage-daemon
         │     If missing, auto-download from official TON release (first run only, ~30s)
         │
         ├─→ Send distributed via storage-daemon to the TON network
         │     BitTorrent-style chunking + Merkle-tree hashing
         │
         └─→ Receive Bag ID → display result
```

---

## Roadmap

### v0.1 — TON Storage upload (Day 1–5) ✅

```bash
npx ton-sovereign-deploy ./build/
# → bag ID + ton:// URL (ADNL access)
```

- ✅ No wallet needed for self-hosting.
- ✅ Zero setup (`storage-daemon` is auto-downloaded).
- ✅ Auto-detects Vite / Next.js export / CRA build output.
- ✅ macOS/Linux/Windows.

**Current limits:**
- ⚠️ Public HTTP gateways serve `.ton` domains, not raw bag ids — `ton.run/<bag_id>` returns 404. Browser viewing needs a `.ton` domain + a reachable seeder.
- ⚠️ Self-hosting makes the site unreachable when your PC is offline.
- ⚠️ 24/7 hosting requires a storage-provider contract (paid).

### v0.2 — .ton DNS registration (Day 6–10) ✅

```bash
npx ton-sovereign-deploy ./build/ --domain myprotocol.ton
# → TON Connect wallet signature
# → myprotocol.ton becomes resolvable
```

- ✅ TON Connect deep-link generation.
- ✅ Terminal QR code rendering.
- ✅ On-chain DNS-record polling confirmation.
- ✅ Domain-ownership check via TONAPI.

### v0.3 — polish ✅

```bash
npx ton-sovereign-deploy ./build/
# → bag ID + ton:// URL (ADNL access)
# → propagation verification
# → GitHub Actions + Windows + watch mode
```

- ✅ Bag status check via TONAPI.io (`verifyBagOnNetwork`).
- ✅ GitHub Actions support (`--ci-mode`, `--json-output`).
- ✅ Windows support (win32-x64, win32-arm64, win32-ia32).
- ✅ `--watch` mode (auto-redeploy on file change; keeps the daemon running to accelerate propagation).

**Note:** `verify` times out at 60 s, but real propagation can take hours.

---

## Comparison

| Tool | Decentralized? | One command? | .ton DNS? | CI/CD? | Windows? |
|--------|-------|-----------|-----------|---------|---------|
| Vercel / Netlify | No (centralized) | Yes | No | Yes | Yes |
| IPFS / Fleek | Yes | Yes | No (.eth only) | Yes | Yes |
| TON CLI (manual) | Yes | No | Manual config | No | No |
| **Sovereign Deploy Kit** | **Yes** | **Yes** | **Yes (v0.2)** | **Yes (v0.3)** | **Yes (v0.3)** |

Direct competitors: none.

---

## Target users

1. **DeFi protocol developers** — eliminate front-end takedown risk.
2. **TON ecosystem developers** — easily stand up a .ton site.
3. **Censorship-exposed apps in general** — journalism, privacy tools, DAO front-ends.

---

## Development status

**Status:** v0.9.0 (2026-06-21) — first public GA: the v0.8 agent-surface track bundled with the v0.9 reserve. Across all rounds: **4 BLOCKERs + 22 MAJORs + 3 MINORs + 4 NITs + 1 LOW resolved**. Notable security-class fixes: 3 daemon-binary SHA-256 supply-chain integrity (all installers), TonConnect SDK signed-BOC debug-log leak (r7-8), wallet-key symlink redirect (r7-8), agentic config wallet-strictness (r4-5), daemon orphan-on-signal (r9-10), HTTP response body cap (r11). MCP server (3 tools: `sovereign_check_env` / `sovereign_deploy` / `sovereign_status`), SDK external entry, NFT-delegated agentic signing (optional `@ton/mcp` peer), structured stderr logging (`DEBUG=sovereign:*`), tarball-install smoke in CI. Published automatically via OIDC trusted publishing; the V4 agency-transfer red-team is deferred to v0.9.x (runs post-publish).

### Released
- **v0.1** ✅ — TON Storage upload.
- **v0.2** ✅ — .ton DNS registration (`storage` record).
- **v0.3** ✅ — polish (verification, GitHub Actions, Windows, watch mode).
- **v0.4** ✅ — `--provider` storage-provider contracts (mainnet provider economy is dormant; details: [`docs/archive/v0.5/round-postmortem.md`](docs/archive/v0.5/round-postmortem.md)).
- **v0.5** ✅ — TonConnect SDK integration / hand-rolled BOC / defense-in-depth / `op::close_contract` recovery route.
- **v0.6** ✅ — `sites` (ADNL Address) record support / ADNL Tunnel client integration / self-host-first README / Payment Network abstraction.
- **v0.7** ✅ — `--site-auto` for rldp-http-proxy auto-spawn + self-minted ADNL identity.
- **v0.8.0-rc1** ✅ (2026-05-10) — agent-surface track's first-useful flag-plant: README "Agent quickstart" + npm keywords + doc rescope.
- **v0.8.0-rc2** ✅ (2026-05-11) — MCP server (`ton-sovereign-mcp`), SDK extraction (`src/sdk/`), SDK DNS write (TonConnect), ESLint v9 no-console gate, GitHub Actions CI, project-wide refactor (-290 LOC).
- **v0.8.0-rc3** ✅ (2026-05-11) — SDK agentic DNS write (`wallet.kind: "agentic"`): `~/.config/ton/config.json` protected-file (\x8aTM\x01 AES-256-GCM) decode + sign via `@ton/walletkit` + broadcast via Toncenter v3.
- **v0.8.0-rc4** ✅ (2026-05-11) — real on-chain `dns_tx_hash` resolution: TonConnect path via TEP-467 normalized hash, agentic path via Toncenter `sendBoc` return. Runs in parallel with DNS propagation polling so the happy path adds zero latency.
- **v0.8.0-rc5** ✅ (2026-05-11) — CLI `--wallet-mode agentic` makes autonomous signing available from the terminal. Fixed a Node 22+ `@ton/walletkit` runtime regression (`ERR_UNSUPPORTED_DIR_IMPORT`) via `noExternal`. Added `scripts/cli-smoke.cjs` to CI so the regression class can't recur.
- **v0.8.0-rc6** ✅ (2026-05-12) — final feature snapshot before GA. Adds: NFT-delegated agentic signing (`@ton/mcp` lazy peer, `AgenticWalletAdapter` integration), `sovereign_status` MCP tool (one-shot bag-propagation snapshot with `bag_unavailable_reason: not_found | network_error`), SDK external entry (`import { deploy, status, checkEnv } from 'ton-sovereign-deploy'`), structured logger (`DEBUG=sovereign:*`), GA release script (`scripts/release.sh`), 4 smoke harnesses (CLI / MCP / SDK / tarball-install) covering packaging regressions. Two Codex multi-model review rounds resolved 1 BLOCKER + 4 MAJORs.
- **v0.8.0-rc7** ✅ (2026-05-12) — Codex pre-GA review polish. Removed dead `daemon_backend` / `skip_verify` fields from `DeployOptionsSchema`; `checkEnv()` now throws `SdkError(ERR_INVALID_INPUT)` instead of raw `ZodError`; `deploy()` cascades `inner.return()` to the inner DNS generator on consumer break (cleanup leak fix); `DeployInput` / `DeployControl` types now exported from public barrel; `mcp.ts` dedup refactor removed redundant double-parse + dead `ZodError` catches. Round 3 resolved 5 MAJORs + 1 MINOR + 1 refactor (-12 lines).
- **v0.8.0-rc8** ✅ (2026-05-12) — Codex rounds 4 + 5 + 6 closure. Round 4 caught 1 NEW MAJOR introduced by the rc7 mcp.ts dedup refactor (MCP wallet-strictness defense-in-depth dropped) + 1 NIT (`zod_issues` diagnostics regression). Round 5 verified + flagged 2 NITs (no MCP automated regression test, stale comment). Round 6 = 0 findings on the SDK public surface. MCP smoke now has an `id=4 tools/call sovereign_deploy { wallet: "Tonkeeper" }` regression gate.
- **v0.8.0-rc9** ✅ (2026-05-12) — Codex rounds 7-10: audit of v0.8 modules NOT covered by rounds 1-6 (keyring, TonConnect bridge, daemon process lifecycle, legacy DNS helpers, CLI signal handlers). Round 7 caught 1 BLOCKER (TonConnect SDK logs signed BOCs via console.debug) + 4 MAJORs + 1 MINOR. Rounds 8-10 verified each fix and caught 2 more BLOCKERs (concurrent silence race, daemon orphan-on-signal) + 3 MAJORs (Atomics.wait main-thread block, O_NOFOLLOW POSIX-only, signal-path drain miss) + 1 LOW (keyring parent-dir lstat). All resolved. Cumulative rc8→rc9: **3 BLOCKERs + 7 MAJORs + 1 MINOR + 1 LOW** across security-sensitive modules (wallet bridge + daemon process + key storage).
- **v0.8.0-rc10** ✅ (2026-05-12) — Codex r11 self-audit (external review daily-cap blocked) of supply-chain + remaining unreviewed lifecycle code. Added SHA-256 integrity check to daemon binary downloads (10 hashes pinned for tonutils-storage v1.4.1 + rldp-http-proxy v2026.04-1 × 5 platforms each). Applied the r7-r10 daemon-lifecycle pattern (mkdtempSync + async exit-listener cleanup + SIGKILL escalation) to `rldp-http-proxy-process.ts` and legacy `daemon/process.ts`. Added symlink defence to `wallet/FSStorage.ts` (TonConnect session JSON) mirroring keyring.ts. Added 8 MiB default body cap to `utils/http.ts`. Cumulative rc9→rc10: **1 BLOCKER-class + 5 MAJORs**. Also: CHANGELOG verbose-round sections compressed; tonconnect-dispose + installer-sha256 tests deduped (-110 net lines, same coverage).
- **v0.8.0-rc11** ✅ (2026-05-12) — Path C polish. Closed the last SHA-256 gap: legacy `--daemon-backend=ton-core` installer (`src/daemon/installer.ts`) now verifies storage-daemon + storage-daemon-cli against 10 pinned hashes for v2026.02-1. **Pre-existing MAJOR caught during pinning**: `src/daemon/platform.ts::getBinaryName` returned `storage-daemon-win-x86-64.exe` but the release ships `storage-daemon.exe` — Windows legacy ton-core installs were 100% broken via curl 404. Fixed. Also: `RLDP_HTTP_PROXY_SHA256` env-var-pin closes the version-override TOFU window; inner-generator cleanup regression test (`test/sdk-deploy-inner-cleanup.test.ts`) deep-mocks daemon+dns to exercise the Codex r3 BLOCKER fix on both abort and for-await-break paths. Cumulative rc10→rc11: 1 MAJOR + 3 polish items.
- **v0.9.0** ✅ (2026-06-21) — first public GA. Bundles the v0.8 agent-surface track with the v0.9 reserve (HTTP transport #33, provenance #34, service-mode daemons #37, testnet-via-MCP, examples #36) and ships OIDC trusted publishing (`.github/workflows/publish.yml`).

### Pending (post-GA)
- **[V4] #26** — Agency-transfer red-team test (fresh agent session, manual; runs post-publish).
- **[#35]** — Cross-agent compatibility tests (Cursor / Codex / Continue / Aider).
- **[C2 / C3] #29 / #30** — NAT traversal + Payment Network real-client (upstream-blocked).

### Documentation

Full map + Current/Reference/Historical classification: **[`docs/README.md`](docs/README.md)**. Highlights:

- **MCP server spec**: [`docs/v0.8/mcp-core-requirements.md`](docs/v0.8/mcp-core-requirements.md) — the authoritative F1–F5/NF contract.
- **Agentic CLI usage**: [`docs/v0.8/agentic-cli-usage.md`](docs/v0.8/agentic-cli-usage.md) — `--wallet-mode agentic` prerequisites / selectors / CI.
- **Agent stack compose**: [`docs/v0.8/agent-stack-compose.md`](docs/v0.8/agent-stack-compose.md) — wiring `ton-sovereign-mcp` + `@ton/mcp` for full agentic flows.
- **Release checklist**: [`docs/v0.9/release-checklist.md`](docs/v0.9/release-checklist.md) — the GA cut ritual (tag push → auto-publish) + rollback.
- **v0.9 features**: [HTTP transport](docs/v0.9/mcp-http-transport.md) · [provenance](docs/v0.9/provenance.md) · [service-mode daemons](docs/v0.9/daemon-service-mode.md) · [cross-agent compat](docs/v0.9/agent-compat.md).
- **Design history** (point-in-time, not current): the agent-native pivot — [`agent-native-pivot.md`](docs/archive/v0.8/agent-native-pivot.md), [`concept-update-2026-05-10.md`](docs/archive/v0.8/concept-update-2026-05-10.md), [`at-mcp-probe.md`](docs/archive/v0.8/at-mcp-probe.md).

### v0.9 reserve
**Shipped in v0.9.0** (see CHANGELOG `[0.9.0]`): MCP HTTP transport (`--http`), testnet on the tonutils/MCP path, signed provenance manifest (`.well-known/ton-deploy.json`), Vite/Next/Astro examples, daemon-hash bump helper, MCP cancel-cleanup test, launchd/systemd service-mode daemons (#37).
**Still reserved** — both blocked on upstream C++ binaries maturing: C2 NAT traversal (`adnl-tunnel-client`, #29) + C3 Payment Network real-client (#30). Details: [`docs/archive/v0.7/roadmap-draft.md`](docs/archive/v0.7/roadmap-draft.md) §C2 / §C3.

**Release:** https://github.com/Masashi-Ono0611/sovereign-deploy-kit

**npm:**
- `npm install -g ton-sovereign-deploy` — CLI binary.
- `npx -y --package ton-sovereign-deploy ton-sovereign-mcp` — MCP server.
- `import { deploy, checkEnv, status } from 'ton-sovereign-deploy'` — programmatic SDK (CJS / TS types shipped).

---

## When things go wrong — fund recovery

If you signed with `--provider` and the provider never issued `accept_storage_contract`, the funds parked in the storage contract are recoverable by sending `op::close_contract` (0x79f937ea) yourself. A mainnet-proven script ships with the kit:

```bash
node scripts/close-storage-contract.cjs <storage-contract-address>
```

[Details and field-verified logs](docs/archive/v0.5/round-postmortem.md).

---

## CI/CD integration (v0.3)

### Automatic deploy via GitHub Actions

`git push` is the only step; the rest deploys to TON Storage automatically.

**Two templates:**

| Template | Scope | DNS write |
|---|---|---|
| `templates/github-workflow.yml` | bag upload only | no |
| `templates/github-workflow-agentic.yml` | bag + `.ton` DNS write (autonomous signing) | yes |

**Setup (bag only):**

```bash
mkdir -p .github/workflows
cp node_modules/ton-sovereign-deploy/templates/github-workflow.yml \
   .github/workflows/deploy.yml
git add .github/workflows/deploy.yml
git commit -m "Add TON Storage deployment"
git push origin main
```

**Setup (agentic — bag + DNS):**

Full walkthrough: [`docs/v0.8/agentic-cli-usage.md`](docs/v0.8/agentic-cli-usage.md). Prerequisites:

1. Create a wallet via `npx -y @ton/mcp@alpha agentic_import_wallet`.
2. Save the contents of `~/.config/ton/config.json` as the GH secret `TON_AGENTIC_CONFIG` (encrypted blob as-is — `@ton/mcp`'s protected-file format bundles the AES key with the ciphertext, so it is **not** passphrase-protected; treat the secret like a plaintext private key).
3. Register your domain as the GH variable `TON_DOMAIN`.
4. Copy the template:

```bash
mkdir -p .github/workflows
cp node_modules/ton-sovereign-deploy/templates/github-workflow-agentic.yml \
   .github/workflows/deploy.yml
git add .github/workflows/deploy.yml
git commit -m "Add autonomous TON deployment"
git push origin main
```

**Shared workflow features:**

- Auto-deploy on push to `main`.
- `--ci-mode` disables spinners (cleaner logs).
- `--json-output` exposes `bag_id` for downstream steps.
- bag-only template only: comments the bag ID back on the PR.
- agentic template only: writes the real on-chain `dns_tx_hash` + tonviewer link into the GH Step Summary.

**Example output:**

```
🚀 Deployed to TON Storage
Bag ID: a3f9c82e1b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
ton://a3f9c82e...
Bag may take minutes-hours to propagate through network
```

**Note:** In CI, `verify` failure is expected — the bag is created, but propagation takes time. Watch mode is not usable in CI.

---

## Using ton:// URLs

### What ton:// URLs are

`ton://` URLs are content addresses on TON's ADNL protocol. Once created, a bag is immutable and persists on the network.

### Access methods

**1. Via Ton HTTP Proxy (recommended)**

Run Ton HTTP Proxy locally and visit from a browser:

```bash
# Install Ton HTTP Proxy
npm install -g @ton-community/http-proxy

# Start the proxy
ton-http-proxy

# Open in browser
open http://localhost:8080/ton://bag-a3f9c82e1b4d...
```

**2. If storage-daemon is running**

When you're using watch mode in this kit, the bag is reachable directly from your PC:

```bash
# Terminal 1: deploy in watch mode
npx ton-sovereign-deploy ./build/ --watch

# Terminal 2: hit the bag
# The daemon listens on its ADNL port
```

**3. Public access**

Any TON Storage client can fetch the bag by id once it has propagated (minutes to hours) — provided a reachable node is seeding it.

Browser access is different: public HTTP gateways resolve `.ton` domains, not raw bag ids (`ton.run/<bag_id>` returns 404). To open it in a browser, attach a `.ton` domain (`--domain`) and keep a reachable seeder up.

For always-on hosting, run your own daemon continuously (`--daemon-mode service`) or use a storage-provider contract.

### Speeding up propagation with watch mode

```bash
# Watch for file changes and keep the daemon running
npx ton-sovereign-deploy ./build/ --watch

# Because the daemon stays alive, the network finds your bag faster.
# Your PC seeds the bag until Ctrl+C.
```

### Propagation-time expectations

- **Fastest:** a few minutes (when active nodes are available).
- **Typical:** 30 minutes – 2 hours.
- **Worst:** several hours (network-state dependent).

The `verify` command waits 60 s — that's "minimum viable verification." Reality often takes longer.

---

## CLI options

### Basics

```bash
ton-sovereign-deploy [build-dir] [options]
```

| Option | Description |
|-----------|------|
| `[build-dir]` | Build directory (auto-detected if omitted). |
| `--testnet` | Use TON testnet. |
| `--desc <text>` | Bag description. |
| `--domain <domain>` | Register under a .ton domain (v0.2). |
| `--wallet-mode <mode>` | Signing mode: `tonconnect` (default, QR) or `agentic` (autonomous, reads `~/.config/ton/config.json`). v0.8+ |
| `--wallet-label <label>` | Selector for agentic mode (id / name / address). Defaults to `active_wallet_id`. v0.8+ |
| `--wallet-config <path>` | Override path for the agentic config file. v0.8+ |
| `--no-provenance` | Skip emitting the `.well-known/ton-deploy.json` provenance manifest into the bag (v0.9). |
| `--ci-mode` | Disable spinners for CI environments (v0.3). |
| `--json-output` | Emit JSON (v0.3). When `--ci-mode` or `--json-output` is set, `--watch` is **automatically disabled** so the process exits after upload (prevents CI hang). |
| `--watch` | Watch for file changes and auto-redeploy (**default in interactive runs since v0.6**). |
| `--no-watch` | Disable watch mode; exit after upload (CI / one-shot). v0.6+ |
| `--debounce <ms>` | Watch-mode debounce delay (default 2000 ms). |
| `--daemon-backend <name>` | Daemon backend: `tonutils` (default, v0.6+; supports `--testnet` since v0.9) or `ton-core` (C++ legacy; opt-in, needed only for `--provider`). |
| `--tunnel-config <path>` | Path to a `nodes-pool.json` for ADNL Tunnel (v0.6+, tonutils backend only). Used for NAT traversal. No public pools exist yet — **bring-your-own-pool** (obtain from the operator). |
| `--site-adnl <hex>` | 64-hex ADNL identity to publish as the `dns_adnl_address` (`site` record, magic `0xad01`) under `--domain` (v0.6+ B5). **Bring-your-own rldp-http-proxy** — pass the ADNL hash of an already-running proxy, or use `--site-auto` to auto-spawn one (shipped v0.7). With `--domain`, bundles the storage and site records into **one TonConnect signature**. Setup: [`docs/v0.6/byo-rldp-http-proxy.md`](docs/v0.6/byo-rldp-http-proxy.md). |
| `--provider [address]` | **Disabled regardless of backend** (mainnet provider economy is dormant). The v0.5 working code stays in the tree; re-enabling waits on the payment-network real client ([#30](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/30), v0.9-reserve, upstream-blocked). Details: [`docs/archive/v0.5/round-postmortem.md`](docs/archive/v0.5/round-postmortem.md). |
| `--daemon-mode <mode>` | Daemon ownership: `detached` (default) · `embedded` (one-shot) · `service` (hand to launchd/systemd, keeps seeding after exit). v0.9 ([#37](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/37)). |
| `--span <seconds>` | Provider-contract span in seconds (default 86400 = 1 day; max 4294967295). v0.5+ |
| `--wallet <name>` | Preferred wallet for sign requests (substring match; default "Tonkeeper"). v0.5+ |
| `--skip-verify` | Skip bag-access verification (propagation can be slow). |

Since v0.6 you can also run `ton-sovereign-deploy doctor` for an environment check (daemon binaries, TONAPI / TonConnect manifest reachability, wallet pairing state). Useful when troubleshooting before a deploy.

### CI/CD options

```bash
# JSON output (easy to parse from scripts)
ton-sovereign-deploy ./build/ --json-output
# → {"bag_id":"...","ton_url":"ton://...","fallback_url":"https://..."}

# CI mode (cleaner logs in GitHub Actions etc.)
ton-sovereign-deploy ./build/ --ci-mode --json-output
```

### Debug logging (v0.8.x+)

Set the `DEBUG` env var to surface structured logs from the SDK. Format matches `debug.js` conventions:

```bash
# Everything
DEBUG="*" ton-sovereign-deploy ./build/ --domain x.ton

# SDK only
DEBUG="sovereign:*" ton-sovereign-deploy ./build/ --domain x.ton

# Just the deploy + DNS resolve paths
DEBUG="sovereign:deploy,sovereign:resolve-tx" ton-sovereign-deploy ./build/

# Wildcard with exclusion
DEBUG="*,-sovereign:resolve-tx" ton-sovereign-deploy ./build/
```

Available namespaces: `sovereign:deploy`, `sovereign:agentic-sign`, `sovereign:resolve-tx`. Output is always on **stderr** so `--json-output` stdout stays parseable.

### Backend choice (v0.6+)

From v0.6 onward, the **bundled daemon is `tonutils-storage` (xssnick / Go)** by default — the same daemon used by [TON-Torrent](https://github.com/xssnick/TON-Torrent) and the [Resistance Tools](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08) stack.

```bash
# Default = tonutils backend (Go)
ton-sovereign-deploy ./build/

# Legacy TON Core C++ daemon (opt-in; needed only for --provider)
ton-sovereign-deploy ./build/ --daemon-backend=ton-core
```

| Feature | tonutils (default) | ton-core (legacy) |
|---|---|---|
| Bag upload + seed | ✅ | ✅ |
| `--watch` (auto-redeploy) | ✅ (v0.6 step B2.x) | ✅ |
| `--tunnel-config` (ADNL Tunnel) | ✅ (v0.6 step B3.x) | ❌ (no tunnel client in the C++ daemon) |
| `--testnet` | ✅ (daemon `--network-config`; v0.9) | ✅ |
| `--provider` | ❌ (v0.6 disables the provider path) | ⚠ experimental (mainnet provider economy is dormant) |

#### ADNL Tunnel — NAT traversal

To seed a bag from an environment **without a public IP** (e.g. a home Wi-Fi), route through an ADNL Tunnel intermediate node ([TON Foundation 2025-03 announcement](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08)).

```bash
# Pass a nodes-pool.json received from your operator
ton-sovereign-deploy ./build/ --tunnel-config ./tunnel-pool.json
```

**Current constraint**: there is no public community-run pool, so `nodes-pool.json` must be **obtained from a tunnel operator** (same operating model as [xssnick/TON-Torrent](https://github.com/xssnick/TON-Torrent)). Get one from an operator's community / Telegram channel. v0.6 wires the CLI surface and config plumbing; default-pool curation or running our own pool is a v0.7+ decision.

### Watch mode (default since v0.6)

**Since v0.6, `--watch` is the default behavior for interactive runs.** With no arguments, the daemon stays resident, watches for file changes, and auto-redeploys. Supported on both backends (tonutils + ton-core). When the new build has identical content the bag id is unchanged — the watch loop logs a `↻ no-op` line. With `--domain`, the DNS record continues to point at the *initial* bag id (re-running the DNS sign on every change would require a wallet prompt each time); stop watch mode and re-run with `--domain` when you want to publish the updated bag.

```bash
# Default behavior: watch mode (= self-host first)
ton-sovereign-deploy ./build/

# One-shot deploy + exit (for CI)
ton-sovereign-deploy ./build/ --no-watch

# 3-second debounce (for large projects)
ton-sovereign-deploy ./build/ --debounce 3000
```

**Watch-mode behavior:**
- Auto-redeploys when a file changes.
- Coalesces consecutive changes into one redeploy (debounced).
- **Keeps the daemon resident and seeds via ADNL** ← this *is* "self-host."
- Stop with Ctrl+C.

**Important:** Shutting down your PC stops the seed, making the bag unreachable. For continuous hosting in practice:
- Don't let your laptop sleep (most basic).
- `--daemon-mode service` hands the daemon to launchd/systemd so it keeps seeding after the CLI exits + across reboots ([daemon-service-mode](docs/v0.9/daemon-service-mode.md)).
- Behind NAT / no public IP: route through an ADNL Tunnel pool with `--tunnel-config` (v0.6+).
- Run a 24/7 daemon on a VPS / Raspberry Pi / NAS.
- One-shot deploy with `--no-watch`, then seed the bag from a separate always-on host.

---

## System requirements

### Supported OS

- **macOS** — 10.15+ (Catalina or newer).
- **Linux** — x86_64, ARM64.
- **Windows** — 10/11 (x64, ARM64). v0.3+

### System requirements

- **Node.js** 18+ (CI matrix covers 18/20/22).
- **PowerShell** 3.0+ (Windows only; ships with the OS).
- **Network** — TON node connectivity.

### Windows-specific notes

**First run:**
- PowerShell downloads `storage-daemon-win-x86-64.exe`.
- Windows Defender or other AVs may flag it.
  - Choose "Allow" or add an exclusion.
  - The file is fetched from the official TON GitHub release.

**WSL (Windows Subsystem for Linux):**
- WSL uses the Linux binaries.
- WSL2 recommended (better networking).

**Path length:**
- Windows defaults to a 260-character path limit.
- `~\.ton-sovereign\` is short enough that this rarely matters.
- Enable long paths if your project path is large.

## Security

The kit signs transactions on the user's behalf (CLI `--wallet-mode agentic`,
MCP `sovereign_deploy` with `wallet.kind: "agentic"`). Threat model + the
private vulnerability disclosure address are in [`SECURITY.md`](SECURITY.md).
