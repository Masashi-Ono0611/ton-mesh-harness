# V3 E2E acceptance runbook (#18 / #40)

The reproducible recipe for the single GA acceptance gate: an MCP client
drives `ton-sovereign-mcp` through a real on-chain deploy.

## ⚠️ Network scope: the MCP path is mainnet-only in v0.8

The V3 issue and the release-checklist originally said *testnet*. The v0.8
SDK does **not** implement a testnet deploy path: `sovereign_deploy` with
`testnet:true` is rejected with `ERR_INVALID_INPUT`
(`src/sdk/deploy.ts:253` — the tonutils-storage backend is mainnet-only).
Testnet exists **only** on the legacy CLI path
(`--daemon-backend=ton-core`), which is outside the MCP boundary and is
TonConnect-only (no agentic signing).

So the MCP-path E2E gate is **mainnet** (§1). A free testnet rehearsal of
the *upload + DNS* mechanics — useful for shaking out the flow without
spending real TON, but **not** the MCP gate — is documented separately in
§2.

The automated driver is `scripts/e2e-mcp-deploy.cjs` (a portable `.cjs`,
matching `scripts/mcp-smoke.cjs` — GNU `timeout` is not on macOS runners).
A gated Vitest wrapper lives at `test/mcp-e2e.test.ts` (`RUN_MCP_E2E=1`).

---

## 1. Mainnet MCP E2E (the V3 gate)

### 1.1 Wallet funding

The MCP deploy signs **agentically** — autonomously, no QR scan. The key
is held by `@ton/mcp` in `~/.config/ton/config.json` (or `$TON_CONFIG_PATH`).
**Never** put a raw seed in an env var or `.env`; the driver reads the
`@ton/mcp`-managed config the same way the real agent flow does.

1. Set up an agentic wallet via `@ton/mcp` (its wallet-setup flow writes
   the config). Confirm it landed:
   ```bash
   node scripts/e2e-mcp-deploy.cjs   # Stage 1 prints signers=[...]
   ```
   You need `agentic` in `wallet_signers_available`.
2. Fund that wallet's mainnet address with real TON. A deploy spends gas
   for: TON Storage contract + the `.ton` DNS record write(s). Budget
   ~1 TON for headroom across a few runs.
3. Check the balance on https://tonviewer.com (mainnet) by address.

### 1.2 Domain

You need a real mainnet `.ton` domain the wallet controls (buy/manage at
https://dns.ton.org). Set it via `E2E_MAINNET_DOMAIN`. If you leave it
empty the deploy is **storage-only**: it uploads the bag and returns a
`bag_id` but `dns_tx_hash` is `null` (no DNS write) — a cheaper smoke that
still proves the upload + daemon lifecycle.

### 1.3 Reproduction recipe

Fresh-session protocol (mirrors the agent flow):

```bash
npm run build                       # driver spawns dist/mcp.js

# Stage 1 only — zero cost, always safe:
node scripts/e2e-mcp-deploy.cjs

# Armed mainnet deploy (spends TON):
E2E_AUTO_SIGN=1 \
E2E_MAINNET_DOMAIN=yourname.ton \
TON_CONFIG_PATH=$HOME/.config/ton/config.json \
  node scripts/e2e-mcp-deploy.cjs
```

The MCP client config a real agent would use (per
`docs/v0.8/agent-stack-compose.md` flow 1):

```json
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    },
    "ton": { "command": "npx", "args": ["-y", "@ton/mcp@alpha"] }
  }
}
```

### 1.4 Pass criteria

- `sovereign_check_env` returns a well-formed result (`ready` boolean,
  `wallet_signers_available` includes `agentic`).
- `sovereign_deploy` reaches a `done` payload with a non-empty `bag_id`.
- With a domain set: `dns_tx_hash` is non-null and resolves on
  https://tonviewer.com.
- All five MCP primitives exercised: `initialize`, `tools/list`,
  `tools/call`, `notifications/progress`, `notifications/cancelled`
  (the last via §1.6).

### 1.5 Known flakes / time-sensitivities

- **DNS tx confirmation**: ~30 s–2 min. The driver's deploy timeout is
  5 min.
- **Bag propagation** (visible via TONAPI / `sovereign_status`): ~30 s–5 min
  after the daemon starts seeding.
- **Toncenter rate-limits**: the `dns_tx_hash` resolution uses Toncenter v3
  `transactionsByMessage`; under load it may need a retry. Set a
  `toncenter_api_key` in the config's `networks.mainnet` to raise limits.

### 1.6 Cancellation variant

```bash
E2E_AUTO_SIGN=1 E2E_CANCEL=1 node scripts/e2e-mcp-deploy.cjs
```

Stage 3 starts a deploy, sends `notifications/cancelled` mid-flight, then
asserts no leaked `tonutils-storage` / `storage-daemon` process. Per the
MCP cancellation contract the `ERR_CANCELLED` *response* is suppressed
(`src/mcp.ts` handleDeploy F4 caveat) — so the assertion is on **process
hygiene**, not on a response frame. Manual check:

```bash
ps -A -o pid,command | grep -E 'tonutils-storage|storage-daemon' | grep -v grep
# expect: no rows
```

### 1.7 Cleanup

- **Leaked daemon temp dirs** (only if a run crashed before cleanup):
  ```bash
  rm -rf "${TMPDIR:-/tmp}"/ton-sovereign-*-*  # session + proxy + tonutils dirs
  ```
- **TonConnect session** (only relevant for the human-signed Path 1, not
  the agentic E2E): `rm -rf ~/.config/ton-sovereign-deploy/`.
- **Domain re-use**: a `.ton` domain's storage record is simply
  overwritten by the next deploy — no release step needed. Re-running
  against the same domain just points it at the new bag.

---

## 2. Free testnet rehearsal (CLI, NOT the MCP gate)

Testnet is reachable only via the legacy CLI backend. This does **not**
satisfy the V3 MCP gate (no MCP, no agentic signing — TonConnect/QR only),
but it lets you rehearse upload + DNS mechanics for free.

1. **Faucet**: https://t.me/testgiver_ton_bot (free, ~5 TON funds many
   runs).
2. **Testnet domain**: register/manage a `.ton` testnet domain, or reuse
   one you already own on testnet.
3. **Run** (QR-signed via Tonkeeper testnet mode):
   ```bash
   ton-sovereign-deploy ./dist \
     --domain yourname.ton \
     --daemon-backend=ton-core \
     --testnet
   ```
4. Check the tx on https://testnet.tonviewer.com.

Known testnet-specific flakes are the same as §1.5 (DNS confirm + bag
propagation latency); testnet indexers can lag more than mainnet.

---

## References

- `#18` (V3 acceptance) / `#40` (this runbook)
- `scripts/e2e-mcp-deploy.cjs`, `test/mcp-e2e.test.ts`, `.env.example`
- `docs/v0.8/agent-stack-compose.md` (full agent compose / mainnet flow)
- `docs/v0.8/agentic-cli-usage.md` (CLI agentic signing path)
