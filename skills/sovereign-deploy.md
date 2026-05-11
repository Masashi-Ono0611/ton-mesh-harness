---
name: sovereign-deploy
description: Deploy a static site to .ton (TON Storage + .ton DNS) with one tool call. Censorship-resistant, no server, no CDN, no domain registrar.
---

# Sovereign Deploy — TON Storage + .ton DNS in one tool call

## When to use

Use this skill when the user wants to publish a static site (built `dist/`,
`build/`, `out/`, or `public/` directory) to TON's digital-resistance stack
so the site:

- Cannot be taken down by hosting providers / domain registrars
- Survives geo-blocks
- Resolves at `<name>.ton` via TON DNS
- Is content-addressed (a bag id; the URL is the hash)

Trigger phrases (verbatim or paraphrased):
- "deploy this to .ton"
- "publish censorship-resistant"
- "TON Storage deploy"
- "host my site on TON"
- "I want a .ton domain pointing at this"

Skip this skill when:
- The site is a server-rendered app — TON Sites serve static content only
- The user wants a `.eth` domain or IPFS-only — different stack
- The deploy target is a private network (corporate intranet) — overkill

## Prerequisites

Run `sovereign_check_env` BEFORE `sovereign_deploy` to surface fixable
problems early. Required:

- **Node ≥ 18** (the kit declares `engines.node: ">=18"`)
- **A built directory** (`dist/`, `build/`, `out/`, or `public/`)
- **UDP port 17555 free** (the tonutils-storage daemon binds here; TON
  Browser.app conflicts — quit it before deploying)
- **TONAPI mainnet reachable** (the kit verifies the bag via TONAPI;
  blocked behind a corporate proxy → tell the user to whitelist
  `tonapi.io`)
- **Disk free ≥ 100 MB** for the daemon binary cache at `~/.ton-sovereign/bin/`
- **One of two signing paths** (see "Signing modes" below)

If the user wants a `.ton` DNS record (most do — that's the human-readable
URL), they additionally need:
- **The `.ton` domain owned** by their TonConnect wallet (≈ 1 TON one-time
  to mint)
- **≈ 0.02 TON** for the DNS write transaction gas

## Signing modes

The kit supports two orthogonal signing paths via the `wallet` input:

### Path 1 — TonConnect (human-signed, default)
```json
{ "wallet": { "kind": "tonconnect", "connector": "Tonkeeper" } }
```
- The agent surfaces a `signing_url` via the `awaiting_signature` progress
  event. The HUMAN opens it in their wallet app and approves.
- Use this when there's a human in the loop.
- Connector substring matches the TonConnect manifest name —
  `"Tonkeeper"`, `"MyTonWallet"`, etc.

### Path 2 — Agentic (autonomous, no human)
```json
{ "wallet": { "kind": "agentic" } }
```
- The kit reads `~/.config/ton/config.json` (or `$TON_CONFIG_PATH`) — the
  same file `@ton/mcp` writes via `agentic_start_root_wallet_setup`.
- Signing is fully autonomous — no human approval prompt.
- Use this when the agent operates without a user (CI, autonomous
  agents, scheduled deploys).
- Set up the wallet once via:
  ```bash
  npx -y @ton/mcp@alpha agentic_start_root_wallet_setup
  ```
  Or load `@ton/mcp` as a peer MCP server and call its agentic
  wallet management tools.

The signing modes are filesystem-level compose with `@ton/mcp`; there is
no inter-MCP RPC handoff.

## Steps

### 1. Pre-flight check
```jsonc
// MCP call
{
  "name": "sovereign_check_env",
  "arguments": { "source_dir": "./dist" }
}
```
Returns a `CheckEnvResult`. If `ready: false`, the `blocking` array has
items with `code`, `message`, and `fix_hint`. Surface each `fix_hint` to
the user; don't proceed to deploy until `ready: true`.

### 2. Deploy
```jsonc
// MCP call
{
  "name": "sovereign_deploy",
  "arguments": {
    "source_dir": "./dist",
    "domain": "myprotocol.ton",
    "wallet": { "kind": "tonconnect", "connector": "Tonkeeper" }
  }
}
```

Receive `notifications/progress` events:
1. `env_check` — preparing tonutils-storage
2. `daemon_starting` — spawning the storage daemon
3. `bag_creating` — uploading the build dir
4. `bag_uploaded` — bag is on disk in the daemon
5. *(at GA — currently v0.8.0-rc2 stops here for `domain`-less calls)*
   `awaiting_signature` — surface `data.signing_url` to the user
6. `dns_signing` — wallet approved, broadcasting
7. `dns_confirmed` — DNS tx confirmed on-chain
8. `verifying` — bag verified accessible via TONAPI
9. `done` — final `DeployResult` with `bag_id`, `daemon_api_url`, etc.

### 3. After deploy
- Tell the user the bag id (it's the content hash — `https://ton.run/<bag_id>`
  is a fallback gateway URL).
- If they passed `domain`, tell them `<domain>.ton` will resolve within
  a few minutes after the DNS tx confirms.
- Suggest `--watch` mode (CLI) or a follow-up call if they expect the
  build dir to change.

## Common mistakes

- **UDP port 17555 collision with TON Browser.app.** Quit the app before
  deploying. `sovereign_check_env` flags this as a blocker.
- **TONAPI unreachable in corporate networks.** Bag verification fails.
  Whitelist `tonapi.io` or skip verification with `skip_verify: true`.
- **Forgetting that mainnet provider economy is dormant.** Do NOT suggest
  `--provider` — the kit disabled it in v0.6 and v0.9 reserve will revisit.
- **Treating `--watch` as 24-hour hosting.** The daemon must keep running
  for the bag to stay seedable. Suggest the user either keep their machine
  on or contract a tunnel-rental (v0.9 reserve).
- **Empty `.ton` domain resolution.** The bag is created instantly but
  TONAPI lags ~minutes; tell the user to wait if `.ton` returns nothing
  immediately.

## Examples

### Minimal deploy (no DNS — just upload the bag)
```jsonc
{
  "name": "sovereign_deploy",
  "arguments": { "source_dir": "./dist" }
}
```

### Deploy with custom domain (default TonConnect)
```jsonc
{
  "name": "sovereign_deploy",
  "arguments": {
    "source_dir": "./dist",
    "domain": "myprotocol.ton",
    "description": "MyProtocol v1.2.0 release build"
  }
}
```

### Agentic deploy (no human)
```jsonc
{
  "name": "sovereign_deploy",
  "arguments": {
    "source_dir": "./dist",
    "domain": "ci-bot.ton",
    "wallet": { "kind": "agentic", "wallet_label": "ci" }
  }
}
```

### With tunnel client (NAT traversal, v0.9 reserve)
```jsonc
{
  "name": "sovereign_deploy",
  "arguments": {
    "source_dir": "./dist",
    "domain": "from-behind-nat.ton",
    "tunnel_config": "/Users/me/.ton-tunnel/nodes-pool.json"
  }
}
```

## Tool surface

- `sovereign_check_env({ source_dir? })` → `CheckEnvResult`
- `sovereign_deploy({ source_dir, domain?, wallet?, ... })` → `DeployResult`

Full input/output schemas: see the `tools/list` response or
[`docs/v0.8/mcp-core-requirements.md`](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/blob/main/docs/v0.8/mcp-core-requirements.md)
§F2.

## Install

```bash
# Per-call (recommended for agents)
npx -y --package ton-sovereign-deploy ton-sovereign-mcp

# Or pin globally
npm install -g ton-sovereign-deploy
```

Add to your MCP client config:
```jsonc
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    }
  }
}
```

For agentic-wallet flows, also load `@ton/mcp@alpha` so the kit can share
the wallet config:
```jsonc
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    },
    "ton": {
      "command": "npx",
      "args": ["-y", "@ton/mcp@alpha"]
    }
  }
}
```

## Source

- GitHub: https://github.com/Masashi-Ono0611/sovereign-deploy-kit
- License: MIT
- v0.8.0-rc1 first published 2026-05-10
- Status: rc2 (bag-creation core; DNS write in CLI today, SDK at GA)
