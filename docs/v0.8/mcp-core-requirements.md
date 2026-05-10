# v0.8 core requirements — MCP server contract

**Scope:** what 0.8.0 actually ships. Everything else from
`agent-native-pivot.md` (Agentic Wallet, daemon detached, discoverability,
typed-error refactor, registry submission, skill markdown) is deferred to
0.8.x or later.

The single deliverable of 0.8.0 is: **an MCP server that an AI agent can
connect to and invoke a working `deploy` tool against, with a programmatic
SDK underneath that has no console IO.**

## In scope

1. Programmatic SDK extraction (no console output, no spinners, no
   `process.exit`).
2. MCP server binary (`ton-sovereign-mcp`) using stdio transport.
3. Two tools: `sovereign_deploy` and `sovereign_check_env`.
4. Progress notifications and cancellation per MCP spec.
5. Stable error code contract for the two tools.

## Out of scope (deferred)

- Agentic Wallet integration — signing remains TonConnect, agent surfaces
  the URL to the human (see F3 below).
- Daemon detached / launchd / systemd / remote.
- HTTP transport for the MCP server (stdio only).
- npm keywords / README rewrite / `mcp.ton.org` registry submission.
- Skill markdown for `ton-org/skills`.
- Additional tools (`sovereign_status`, `sovereign_redeploy`,
  `sovereign_stop`, etc.) — add in 0.8.x once the two-tool contract is
  validated.
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

**Input** (zod-defined, JSON Schema generated):

| field | type | required | default | notes |
|---|---|---|---|---|
| `source_dir` | string | ✅ | — | absolute or relative path to build dir |
| `domain` | string \| null | — | null | e.g. `"myprotocol.ton"` |
| `description` | string \| null | — | dir name | bag description |
| `wallet` | string | — | `"Tonkeeper"` | substring match |
| `testnet` | boolean | — | false | |
| `daemon_backend` | `"tonutils" \| "ton-core"` | — | `"tonutils"` | |
| `tunnel_config` | string \| null | — | null | path to nodes-pool.json |
| `keep_alive` | boolean | — | false | true = daemon keeps seeding after the call returns; false = one-shot |
| `skip_verify` | boolean | — | false | |

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
| `wallet_signers_available` | string[] (e.g. `["tonconnect"]`) |
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
- The `awaiting_signature` event includes `data: { signing_url: string,
  expires_at_iso: string }`. The agent surfaces this URL to the human;
  the SDK awaits the wallet's response internally.

### F4. Cancellation
- On `notifications/cancelled` from the client, the SDK aborts the
  in-flight `deploy` cleanly:
  - kill spawned daemon process,
  - close TonConnect session,
  - drop pending DNS tx (no replay).
- Tool returns with `isError: true`, `code: "ERR_CANCELLED"`.

### F5. Error contract
- Every tool error returns `isError: true` with payload:
  `{ code: string, message: string, severity: "fatal" | "recoverable", fix_hint?: string }`.
- Initial stable codes:
  - `ERR_INVALID_INPUT` — schema validation failed.
  - `ERR_NO_DOMAIN` — `domain` not owned by signing wallet.
  - `ERR_PORT_BUSY` — UDP 17555 in use (likely TON Browser.app).
  - `ERR_DAEMON_SPAWN` — backend binary missing or crashed at start.
  - `ERR_DAEMON_API_TIMEOUT` — daemon HTTP API didn't come up.
  - `ERR_BAG_UPLOAD` — daemon failed to ingest the directory.
  - `ERR_DNS_SIGN_REJECTED` — wallet rejected the sign request.
  - `ERR_DNS_TX_TIMEOUT` — DNS tx not confirmed within window.
  - `ERR_VERIFY_FAILED` — bag served from daemon but record/hash mismatch.
  - `ERR_CANCELLED` — client cancelled mid-flight.
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
- All v0.6 unit + integration tests still pass.
- `npx ton-sovereign-deploy …` produces the same human output as v0.6.
- `--json-output` behavior is preserved.

---

## Acceptance criteria for 0.8.0

1. `npx ton-sovereign-mcp` boots and responds to MCP `initialize`.
2. `tools/list` returns exactly two tools, both with valid JSON
   Schemas matching the tables above.
3. From a Claude Code session connected to the server:
   a. `sovereign_check_env` returns a structured result.
   b. `sovereign_deploy` against a sample `dist/` on testnet
      completes end-to-end, receiving `bag_id`, `dashboard_url`, and
      a non-error result.
   c. The agent sees `awaiting_signature` progress with a
      `signing_url` and can hand it off.
   d. Cancelling mid-deploy returns `ERR_CANCELLED` and no daemon
      is left running.
4. `src/sdk/` has zero `console.*` calls (verified by lint).
5. `npx ton-sovereign-deploy …` works unchanged for v0.6 users.
6. JSON Schema snapshot test passes.

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
