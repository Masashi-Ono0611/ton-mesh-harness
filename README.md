# Sovereign Deploy Kit

> One-command CLI to publish a static site to the TON Storage + TON DNS stack — self-host first, agent-callable.

Aligned with TON Foundation's [digital-resistance stack](https://telegra.ph/TON-Proxy-Introducing-optional-traffic-micro-payments-and-privacy-via-garlic-routing-03-08). This kit uploads a static site to TON Storage as a bag, points a `.ton` domain at it via TON DNS, and seeds it from your own daemon. The minimal toolkit for builders who need a **web that governments, Cloudflare, and hosting providers cannot take down** — like Tornado Cash / Uniswap UI.

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

> **`--watch` is first-class.** Your site is alive on the network for as long as your machine runs the daemon. The 24/7 "via-provider" path (`--provider`) is implemented but **experimental** — the mainnet provider economy is currently dormant. This mirrors TON Foundation's own approach: they self-host `foundation.ton`.

---

## Why this exists

DeFi front-ends have repeatedly been forced offline:

- **Tornado Cash** — US OFAC sanctions removed the front-end entirely.
- **Uniswap** — restricted front-end access for specific tokens.
- **1inch, Balancer, etc.** — geo-blocking, domain takedowns.

The shape is always the same: **the smart contract is alive but the website is dead.** The cause is simple: they're served from ordinary servers with ordinary domains.

TON already has the infrastructure to fix this. Using it required specialist knowledge and complex setup. This tool reduces that to zero.

---

## Status

**Latest: v0.10.0** — CLI + MCP server + SDK on one deploy contract, published automatically via OIDC trusted publishing. See [CHANGELOG](CHANGELOG.md) for the full history.

**Not yet shipped (upstream-blocked):** NAT traversal [#29](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/29), Payment Network real client [#30](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/30).

### Install

```bash
# CLI
npm install -g ton-sovereign-deploy

# MCP server (add to your MCP client config — see "Agents & MCP" below)
npx -y --package ton-sovereign-deploy ton-sovereign-mcp

# SDK
import { deploy, checkEnv, status } from 'ton-sovereign-deploy'
```

---

## How it works

### TON Storage (decentralized file storage)

- Stores files distributed across the blockchain network.
- Identified by content address (Bag ID) — the URL never changes unless the content does.
- No central host that can delete it. The content address is immutable, but the site stays reachable **only while at least one publicly-reachable node seeds the bag**.

**Important hosting realities:**
- Public HTTP gateways resolve `.ton` domains (the on-chain DNS storage record), **not** raw bag ids — `ton.run/<bag_id>` returns 404. To open the site in a browser you need a `.ton` domain pointing at it.
- Self-hosting means the bag is unreachable while your machine is offline, or while it sits behind NAT with no public IP, since downloaders cannot reach it.

**Realistic hosting options:**

- **Run your own daemon continuously** (`--watch`, or `--daemon-mode service` to hand it to launchd/systemd). This is exactly how TON Foundation operates `foundation.ton`.
- **On a cloud VM with a public IP:** run the kit as a publicly-reachable seeder. Pass `--announce-ip <vm public ip> --announce-port <udp port>` (or the `SOVEREIGN_ANNOUNCE_IP` / `SOVEREIGN_ANNOUNCE_PORT` env vars), open that UDP port in the firewall, and deploy with `--daemon-mode service`. The daemon advertises a reachable address to the DHT. On deploy the CLI reports whether the node is actually reachable (`✓ Publicly reachable` vs `⚠ Download-only`). A free GCP `e2-micro` is enough.
- **Behind NAT / no public IP:** `--tunnel-config` routes the daemon through an ADNL Tunnel pool (v0.6+; bring-your-own — see [`docs/v0.6/byo-rldp-http-proxy.md`](docs/v0.6/byo-rldp-http-proxy.md)).
- **Storage-provider contract** (`--provider`) is implemented but the mainnet provider economy is currently dormant and gated off pending the payment-network real client ([#30](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/30)). Treat it as experimental.

### TON DNS (.ton domains)

- Register a human-readable domain like `myprotocol.ton` directly on chain.
- Cannot be seized; updates only with your signature.
- Accessible via TON Proxy.

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

## Comparison

| Tool | Decentralized? | One command? | .ton DNS? | CI/CD? | Windows? |
|------|---------------|-------------|----------|--------|---------|
| Vercel / Netlify | No (centralized) | Yes | No | Yes | Yes |
| IPFS / Fleek | Yes | Yes | No (.eth only) | Yes | Yes |
| TON CLI (manual) | Yes | No | Manual config | No | No |
| **Sovereign Deploy Kit** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |

Direct competitors: none.

---

## Target users

1. **DeFi protocol developers** — eliminate front-end takedown risk.
2. **TON ecosystem developers** — easily stand up a .ton site.
3. **Censorship-exposed apps in general** — journalism, privacy tools, DAO front-ends.

---

## Agents & MCP

The kit is designed to be invoked directly by AI agents via three paths:

```bash
# 1. CLI — human approves via QR + phone wallet (TonConnect):
npx -y ton-sovereign-deploy ./dist --domain myprotocol.ton --json-output
```

```bash
# 2. CLI — autonomous, signs locally from ~/.config/ton/config.json (agentic):
npx -y ton-sovereign-deploy ./dist --domain myprotocol.ton \
  --wallet-mode agentic --wallet-label main-mainnet --json-output
```

```jsonc
// 3. MCP server — add to your MCP client config:
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    }
    // Optional: load @ton/mcp alongside for agentic wallet management:
    // "ton": { "command": "npx", "args": ["-y", "@ton/mcp@alpha"] }
  }
}
// → tools/call sovereign_check_env → sovereign_deploy
```

`--json-output` emits one JSON line per event for agent parsing.

### MCP tools

| Tool | What |
|---|---|
| `sovereign_check_env` | Check environment: daemon binaries, wallet config, connectivity |
| `sovereign_deploy` | Full deploy: bag upload + optional `.ton` DNS write |
| `sovereign_status` | One-shot bag propagation snapshot (use after a `--no-watch` deploy) |

The agent calls `sovereign_check_env` → `sovereign_deploy`. `sovereign_deploy` runs the SDK end-to-end through `awaiting_signature → dns_signing → dns_confirmed → verifying`.

### Wallet modes

- **`wallet: {kind: "tonconnect"}`** (default) — human approves via QR + phone wallet.
- **`wallet: {kind: "agentic", config_path?, wallet_label?}`** — autonomous, signs with a key in `~/.config/ton/config.json` (the file `@ton/mcp@alpha` manages). Broadcasts via `@ton/walletkit` → Toncenter v3. Supports two wallet types:
  - **`type: "standard"`** — mnemonic / private-key direct sign. No extra install.
  - **`type: "agentic"`** — NFT-delegated operator key; signs via the agentic collection contract on behalf of `owner_address`. Requires the optional peer dependency `@ton/mcp@alpha`. The SDK lazy-loads it only when a `type: "agentic"` entry is selected, so TonConnect-only users don't pay the install cost.

**`dns_tx_hash`:** both paths resolve the real on-chain tx hash via Toncenter v3's `transactionsByMessage` lookup, in parallel with DNS propagation polling — zero added latency on the happy path.

> **Note for agents:** `--watch` mode leaves the agent's host responsible for keeping the daemon alive. Short-lived agent sessions should pass `--no-watch` and use `sovereign_status` to poll propagation later. **The MCP server rejects `keep_alive: true`** — use the CLI if you need a keep-alive flow.

---

## CI/CD integration

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
git add .github/workflows/deploy.yml && git commit -m "Add TON Storage deployment" && git push
```

**Setup (agentic — bag + DNS):** full walkthrough at [`docs/v0.8/agentic-cli-usage.md`](docs/v0.8/agentic-cli-usage.md). Prerequisites:

1. Create a wallet: `npx -y @ton/mcp@alpha agentic_import_wallet`.
2. Add GH secret `TON_AGENTIC_CONFIG` = contents of `~/.config/ton/config.json` (treat like a plaintext private key).
3. Add GH variable `TON_DOMAIN` = your domain.
4. Copy `templates/github-workflow-agentic.yml` to `.github/workflows/deploy.yml` and push.

**Both templates:** auto-deploy on `main` push · `--ci-mode` for clean logs · `--json-output` exposes `bag_id` · agentic template writes the real on-chain `dns_tx_hash` + tonviewer link into the GH Step Summary.

```
🚀 Deployed to TON Storage
Bag ID: a3f9c82e1b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
ton://a3f9c82e...
Bag may take minutes-hours to propagate through network
```

---

## Using ton:// URLs

`ton://` URLs are content addresses on TON's ADNL protocol. A bag is immutable once created and persists on the network as long as a reachable node seeds it.

### Access methods

**1. Via Ton HTTP Proxy (recommended for browser access)**

```bash
npm install -g @ton-community/http-proxy
ton-http-proxy
open http://localhost:8080/ton://bag-a3f9c82e1b4d...
```

**2. Any TON Storage client**

Any TON Storage client can fetch the bag by id once it has propagated (minutes to hours) — provided a reachable node is seeding it. Browser access requires a `.ton` domain: public HTTP gateways resolve `.ton` domains, not raw bag ids (`ton.run/<bag_id>` returns 404). To open the site in a browser, attach a `.ton` domain (`--domain`) and keep a reachable seeder up.

### Propagation expectations

- **Fastest:** a few minutes (when active nodes are available).
- **Typical:** 30 minutes – 2 hours.
- **Worst:** several hours (network-state dependent).

The `verify` step waits 60 s — that's "minimum viable verification." Real propagation often takes longer.

---

## CLI reference

```bash
ton-sovereign-deploy [build-dir] [options]
```

### Common options

| Option | Description |
|--------|-------------|
| `[build-dir]` | Build directory (auto-detects `dist/` / `build/` / `out/` / `public/` if omitted). |
| `--domain <domain>` | Register under a `.ton` domain. |
| `--testnet` | Use TON testnet. |
| `--desc <text>` | Bag description. |
| `--watch` | Watch for file changes and auto-redeploy (default in interactive runs). |
| `--no-watch` | Exit after upload — use in CI or one-shot deploys. |
| `--debounce <ms>` | Watch-mode debounce delay (default 2000 ms). |
| `--wallet-mode <mode>` | Signing mode: `tonconnect` (default, QR + phone) or `agentic` (reads `~/.config/ton/config.json`). |
| `--wallet-label <label>` | Selector for agentic mode (id / name / address). Defaults to `active_wallet_id`. |
| `--wallet-config <path>` | Override path for the agentic config file. |
| `--announce-ip <ipv4>` | Set the public IP the daemon advertises to the DHT (cloud VM use). Also `SOVEREIGN_ANNOUNCE_IP`. |
| `--announce-port <port>` | Set the UDP port the daemon advertises (cloud VM use). Also `SOVEREIGN_ANNOUNCE_PORT`. |
| `--daemon-mode <mode>` | Daemon ownership: `detached` (default) / `embedded` (one-shot) / `service` (hand to launchd/systemd). |
| `--daemon-backend <name>` | `tonutils` (default) or `ton-core` (C++ legacy; needed only for `--provider`). |
| `--tunnel-config <path>` | Path to `nodes-pool.json` for ADNL Tunnel NAT traversal (bring-your-own pool). |
| `--site-adnl <hex>` | 64-hex ADNL identity to publish as the `site` record under `--domain`. |
| `--provider [address]` | Storage-provider contract — **disabled** (mainnet provider economy is dormant; [#30](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/30)). |
| `--no-provenance` | Skip emitting `.well-known/ton-deploy.json` into the bag. |
| `--ci-mode` | Disable spinners for CI environments. |
| `--json-output` | Emit one JSON line per event. Automatically disables `--watch`. |
| `--skip-verify` | Skip bag-access verification (propagation can be slow). |
| `--wallet <name>` | Preferred wallet for TonConnect sign requests (default "Tonkeeper"). |

Run `ton-sovereign-deploy doctor` for an environment check before deploying (daemon binaries, TONAPI / TonConnect manifest reachability, wallet pairing state).

### Setting a `site` record (browser hosting)

A `.ton` domain can carry two records:

- **`storage`** → a TON Storage bag id. Written by every deploy with `--domain`. Serves files through storage gateways.
- **`site`** → an ADNL identity (your rldp-http-proxy). Required for `<domain>.ton` to open in TON Browser. `--site-adnl <hex>` adds it during a deploy.

When the domain is already deployed and you only need to point it at (or re-point it at) a proxy identity, use the standalone `site-record` subcommand. It writes **only** the site record — no bag, no storage write, no daemon, no TonConnect:

```bash
ton-sovereign-deploy site-record mysite.ton <64-hex-adnl>
```

It prints a Tonkeeper transfer deeplink. Open it on the phone holding the domain and approve once — that single transaction sets the record. Add `--json-output` to get the deeplink (and the raw message BOC) as a JSON object for agents / CI.

### Backend choice

From v0.6, the bundled daemon is `tonutils-storage` (Go, default). The legacy TON Core C++ daemon is opt-in:

```bash
# Default: tonutils (Go)
ton-sovereign-deploy ./build/

# Legacy C++ daemon (needed only for --provider)
ton-sovereign-deploy ./build/ --daemon-backend=ton-core
```

| Feature | tonutils (default) | ton-core (legacy) |
|---|---|---|
| Bag upload + seed | ✅ | ✅ |
| `--watch` | ✅ | ✅ |
| `--tunnel-config` | ✅ | ❌ |
| `--testnet` | ✅ | ✅ |
| `--provider` | ❌ | ⚠ experimental |

### Watch mode

Since v0.6, `--watch` is the default for interactive runs. The daemon stays resident, watches for file changes, and auto-redeploys. When new content is identical the bag id is unchanged — the watch loop logs a `↻ no-op` line. With `--domain`, the DNS record continues to point at the initial bag id; stop watch mode and re-run with `--domain` when you want to publish an updated bag.

```bash
# Default: watch mode
ton-sovereign-deploy ./build/

# One-shot (for CI)
ton-sovereign-deploy ./build/ --no-watch

# 3-second debounce for large projects
ton-sovereign-deploy ./build/ --debounce 3000
```

For continuous hosting:
- `--daemon-mode service` hands the daemon to launchd/systemd so it keeps seeding across reboots.
- Behind NAT / no public IP: `--tunnel-config` routes through an ADNL Tunnel pool.
- On a cloud VM: `--announce-ip` + `--announce-port` make the daemon publicly reachable.

### Debug logging

```bash
# All namespaces
DEBUG="*" ton-sovereign-deploy ./build/ --domain x.ton

# SDK only
DEBUG="sovereign:*" ton-sovereign-deploy ./build/ --domain x.ton

# Specific namespaces (deploy, agentic-sign, resolve-tx)
DEBUG="sovereign:deploy,sovereign:resolve-tx" ton-sovereign-deploy ./build/
```

Output is always on **stderr** so `--json-output` stdout stays parseable.

---

## System requirements

- **Node.js** 18+ (CI matrix covers 18/20/22).
- **macOS** 10.15+, **Linux** x86_64/ARM64, **Windows** 10/11 (x64, ARM64).
- **PowerShell** 3.0+ (Windows only; ships with the OS).
- Network access to TON nodes.

**Windows first run:** PowerShell downloads `storage-daemon.exe` from the official TON GitHub release. Windows Defender may flag it — choose "Allow" or add an exclusion. WSL2 uses the Linux binaries.

---

## Fund recovery

If you signed with `--provider` and the provider never issued `accept_storage_contract`, the funds parked in the storage contract are recoverable by sending `op::close_contract` (0x79f937ea). A mainnet-proven script ships with the kit:

```bash
node scripts/close-storage-contract.cjs <storage-contract-address>
```

[Field-verified logs and details](docs/archive/v0.5/round-postmortem.md).

---

## Security

The kit signs transactions on your behalf (`--wallet-mode agentic`, MCP `sovereign_deploy` with `wallet.kind: "agentic"`). Threat model and the private vulnerability disclosure address are in [`SECURITY.md`](SECURITY.md).

Notable hardening in v0.9.0: SHA-256 supply-chain integrity on all daemon binary downloads (20 hashes pinned), wallet-payload exfiltration closed (`@tonconnect/sdk` debug log suppression), wallet-key symlink redirect closed, daemon orphan-on-signal closed, MCP contract enforcement.

---

## Docs

Full index with Current/Reference/Historical classification: [`docs/README.md`](docs/README.md).

- **MCP server spec:** [`docs/v0.8/mcp-core-requirements.md`](docs/v0.8/mcp-core-requirements.md) — the authoritative F1–F5/NF contract.
- **Agentic CLI usage:** [`docs/v0.8/agentic-cli-usage.md`](docs/v0.8/agentic-cli-usage.md) — `--wallet-mode agentic` prerequisites / selectors / CI.
- **Agent stack compose:** [`docs/v0.8/agent-stack-compose.md`](docs/v0.8/agent-stack-compose.md) — wiring `ton-sovereign-mcp` + `@ton/mcp` for full agentic flows.
- **v0.9 features:** [MCP HTTP transport](docs/v0.9/mcp-http-transport.md) · [provenance](docs/v0.9/provenance.md) · [service-mode daemons](docs/v0.9/daemon-service-mode.md) · [cross-agent compat](docs/v0.9/agent-compat.md).
- **Release checklist:** [`docs/v0.9/release-checklist.md`](docs/v0.9/release-checklist.md).

**GitHub:** https://github.com/Masashi-Ono0611/sovereign-deploy-kit

---

## License

MIT
