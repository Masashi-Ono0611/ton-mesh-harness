# v0.8 core requirements — MCP server contract

**Scope:** what 0.8.0 actually ships. Updated 2026-05-10 after the
[concept update](concept-update-2026-05-10.md) and [P-1 probe](at-mcp-probe.md)
landed.

The single deliverable of 0.8.0 is: **an MCP server that an AI agent can
connect to and invoke a working `deploy` tool against, with a programmatic
SDK underneath that has no console IO, and the multi-channel discoverability
artifacts that let an agent find the kit without being told its name.**

## In scope (rc1 — week 1)

1. README "Agent quickstart" section pointing at the existing CLI (rc1
   skill teaches CLI invocation; rewritten at GA to teach MCP tool names).
2. npm keywords (`mcp`, `mcp-server`, `agent-skill`, `ton`, `claude-skill`)
   added to `package.json`.
3. Doc rescope of this file and `agent-native-pivot.md` per the P-1 verdict.

## In scope (GA — week 6)

4. Programmatic SDK extraction (no console output, no spinners, no
   `process.exit`).
5. MCP server binary (`ton-sovereign-mcp`) using stdio transport.
6. Two tools: `sovereign_deploy` and `sovereign_check_env`.
7. Progress notifications and cancellation per MCP spec.
8. Stable error code contract for the two tools.
9. **`@ton/walletkit` filesystem-level compose** — read the agentic wallet
   config at `~/.config/ton/config.json` directly via the same loader
   `@ton/mcp` uses. See [P-1 probe memo](at-mcp-probe.md) for the verified
   contract. `@ton/mcp` is NOT a runtime dep; it's a peer MCP server an
   agent may load alongside `ton-sovereign-mcp`.
10. In-repo skill markdown at `skills/sovereign-deploy.md` referencing
    the now-stable MCP tool names.
11. `templates/.well-known/mcp.json` template (MCP-server self-description
    for the local dashboard; **not** a provenance manifest — distinct from
    the `.well-known/ton-deploy.json` axis from concept-update Phase 3.5,
    which is noted as a candidate for future versions only).

## Out of scope

Updated per concept-update 2026-05-10:

- **Agentic Wallet integration via `@ton/mcp` MCP-RPC handoff** — *delegated*
  via the filesystem-level compose described above (item 9). `@ton/mcp` does
  not expose its session via inter-MCP RPC ([P-1 probe](at-mcp-probe.md));
  the integration is at `~/.config/ton/config.json`.
- Daemon detached / launchd / systemd / remote — 0.8.x.
- HTTP transport for the MCP server (stdio only in 0.8.0).
- `mcp.ton.org` registry submission — no submission flow exists today; revisit
  when one does. ([P-1 probe](at-mcp-probe.md) Phase 2.75 landscape findings.)
- Additional tools (`sovereign_status`, `sovereign_redeploy`,
  `sovereign_stop`, etc.) — 0.8.x once the two-tool contract is validated.
- `.well-known/ton-deploy.json` provenance manifest (Codex C axis from
  concept-update Phase 3.5) — noted as candidate, no commitment.
- Repo split / monorepo.

---

## Functional requirements

### F1. MCP server binary
- `bin: { "ton-sovereign-mcp": "./dist/mcp.js" }` added to `package.json`.
- Stdio transport via `@modelcontextprotocol/sdk`.
- Implements MCP methods: `initialize`, `tools/list`, `tools/call`.
- Handles `notifications/cancelled`.
- Sends `notifications/progress` during long calls.
- Reports a stable `protocolVersion` and `serverInfo.version` (= kit
  version).

### F2. Tools exposed

#### `sovereign_deploy`

**Tool description (matters for [V4] #26 red-team test discoverability):**

> *"Deploy a static site directory to TON Storage and write the .ton DNS records (storage + site/ADNL). Censorship-resistant. Supports human-signed (TonConnect) and agentic (autonomous key from `@ton/mcp` config) signing modes."*

The literal phrase **"deploy a static site to .ton"** (or close paraphrase) must appear so an agent searching for that capability finds the tool.

**Input** (zod-defined, JSON Schema generated):

| field | type | required | default | notes |
|---|---|---|---|---|
| `source_dir` | string | ✅ | — | absolute or relative path to build dir |
| `domain` | string \| null | — | null | e.g. `"myprotocol.ton"` |
| `description` | string \| null | — | dir name | bag description |
| `wallet` | `WalletSpec` | — | `{kind: "tonconnect", connector: "Tonkeeper"}` | discriminated union, see below |
| `testnet` | boolean | — | false | |
| `daemon_backend` | `"tonutils" \| "ton-core"` | — | `"tonutils"` | |
| `tunnel_config` | string \| null | — | null | path to nodes-pool.json |
| `keep_alive` | boolean | — | false | true = daemon keeps seeding after the call returns; false = one-shot |
| `skip_verify` | boolean | — | false | |

**`WalletSpec`** (discriminated union per [P-1 verdict](at-mcp-probe.md)):

```ts
const WalletSpec = z.discriminatedUnion("kind", [
  // Path 1 — human-signed (default, v0.6/v0.7 carryover, @ton/mcp not involved)
  z.object({
    kind: z.literal("tonconnect"),
    connector: z.string().default("Tonkeeper"),  // substring match against TonConnect manifest
  }),
  // Path 2 — agentic-signed (new in v0.8.0, reads ~/.config/ton/config.json via @ton/walletkit)
  z.object({
    kind: z.literal("agentic"),
    config_path: z.string().optional(),   // defaults to ~/.config/ton/config.json or $TON_CONFIG_PATH
    wallet_label: z.string().optional(),  // selects from agentic wallet list; defaults to active
  }),
]);
```

CLI backwards compat:
- `--wallet Tonkeeper` (current) → `{kind: "tonconnect", connector: "Tonkeeper"}`
- `--wallet-mode agentic` (new) → opts in to Path 2; `--wallet-label foo` selects a non-active wallet

**Output**:

| field | type | notes |
|---|---|---|
| `bag_id` | string | hex |
| `bag_size_bytes` | number | |
| `dns_tx_hash` | string \| null | null if `domain` was null |
| `dashboard_url` | string | local dashboard while daemon alive |
| `daemon_pid` | number \| null | non-null only when `keep_alive=true` |
| `seed_status` | `"seeding" \| "stopped"` | |
| `next_actions` | `{ description: string }[]` | hints (e.g. "set up detached daemon" — informational only in v0.8.0) |

**Behavior**:
- Calls the existing `runDeployTonutils()` / `runDeploy()` path
  through the new SDK layer.
- On `keep_alive=false`, the daemon is killed before the tool returns.
- On `keep_alive=true`, the daemon survives the tool call. The MCP
  server tracks the spawned daemon and kills it on its own shutdown
  (so an agent that disconnects doesn't leak a daemon). v0.8.x will
  add a `sovereign_stop` tool for explicit control.

#### `sovereign_check_env`

**Input**:

| field | type | required | default |
|---|---|---|---|
| `source_dir` | string \| null | — | null |

**Output**:

| field | type |
|---|---|
| `ready` | boolean |
| `node_version` | string |
| `disk_free_mb` | number |
| `udp_port_17555_free` | boolean |
| `wallet_signers_available` | string[] — `"tonconnect"` if the kit's TonConnect connector code is reachable (no session check); `"agentic"` if `~/.config/ton/config.json` (or `$TON_CONFIG_PATH`) exists AND has at least one wallet entry that `@ton/walletkit` can load. Possible values: `[]`, `["tonconnect"]`, `["agentic"]`, `["tonconnect","agentic"]`. |
| `daemon_backend_installed` | `{ tonutils: boolean, ton_core: boolean }` |
| `network_reachable` | boolean |
| `source_dir_valid` | boolean \| null (null when `source_dir` was null) |
| `blocking` | `{ code: string, message: string, fix_hint: string }[]` |
| `warnings` | `{ code: string, message: string }[]` |

**Behavior**:
- Reuses `cli/doctor.ts` logic, exposed via the SDK.
- `ready === blocking.length === 0`.

### F3. Progress notifications
- Sent during `sovereign_deploy` calls.
- Schema per event: `{ phase: string, message: string, percent?: number, data?: object }`.
- Phases (in order): `env_check`, `bag_creating`, `daemon_starting`,
  `bag_uploaded`, `awaiting_signature`, `dns_signing`, `dns_confirmed`,
  `verifying`, `done`.
- The `awaiting_signature` event:
  - **Path 1 (`wallet.kind === "tonconnect"`):** includes `data: { signing_url: string, expires_at_iso: string }`. The agent surfaces this URL to the human; the SDK awaits the wallet's response internally.
  - **Path 2 (`wallet.kind === "agentic"`):** the event still fires for symmetry (so progress consumers don't need to branch), but `data.signing_url` is `null` and `signing_mode` is set to `"agentic"`. Signing is autonomous — there is no human approval. The phase transitions to `dns_signing` immediately after.

### F4. Cancellation (phase-dependent, best-effort post-`awaiting_signature`)

On `notifications/cancelled` from the client, the SDK aborts the in-flight
`deploy`. Behaviour depends on the phase at cancel-time. **DNS-side semantics**
matter most (the wallet might still publish); local artifacts are easier to
reason about.

| Phase at cancel | Daemon | Local bag artifacts | DNS write | Path 1 `may_have_published` | Path 2 `may_have_published` |
|---|---|---|---|---|---|
| `env_check`, `bag_creating` | killed | none yet | not initiated | `false` | `false` |
| `daemon_starting`, `bag_uploaded` | killed | bag exists in `~/.ton-sovereign-deploy/storage/` | not initiated | `false` | `false` |
| `awaiting_signature` (Path 1) | killed | bag exists | request sent to wallet | `true` (wallet may sign + broadcast even after cancellation) | n/a |
| `awaiting_signature` (Path 2, pre-broadcast) | killed | bag exists | not initiated | n/a | `false` (kit owns key, cancellation is effective) |
| `dns_signing` (Path 2, post-broadcast) | killed | bag exists | broadcast already | n/a | `true` (a broadcast tx cannot be unbroadcast) |
| `dns_confirmed`, `verifying`, `done` | killed | bag exists | already published | `true` | `true` |

**Tool return shape on cancellation:**

```ts
{
  isError: true,
  code: "ERR_CANCELLED",
  message: "Cancelled at phase <phase_at_cancel>.",
  severity: "recoverable",
  data: {
    phase_at_cancel: string,        // e.g. "awaiting_signature"
    may_have_published: boolean,    // see table
    bag_id: string | null,          // present if bag was created locally
    tx_hash: string | null          // present if DNS tx was broadcast (rare unless cancellation arrived after broadcast)
  }
}
```

**Daemon is always killed** on cancellation regardless of phase. **Local bag
artifacts are NOT cleaned up** by the kit on cancel — the agent / human can
inspect or reuse them; if undesired, delete `~/.ton-sovereign-deploy/storage/`
manually.

**Path 1 close-out:** the kit closes its TonConnect session locally on cancel,
but the wallet client (running on the user's phone or another machine) is not
controllable from here. If the wallet has already shown the prompt, the user
may still tap "approve" and the tx will broadcast. Surface this honestly to
the calling agent via `may_have_published: true`.

### F5. Error contract
- Every tool error returns `isError: true` with payload:
  `{ code: string, message: string, severity: "fatal" | "recoverable", fix_hint?: string, data?: object }`.
- Initial stable codes:
  - `ERR_INVALID_INPUT` — schema validation failed.
  - `ERR_NO_DOMAIN` — `domain` not owned by signing wallet.
  - `ERR_NO_WALLET` — emitted when `wallet.kind === "agentic"` and `~/.config/ton/config.json` (or `$TON_CONFIG_PATH`) is absent or has no active wallet. `fix_hint`: *"Run `npx -y @ton/mcp@alpha agentic_start_root_wallet_setup` to set up an agentic wallet, or pass `wallet: {kind: 'tonconnect'}` for human-signed flow."*
  - `ERR_PORT_BUSY` — UDP 17555 in use (likely TON Browser.app).
  - `ERR_DAEMON_SPAWN` — backend binary missing or crashed at start.
  - `ERR_DAEMON_API_TIMEOUT` — daemon HTTP API didn't come up.
  - `ERR_BAG_UPLOAD` — daemon failed to ingest the directory.
  - `ERR_DNS_SIGN_REJECTED` — wallet rejected the sign request (Path 1 only — Path 2 has no rejection step, signing is autonomous).
  - `ERR_DNS_TX_TIMEOUT` — DNS tx not confirmed within window.
  - `ERR_VERIFY_FAILED` — bag served from daemon but record/hash mismatch.
  - `ERR_CANCELLED` — client cancelled mid-flight; check `data.may_have_published` for honest semantics (see F4).
  - `ERR_BUSY` — concurrent tool call rejected; v0.8.0 serialises `sovereign_deploy` invocations (one at a time per server process). The agent should retry after the in-flight call completes. Multi-deploy is a v0.8.x topic.
  - `ERR_INTERNAL` — unhandled.
- Adding new codes is non-breaking; renaming or removing is breaking
  (require kit minor bump + tool description note).

---

## Non-functional requirements

### NF1. SDK module structure
- New `src/sdk/` directory:
  - `src/sdk/deploy.ts` — `deploy(opts: DeployOptions): AsyncIterable<DeployEvent>`.
  - `src/sdk/check.ts` — `checkEnv(opts: CheckEnvOptions): Promise<CheckEnvResult>`.
  - `src/sdk/schemas.ts` — single zod source of truth for all
    inputs/outputs. JSON Schemas for MCP derive from these.
  - `src/sdk/events.ts` — `DeployEvent` discriminated union.
- Zero `console.*` calls in `src/sdk/`. Lint rule enforces.

### NF2. CLI becomes adapter
- `src/cli.ts` and `src/cli/*` keep their existing flag surface.
- Internally, they call the SDK and render events:
  - human terminal: progress spinners + chalk lines.
  - `--json-output`: emit one JSON line per event + final result.
- No regression in v0.6 CLI tests.

### NF3. Schema = contract
- Tool input/output JSON Schemas are generated from zod at build time.
- A test asserts the generated schemas are stable (snapshot test) so
  accidental breaking changes get flagged.

### NF4. Transport
- `@modelcontextprotocol/sdk` Node package, stdio server.
- No network listener. No HTTP. No stored state on disk beyond what
  the existing kit already writes (`~/.ton-sovereign-deploy/`).

### NF5. No regression
- All v0.6 + v0.7 unit + integration tests still pass.
- `npx ton-sovereign-deploy …` produces the same human output as v0.7 (incl. `--site-auto` flow).
- `--json-output` behavior is preserved.

### NF6. Wallet config compose (filesystem-level, [P-1] verdict)
- For `wallet.kind === "agentic"`, the SDK reads `~/.config/ton/config.json` (or `$TON_CONFIG_PATH` override) via `@ton/walletkit`. Same loader and same file `@ton/mcp` uses.
- The SDK does NOT bundle or vendor `@ton/mcp`. `@ton/mcp` is a peer MCP server an agent may load alongside `ton-sovereign-mcp`; no inter-MCP RPC.
- `@ton/walletkit` version pin tracks `@ton/mcp`'s pin (alpha-tracking-alpha is acceptable for v0.8.0; flag as v0.8.x stability TODO once both stabilise).

---

## Acceptance criteria for 0.8.0

### rc1 (week 1)
1. README "Agent quickstart" section live in `main`.
2. npm keywords (`mcp`, `mcp-server`, `agent-skill`, `ton`, `claude-skill`) added and republished.
3. This file + `agent-native-pivot.md` reflect the [P-1] verdict (compose framing, `WalletSpec` discriminated union, F4 cancellation realism).
4. [V4] #26 red-team agent test executed against the CLI path; result documented in CHANGELOG `[0.8.0-rc1]`.

### GA (week 6)
5. `npx -y --package ton-sovereign-deploy ton-sovereign-mcp` (dual-bin invocation) boots and responds to MCP `initialize`.
6. `tools/list` returns exactly two tools, both with valid JSON Schemas matching the tables above. Tool descriptions include "deploy a static site to .ton" (or close paraphrase) for [V4] discoverability.
7. From a Claude Code session connected to the server:
   a. `sovereign_check_env` returns a structured result.
   b. `sovereign_deploy` against a sample `dist/` on testnet (Path 1 *and* Path 2) completes end-to-end, receiving `bag_id`, `dashboard_url`, and a non-error result.
   c. **Path 1:** the agent sees `awaiting_signature` progress with a `signing_url` and can hand it off.
   d. **Path 2:** the agent sees `awaiting_signature` with `signing_mode: "agentic"` and `signing_url: null`; signing proceeds autonomously.
   e. Cancelling mid-deploy returns `ERR_CANCELLED`. If cancelled before `awaiting_signature`, no daemon is left running. If cancelled after, `data.may_have_published` is set per F4.
8. `src/sdk/` has zero `console.*` calls (verified by lint).
9. `npx ton-sovereign-deploy …` works unchanged for v0.7 users (including `--site-auto`).
10. JSON Schema snapshot test passes.
11. In-repo `skills/sovereign-deploy.md` references stable MCP tool names; `templates/.well-known/mcp.json` template lives in repo; PR to `ton-org/skills` opened.
12. [V4] #26 red-team agent test re-run against the MCP path; result documented in CHANGELOG `[0.8.0]`.

## Open implementation questions

These are decisions made during P0/P1 implementation, not blocking
spec-level questions:

1. **`keep_alive=true` daemon ownership**: the MCP server holds the
   daemon process handle. If the agent disconnects (stdin closes),
   the server kills the daemon. v0.8.x will add `sovereign_stop` and
   detached mode for true persistence.
2. **Concurrent calls**: 0.8.0 serialises tool calls (one deploy at a
   time). Concurrent calls return `ERR_BUSY` (added to the code list
   if needed). Multi-deploy is a 0.8.x topic.
3. **Daemon backend default for MCP calls**: same as CLI default
   (`tonutils`), but agents can override via input.
