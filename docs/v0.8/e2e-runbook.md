# V3 E2E acceptance runbook (#18 / #40)

The reproducible recipe for the single GA acceptance gate: an MCP client
drives `ton-mesh-harness-mcp` through a real on-chain deploy.

## ⚠️ Network scope

The V3 GA gate is run on **mainnet** (§1) — it's the acceptance proof for
the real agent-native deploy.

> **Note (v0.9):** testnet is now also supported on the MCP/tonutils path —
> `mesh_deploy` with `testnet:true` starts the daemon with the testnet
> `--network-config` and writes DNS via testnet endpoints. It needs testnet
> TON + a testnet `.ton` domain, and bag propagation depends on testnet
> ADNL liveness (self-host via your own daemon). The earlier "mainnet-only"
> guard is gone. The legacy `--daemon-backend=ton-core` testnet path (§2)
> still exists for the C++ backend, but the tonutils/MCP path no longer
> requires it.

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

**Testnet variant (recommended for the cancellation check, §1.6).** The Stage 3
cancellation test is process/on-chain hygiene, not value transfer — run it on
**testnet** to avoid spending mainnet TON and to keep the agentic signing key
away from real funds. Choose testnet when setting up the `@ton/mcp` wallet
(it writes a `network: "testnet"` entry), fund the testnet address from a TON
testnet faucet (free), and pass `E2E_TESTNET=1` (+ `E2E_TESTNET_DOMAIN=…`).
**Secret handling is identical on both networks**: the signing seed lives only
in the `@ton/mcp`-managed `~/.config/ton/config.json` (or `$TON_CONFIG_PATH`);
never put a raw seed in an env var, `.env`, or shell argument — the driver
reads the config file the same way the real agent flow does.

### 1.2 Domain

You need a real mainnet `.ton` domain the wallet controls (buy/manage at
https://dns.ton.org). Set it via `E2E_MAINNET_DOMAIN`. If you leave it
empty the deploy is **storage-only**: it uploads the bag and returns a
`bag_id` but `dns_tx_hash` is `null` (no DNS write) — a cheaper smoke that
still proves the upload + daemon lifecycle.

### 1.3 Reproduction recipe

Fresh-session protocol (mirrors the agent flow):

```bash
bun run build                       # driver spawns dist/mcp.js

# Stage 1 only — zero cost, always safe:
node scripts/e2e-mcp-deploy.cjs

# Armed mainnet deploy (spends TON):
E2E_AUTO_SIGN=1 \
E2E_MAINNET_DOMAIN=yourname.ton \
TON_CONFIG_PATH=$HOME/.config/ton/config.json \
  node scripts/e2e-mcp-deploy.cjs

# ...add E2E_VERIFY_RENDER=1 to also check the site renders (see §1.8):
E2E_VERIFY_RENDER=1 E2E_AUTO_SIGN=1 E2E_MAINNET_DOMAIN=yourname.ton \
  node scripts/e2e-mcp-deploy.cjs
```

The MCP client config a real agent would use (per
`docs/v0.8/agent-stack-compose.md` flow 1):

```json
{
  "mcpServers": {
    "ton-mesh-harness": {
      "command": "npx",
      "args": ["-y", "--package", "ton-mesh-harness", "ton-mesh-harness-mcp"]
    },
    "ton": { "command": "npx", "args": ["-y", "@ton/mcp@alpha"] }
  }
}
```

### 1.4 Pass criteria

- `mesh_check_env` returns a well-formed result (`ready` boolean,
  `wallet_signers_available` includes `agentic`).
- `mesh_deploy` reaches a `done` payload with a non-empty `bag_id`.
- With a domain set: the DNS write **landed on-chain** — TONAPI
  `/v2/dns/<domain>/resolve` returns `storage` == the deploy's `bag_id`.
  `dns_tx_hash` MAY be null when Toncenter's tx index lagged the TONAPI
  DNS poll (see §1.5); a null hash on an otherwise-`done` deploy is still
  a PASS, so the gate checks `storage == bag_id`, not the hash (#117).
  When `dns_tx_hash` is present it resolves on https://tonviewer.com.
- All five MCP primitives exercised: `initialize`, `tools/list`,
  `tools/call`, `notifications/progress`, `notifications/cancelled`
  (the last via §1.6).

### 1.5 Known flakes / time-sensitivities

- **DNS tx confirmation**: ~30 s–2 min. The driver's deploy timeout is
  5 min.
- **Bag propagation** (visible via TONAPI / `mesh_status`): ~30 s–5 min
  after the daemon starts seeding.
- **Toncenter rate-limits**: the `dns_tx_hash` resolution uses Toncenter v3
  `transactionsByMessage`; under load it may need a retry. Set a
  `toncenter_api_key` in the config's `networks.mainnet` to raise limits.

### 1.6 Cancellation variant (Stage 3)

Need an `agentic` signer first (so Stage 1 reports it and Stage 3 can run). For
the cancel-only path the wallet is never used, so generate a **throwaway,
unfunded** one in one command (refuses to clobber an existing config; delete it
after):

```bash
node scripts/make-throwaway-agentic-config.cjs   # writes ~/.config/ton/config.json
# … run the test (below) … then:  rm ~/.config/ton/config.json
```

```bash
# Daemon-hygiene only (storage-only, no on-chain assertion):
E2E_AUTO_SIGN=1 E2E_CANCEL=1 node scripts/e2e-mcp-deploy.cjs

# RECOMMENDED — mainnet on-chain assertion at near-zero gas + zero key risk.
# The cancel fires BEFORE the broadcast, so the agentic wallet never signs or
# spends — a THROWAWAY, unfunded, non-domain-owning wallet suffices.
# E2E_CANCEL_ONLY skips the Stage 2 deploy (which would need a funded OWNER
# wallet); the domain is only used to resolve the NFT + compare storage.
E2E_AUTO_SIGN=1 E2E_CANCEL_ONLY=1 \
  E2E_MAINNET_DOMAIN=somedomain.ton \
  node scripts/e2e-mcp-deploy.cjs
```

> **Why mainnet, not testnet?** Testnet has no `.ton` name auction — only
> `temp.ton` subdomains via Fift scripting — so the on-chain assertion can't get
> a testnet `.ton` domain the wallet controls. The `E2E_TESTNET=1` +
> `E2E_TESTNET_DOMAIN=…` plumbing exists for the day that changes, but the
> practical path today is the **mainnet `E2E_CANCEL_ONLY`** recipe above:
> because the cancel beats the broadcast, it costs no gas and needs no real
> funds or domain ownership — only an agentic config that exists (so Stage 1
> reports `agentic`). Full agentic DEPLOY coverage (Stage 2) still needs a
> funded owner wallet; run that separately without `E2E_CANCEL_ONLY` when you
> want it.

Stage 3 starts an **agentic** deploy and sends `notifications/cancelled`
mid-flight (a human can't sign a deploy that's about to be cancelled, so
cancellation is inherently the agentic-signing flow — it needs the wallet from
§1.1, on **testnet** for a free, zero-risk run). Per the MCP cancellation
contract the `ERR_CANCELLED` *response* is suppressed (`src/mcp.ts` handleDeploy
F4 caveat), so the assertions are:

- **Process hygiene (always)** — no leaked `tonutils-storage` / `storage-daemon`
  process after the cancel.
- **On-chain prevention (when a domain is set, #123)** — Stage 3 deploys a
  FRESH bag (a unique marker is appended to the throwaway tmp source so the bag
  differs from the domain's current storage), cancels BEFORE the broadcast, then
  reads the domain's `storage` record via TONAPI. The cancelled bag must NOT
  have become the resolved storage — i.e. the write was prevented.

Verdict (`assessCancellation`, exit-coded per #122 — PASS=0, BLOCKED=2, FAIL=1):
- **PASS** — no leaked daemon AND the cancelled bag did not land.
- **BLOCKED** — TONAPI couldn't resolve the domain to confirm, OR the cancel
  raced past the broadcast (`may_have_published`: the F4 contract permits the
  write to land if cancelled after `dns_signing`). Re-run, or read storage
  manually.
- **FAIL** — a daemon leaked, OR the bag landed despite a pre-broadcast cancel.

Manual process check:

```bash
ps -A -o pid,command | grep -E 'tonutils-storage|storage-daemon' | grep -v grep
# expect: no rows
```

### 1.7 Cleanup

- **Leaked daemon temp dirs** (only if a run crashed before cleanup):
  ```bash
  rm -rf "${TMPDIR:-/tmp}"/ton-mesh-*-*  # session + proxy + tonutils dirs
  ```
- **TonConnect session** (only relevant for the human-signed Path 1, not
  the agentic E2E): `rm -rf ~/.config/ton-mesh-harness/`.
- **Domain re-use**: a `.ton` domain's storage record is simply
  overwritten by the next deploy — no release step needed. Re-running
  against the same domain just points it at the new bag.

### 1.8 Render confirmation & storage-only viewability (#118)

A green gate proves the on-chain DNS write landed + the MCP surface works —
**not** that the site renders in a browser. `mesh_deploy` writes only the
**storage** (bag) DNS record, not a **site** (ADNL) record, so `<domain>.ton`
is **NOT** browser-openable via the `ton.run` RLDP gateway (it 404s); a
storage-only domain renders only in a TON-DNS-native client (MyTonWallet /
Tonkeeper in-app TON Browser) while a reachable node seeds the bag. The deploy
result's `next_actions` now carries this breadcrumb (with the would-be
`<domain>.ton.run` URL), and the driver logs it as `Stage 2: viewability — …`.

To get a browser-openable URL, set a site record via `mesh_site_record` (point
the domain at a resident `rldp-http-proxy` ADNL) and run a public gateway
(`--site-auto --daemon-mode service`; see the `ton-mesh-host` runbook).

Opt-in `E2E_VERIFY_RENDER=1` adds **Stage 2b**: if the domain has a site
record, it fetches the `ton.run` gateway URL, asserts HTTP 200, and prints the
URL for you to open and **confirm the rendered content**. For a storage-only
deploy (no site record) it emits **BLOCKED** (exit 2), never PASS — it cannot
render via `ton.run`.

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
   ton-mesh-harness ./dist \
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
