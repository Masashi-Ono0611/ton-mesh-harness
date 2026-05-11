# Composing the agent stack: ton-sovereign-mcp + @ton/mcp

This kit's MCP server (`ton-sovereign-mcp`) handles **deploy** —
uploading a static site to TON Storage and writing the .ton DNS
records. It does NOT handle wallet management (key creation, key
rotation, balance checks). For the latter, an agent runs `@ton/mcp`
alongside this kit.

The two servers compose **at the filesystem level**, not via MCP
calls between each other. They share the same `~/.config/ton/config.json`
file — `@ton/mcp` writes it, this kit reads it (when
`wallet.kind: "agentic"` is selected).

This doc shows the wiring for the most common agent flows.

## MCP client config — both servers loaded

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

Place this in your Claude Code / agent client config. Both servers
start on demand; they don't talk to each other directly — the agent
orchestrates by calling tools from each.

## Tool inventory

| Server | Tool | Purpose |
|---|---|---|
| `ton-sovereign-deploy` | `sovereign_check_env` | Pre-flight: daemon binaries, network, wallet signers, disk |
| `ton-sovereign-deploy` | `sovereign_deploy` | Upload bag + write .ton DNS (TonConnect or agentic) |
| `ton-sovereign-deploy` | `sovereign_status` | Snapshot a bag's propagation state + DNS pointer |
| `ton` (`@ton/mcp`) | `agentic_start_root_wallet_setup` | Create a new agentic wallet (writes to config) |
| `ton` (`@ton/mcp`) | `agentic_import_wallet` | Import an existing wallet (mnemonic/private key) |
| `ton` (`@ton/mcp`) | `list_wallets` | Show current wallets in the config |
| `ton` (`@ton/mcp`) | `set_active_wallet` | Pick which wallet `wallet.kind: "agentic"` resolves to |
| `ton` (`@ton/mcp`) | `get_balance` | Check TON balance |
| `ton` (`@ton/mcp`) | `send_ton` | Transfer TON (for funding a fresh wallet) |
| `ton` (`@ton/mcp`) | `resolve_dns` | Resolve a .ton domain (auxiliary check) |

## Flow 1: First-time autonomous deploy

User prompt: *"Deploy this directory to my .ton site. I want it to keep
working without me."*

The agent's tool-call sequence:

1. `ton.list_wallets` — check if a wallet already exists.
2. If empty:
   1. `ton.agentic_start_root_wallet_setup` — generate a new wallet.
   2. Surface the deposit address + amount to the user. Wait for
      confirmation that the wallet is funded.
   3. `ton.get_balance` — verify funding.
3. `ton-sovereign-deploy.sovereign_check_env { source_dir: "./dist" }`
   — make sure the daemon binary is installed, TONAPI is reachable,
   etc. If `ready: false`, surface each `blocking[].fix_hint` to the
   user and stop.
4. `ton-sovereign-deploy.sovereign_deploy`:
   ```jsonc
   {
     "source_dir": "./dist",
     "domain": "myprotocol.ton",
     "wallet": { "kind": "agentic" }
   }
   ```
5. Stream the `notifications/progress` events; the final tool result
   carries `bag_id` + `dns_tx_hash` + a tonviewer URL in
   `next_actions`.

## Flow 2: Human-signed deploy (TonConnect)

Same as Flow 1, but in step 4 pass:

```jsonc
{
  "wallet": { "kind": "tonconnect", "connector": "Tonkeeper" }
}
```

The MCP server emits an `awaiting_signature` progress event whose
`data.signing_url` is a `tonconnect://` deep-link. The agent should
surface that URL to the user (terminal, browser, Telegram bot — wherever
the agent's UI is). After the user approves on their phone, the deploy
continues to `dns_signing` → `dns_confirmed` → `verifying` → `done`.

## Flow 3: Post-deploy status check

User prompt: *"Did my deploy from earlier propagate yet?"*

```jsonc
{
  "name": "sovereign_status",
  "arguments": {
    "bag_id": "<from prior deploy>",
    "domain": "myprotocol.ton"
  }
}
```

Result tells the agent whether the bag is visible on TONAPI and whether
the DNS record matches. The agent can summarise to the user: "Yes, your
bag is propagated and `myprotocol.ton` points to it."

## Flow 4: Re-publish updates

User prompt: *"I changed the homepage. Re-deploy."*

1. `sovereign_check_env` — still ready.
2. `sovereign_deploy` with the same domain. The bag_id will change
   (content hash differs); the DNS record gets updated to point at
   the new bag. The old bag isn't garbage-collected — content
   addressing means a third party who knows the old hash can still
   serve it, but the .ton domain now serves the new one.

## Boundaries and contracts

- **`ton-sovereign-deploy` only READS** `~/.config/ton/config.json`. It
  does not create, modify, or delete entries. Wallet management is
  always via `@ton/mcp`.
- **No MCP-to-MCP calls.** Each server is a standalone process the
  agent talks to. If `@ton/mcp` isn't loaded, `ton-sovereign-deploy`
  with `wallet.kind: "agentic"` still works (it reads the file
  directly); it just can't help the agent create new wallets.
- **F5 errors are stable.** Codes like `ERR_NO_WALLET`,
  `ERR_NO_DOMAIN`, `ERR_DNS_TX_TIMEOUT` are part of the public
  contract — agents can branch on them. See
  `docs/v0.8/mcp-core-requirements.md` §F5.

## Failure modes the agent should handle

| Symptom | Cause | Agent response |
|---|---|---|
| `ERR_NO_WALLET` with "config not found" | No wallet yet | Call `ton.agentic_start_root_wallet_setup` |
| `ERR_NO_WALLET` with "@ton/mcp not installed" | Optional peer missing for NFT-delegated agentic | Tell user: `npm install @ton/mcp@alpha`, or pick a `type: standard` wallet |
| `ERR_NO_DOMAIN` | Domain not owned by signer | Verify ownership via TONAPI or buy/transfer the domain |
| `ERR_DNS_TX_TIMEOUT` | Broadcast succeeded; TONAPI lagging | Call `sovereign_status` in 30 s — likely already on-chain |
| `ERR_BUSY` | Another sovereign_deploy already running | Wait, then retry — server serialises deploys |

## When NOT to compose

If the user explicitly wants a TonConnect-only flow (phone wallet,
human-in-the-loop), loading `@ton/mcp` is unnecessary. The kit's
`sovereign_deploy` with `wallet.kind: "tonconnect"` is fully
self-contained.

If the user only needs to check bag status (no fresh deploy),
`sovereign_status` is the only tool call — no wallet involved.

## Reference: agentic config schema

The shared file `~/.config/ton/config.json` is owned by `@ton/mcp`'s
schema, version 2. The kit's strict loader is at
[`src/sdk/agentic-config.ts`](../../src/sdk/agentic-config.ts) — it
mirrors `@ton/mcp@0.1.15-alpha.15`'s `TonConfig` shape and includes
support for `\x8aTM\x01` AES-256-GCM protected-file decoding. See
[`docs/v0.8/agentic-cli-usage.md`](agentic-cli-usage.md) for the
security caveat about the encryption being self-keyed (not
passphrase-protected).
