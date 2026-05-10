# v0.7 plan — agent-native pivot

**Drafted:** 2026-05-10
**Status:** Plan only. v0.6 must finish (B3.x) before any of this lands.
**Goal:** Reposition the kit from "CLI a human runs" to "SDK + MCP server + skill that an AI agent autonomously discovers and invokes." The CLI continues to work — it just stops being the primary surface.

## Why now

Three things landed in the past 30 days that make this the right pivot
window (full evidence: `docs/v0.6/ecosystem-watch-2026-05.md`):

1. **`mcp.ton.org` launched** (2026-05-01). MCP is now the canonical
   way agents talk to TON. We want to be in that registry.
2. **Agentic Wallets standard** announced same day. Solves the agent
   signing problem we've been hand-waving.
3. **`ton-org/skills` repo** is the curated skills directory. Listing
   ourselves there is how agents find us via search/training corpora.
4. **Bot API 10.0** (2026-05-08) added guest-bot agentic flows — the
   "agents acting on behalf of users in TG" pattern is now mainstream.
5. **MTONGA Step 3** (Telegram becomes TON's driving force, late May)
   will likely come with new dev tools. We want our agent surface
   ready before anyone else's reference implementation lands.

## Current state vs target experience

### Current (v0.6) — CLI-first

```bash
npx ton-sovereign-deploy ./dist --domain myprotocol.ton
# human watches output, approves wallet sign, leaves laptop on
```

The kit assumes a human:
- Decides to use it
- Reads the README
- Runs the binary
- Approves a TonConnect QR in their wallet app
- Keeps the daemon alive on their machine

### Target (v0.7) — agent-native

User asks Claude / Cursor / a custom agent:

> "Deploy this directory to my .ton domain. I have an agentic wallet
> already set up."

The agent:
1. **Discovers** the kit via MCP registry / skill catalogue / npm
   keywords — without the user naming it.
2. **Reads** the kit's machine-readable capability declaration (input
   schema, prerequisites, cost estimate, failure modes).
3. **Validates** prerequisites by calling the kit's `check` tool
   (wallet present? domain owned? UDP port free? build dir healthy?).
4. **Invokes** `deploy` via MCP, passing structured input. Receives
   structured progress events and a structured result.
5. **Handles** the "site stays live only while daemon runs" constraint
   by either:
   a) keeping the user's local daemon process supervised, or
   b) provisioning a remote daemon (cheap VPS, Fly.io, etc.) when
      the user opts in.
6. **Reports** back to the user with: bag id, .ton URL, dashboard URL,
   liveness state, next-step suggestions.

**The CLI stays.** Power users and CI keep using it. But the new
primary user is an agent, and every kit decision after v0.7 is judged
against "does this make agent flows clearer / less error-prone?"

## Architecture: what has to change

The kit already has a partly-typed programmatic surface
(`runDeployTonutils(opts, buildDir) → TonutilsDeployReturn`). But the
entry layer is CLI-shaped. We need to invert the layering:

```
Today                       v0.7
─────                       ────
cli.ts (commander)          packages/sdk/        ← pure programmatic core
  └── runDeploy*()            ├── deploy()
       └── inline IO         ├── checkEnv()
                             ├── status()
                             └── events emitter (structured progress)

                            packages/cli/        ← thin wrapper, today's UX
                            packages/mcp/        ← MCP server (stdio + http)
                            packages/skill/      ← markdown skill for ton-org/skills
```

Concretely:

- **No console output in the SDK core.** Progress is emitted as typed
  events. The CLI subscribes and renders; the MCP server subscribes
  and forwards as MCP `notifications/progress`.
- **All CLI flags become a single `DeployOptions` object** with JSON
  Schema generated from it. No flag without a schema entry.
- **Errors are typed.** `EnvCheckError`, `WalletSignError`,
  `DaemonSpawnError`, `DnsTxError`, etc. Each has a stable `code` an
  agent can branch on (e.g. `ERR_NO_WALLET`, `ERR_PORT_BUSY`).
- **`check` is a first-class tool** (not just `doctor`). Returns
  structured `{ ready: bool, missing: [...], warnings: [...] }`.
- **Idempotency.** Calling `deploy` twice with the same source dir +
  domain produces the same bag id and either short-circuits or
  no-ops on DNS if the record already matches.

## Phased shipping plan

### P0 — Programmatic core extraction (~3 days)
Refactor `cli.ts` into a thin wrapper around a new `src/sdk/` module.

- `src/sdk/deploy.ts` — `deploy(opts) → AsyncIterable<DeployEvent>` or
  callback-based. No `console.*`, no spinners, no `process.exit`.
- `src/sdk/check.ts` — `checkEnv(opts) → CheckResult`. Pulls logic out
  of `cli/doctor.ts`.
- `src/sdk/status.ts` — `getStatus(deploymentId) → StatusResult`. Reads
  the existing `~/.ton-sovereign-deploy/state` files.
- `src/cli/*` becomes pure adapter: parse flags → call SDK → render
  events to terminal.
- All existing tests still pass. Add SDK unit tests.

**Ships:** semver-minor (0.7.0). CLI behaviour unchanged.

### P1 — MCP server (~5 days)
New package surface (still single repo for now): `src/mcp/`.

- Tools (MCP `tools/list` definitions):
  - `sovereign_deploy` — input: source dir, domain, options. Output:
    bag id, dns tx hash, dashboard URL, watch handle.
  - `sovereign_check_env` — pre-flight readiness probe.
  - `sovereign_status` — query an in-flight or completed deployment.
  - `sovereign_redeploy` — trigger redeploy on an existing watch
    handle (for agents wanting to push updates).
  - `sovereign_stop_watch` — graceful daemon shutdown.
- Schemas via zod → JSON Schema. Schemas double as the SDK's typing
  source of truth.
- Stdio transport first (Claude Code / Cursor compatibility). HTTP
  transport later (P4) for remote agent platforms.
- `bin: { ton-sovereign-mcp: ./dist/mcp.js }` so users run
  `npx ton-sovereign-mcp` from any agent that supports stdio MCP.

**Ships:** 0.7.0 alongside SDK.

### P2 — Skill package (~2 days)
A markdown skill following the Anthropic Claude Code skill format and
the `ton-org/skills` conventions. One file: `skills/sovereign-deploy.md`.

Sections required:
- **When to use** — "User wants to publish a static site to TON
  Storage with a `.ton` domain that is censorship-resistant."
- **Prerequisites** — Node ≥ 18, build directory, `.ton` domain owned,
  wallet (TonConnect or Agentic Wallet), enough TON for DNS write.
- **Steps** — call `sovereign_check_env`, then `sovereign_deploy`,
  then either keep `--watch` daemon alive or arrange remote hosting.
- **Common mistakes** — UDP port 17555 collision with TON Browser.app,
  empty `.ton` resolution due to TONAPI lag, mainnet provider
  economy is dormant (don't suggest `--provider`).
- **Examples** — three: minimal deploy, with custom domain, with
  ADNL tunnel.

PR this skill to `ton-org/skills`. Land local copy in repo regardless
so users not going through that path still get it via npm.

**Ships:** 0.7.0 in repo. PR submission separate timeline.

### P3 — Agent-friendly signing & daemon lifecycle (~5-7 days)
The two hard problems agents hit. Decide before P3 starts (open
questions section below). Provisional plan:

- **Signing**: integrate Agentic Wallet alongside TonConnect.
  - If `opts.wallet === 'agentic'`, use the agentic-wallet SDK for
    autonomous signing.
  - If `opts.wallet === 'tonconnect'`, current QR flow continues
    (agent reports the URL to the user, user approves, agent waits).
  - Default: auto-detect (agentic wallet present? use it. else
    TonConnect.).
- **Daemon hosting**: add three documented modes.
  - `local` (today): daemon stays alive on user's machine.
  - `detached`: daemon written as a launchd / systemd unit so it
    survives reboot. Kit ships templates.
  - `remote`: kit can SSH to a user-provided VPS, install daemon,
    register the public IP. v0.7 ships `remote` as opt-in only —
    no SaaS, no "we manage it for you".

**Ships:** 0.7.x patch releases, may slip past 0.7.0.

### P4 — Discoverability (~2 days)
Make agents find this without the user spelling out the package name.

- npm: keywords += `mcp`, `mcp-server`, `agent-skill`, `ton`,
  `agentic-wallet`, `claude-skill`. Description rewritten to lead with
  "MCP server / skill for sovereign static-site publishing on TON."
- README: new top-level **"Quickstart for agents"** section preceding
  the human one. Code blocks an agent can copy.
- `mcp.ton.org` registry — submit if they have a registration flow.
  Otherwise wait for one and track in a follow-up issue.
- A `.well-known/agent-manifest.json` route the dashboard exposes
  when running, so agents querying `localhost:<port>/.well-known/`
  find a self-description.

**Ships:** 0.7.0 (keywords + README), 0.7.x for the rest.

### P5 — Observability for agents (~2 days)
Agents need machine-readable state.

- `--json-output` already exists; expand to cover all phases (today
  it's success-only).
- Dashboard exposes `/api/status` returning the same JSON shape the
  MCP `sovereign_status` tool returns.
- Errors include `code`, `severity` (`fatal` | `recoverable`),
  `next_action_hint` (string an agent can show the user).

**Ships:** 0.7.x.

## Hard problems / open questions

These need a user decision before P3 starts. Defaults are my recommendation.

### Q1 — Signing model
- **(a) Agentic Wallet first, TonConnect fallback** ← recommended
- (b) TonConnect-only (delegated session); skip Agentic Wallet until v0.8
- (c) Both, equal-status, user picks per call

Recommendation: (a). Agentic Wallets are the announced TON-native
path for autonomous agents and the standard is fresh — early adopters
shape the spec. TonConnect stays as the fallback so nothing breaks.

### Q2 — Daemon lifecycle for agent flows
- **(a) Local + detached, no remote** ← recommended for v0.7.0
- (b) Local + detached + opt-in remote (kit SSHes to user-provided VPS)
- (c) Local + detached + managed remote (we run a SaaS hosting service)

Recommendation: (a) for v0.7.0, (b) for v0.7.x once we've seen agent
usage. (c) is a different business model and needs its own decision.

### Q3 — Repo layout
- (a) Single repo, multiple bin entries (`ton-sovereign-deploy`,
  `ton-sovereign-mcp`) ← recommended
- (b) Monorepo with `@sovereign-deploy/sdk`, `@sovereign-deploy/cli`,
  `@sovereign-deploy/mcp` packages
- (c) Separate repos

Recommendation: (a). Lower release friction. Migrate to (b) only if
package boundaries become a real maintenance pain.

### Q4 — Naming for the agent surface
The npm package is `ton-sovereign-deploy`. The MCP tool prefix should
match. Options:
- (a) `sovereign_deploy`, `sovereign_check_env`, etc. ← recommended
- (b) `ton_sovereign_deploy`, `ton_sovereign_check_env`
- (c) `tsd_deploy`, `tsd_check_env`

Recommendation: (a). Short, unique enough, no clash with TON's own
`ton_*` namespace which `mcp.ton.org` will likely use.

## What v0.7 explicitly does NOT do

- ❌ No SaaS hosting plane. Daemon stays on infra the user controls.
- ❌ No telemetry / analytics. Agent calls remain private.
- ❌ No replacement of TonConnect for human users. Default human flow
  is unchanged from v0.6.
- ❌ No coupling to a specific agent runtime (Claude Code / Cursor /
  OpenAI Agents). MCP is the only contract.

## Decision criteria for shipping 0.7.0

- P0 SDK refactor passes all v0.6 tests.
- P1 MCP server boots and a Claude Code agent can deploy a sample
  `dist/` to testnet end-to-end without human CLI invocation
  (one-shot mainnet test before tagging).
- P2 skill is in the repo; PR to `ton-org/skills` is open (not
  necessarily merged).
- P4 README + npm keywords land.
- P3 + P5 may slip into 0.7.x — they're refinements, not gates.

## Out-of-scope for v0.7, parked for v0.8

- Multi-deploy orchestration (one agent deploying many sites).
- Remote daemon SaaS / managed hosting.
- Provider economy reintegration (waiting on ecosystem; tracked in
  `docs/v0.5/round-postmortem.md` and `docs/v0.6/roadmap-draft.md`).
- TSA Audit Skill integration in CI (parked in
  `docs/v0.6/ecosystem-watch-2026-05.md`).

## Next step

Review this doc, lock the four open questions (Q1–Q4), then I'll
break P0 into tickets and start the SDK refactor.
