# v0.8 plan — agent-surface track (parallel to self-host UX track)

**Drafted:** 2026-05-10 (v0.9 → v0.8 renumber, "pivot" → "agent-surface track")
**Status:** Plan only. v0.7 is shipped (`--site-auto` lives, `runDeployTonutils` is the seam this track will refactor).
**Goal:** Open an **agent-surface track** parallel to the v0.6/v0.7 self-host-UX track. Ship `ton-sovereign-mcp` (an MCP server an AI agent can invoke), an SDK underneath with no console IO, and the multi-channel discoverability artifacts that let an agent find the kit without being told its name. **The CLI continues to work and remains the human entry point** — agent-surface is *additive*, not a replacement.

> **Renamed 2026-05-10 (concept update):** this was originally drafted as
> v0.9 and labelled "agent-native pivot." After the [concept update](concept-update-2026-05-10.md)
> the track is v0.8.0 (parallel, not pivot) and the v0.7-deferred C2 NAT +
> C3 Payments now occupy the v0.9 reserve slot. The "pivot" framing is
> retired because the CLI does not stop being the primary surface — agents
> get their own surface, humans keep theirs.

## Why now

Multiple ecosystem signals from the past 30 days make the agent-surface
track the right work to open right now (full evidence: `docs/v0.6/ecosystem-watch-2026-05.md`,
verified by [P-1 probe](at-mcp-probe.md) Phase 2.75 landscape findings):

1. **MCP-as-canonical for agent ↔ blockchain interop.** The Anthropic
   Skills/Plugins/MCP three-tier taxonomy is settled; agents discover
   tools via multiple channels (npm keywords, `awesome-mcp-servers`,
   `glama.ai`, `mcpmarket.com`, `.well-known/mcp.json`, vendor skill
   directories). **Note:** `mcp.ton.org` is *not* a third-party
   registry — it's a landing page for the official `@ton/mcp` server.
   Earlier drafts of this doc assumed it would be a discovery moat; the
   [P-1 probe](at-mcp-probe.md) corrected that.
2. **`@ton/mcp` exists and is agentic-wallet-first.** `npx -y @ton/mcp@alpha`
   manages autonomous signing keys at `~/.config/ton/config.json`. This
   solves the "how does an agent sign?" question for autonomous flows.
   It does **not** do TonConnect — see Architecture below.
3. **`ton-org/skills` repo** is the curated TON skills directory.
   Adding `skills/sovereign-deploy.md` to it (PR at v0.8.0 GA per [D5] #25)
   lands us in the canonical TON skill catalogue.
4. **Bot API 10.0** (2026-05-08) added guest-bot agentic flows — the
   "agents acting on behalf of users in TG" pattern is now mainstream.
5. **MTONGA Step 3** (Telegram becomes TON's driving force, late May)
   will likely come with new dev tools. We want our agent surface
   ready before anyone else's reference implementation lands.

Static-site-on-TON is **empty in agent-skill-land** (per P-1 landscape
audit). Whoever ships the first useful + indexed + copy-pastable +
credible-TON-aligned answer claims the canonical position.

## Current state vs additive agent-surface

### Current (v0.7) — CLI for humans

```bash
# Human-signed, BYO daemon (default)
npx ton-sovereign-deploy ./dist --domain myprotocol.ton

# Self-host with auto-spawn rldp-http-proxy (v0.7 C1)
npx ton-sovereign-deploy ./dist --domain myprotocol.ton --site-auto
```

The kit assumes a human:
- Decides to use it
- Reads the README
- Runs the binary
- Approves a TonConnect QR in their wallet app
- Keeps the daemon alive on their machine (with `--watch` or daemonised separately)

This continues to work in v0.8.0 unchanged. **The agent-surface track is additive.**

### Additive (v0.8) — agent-surface

User asks Claude / Cursor / a custom agent:

> "Deploy this directory to my .ton domain. I have an agentic wallet
> already set up."

The agent:
1. **Discovers** the kit via npm keywords (`mcp`, `mcp-server`, `agent-skill`,
   `ton`, `claude-skill`), README "Agent quickstart" section, in-repo
   `skills/sovereign-deploy.md`, `templates/.well-known/mcp.json`,
   `awesome-mcp-servers` listings, or the `ton-org/skills` PR (multi-channel
   per the [P-1 probe](at-mcp-probe.md) landscape findings).
2. **Reads** the kit's machine-readable capability declaration (`tools/list`
   JSON Schema generated from zod).
3. **Validates** prerequisites by calling `sovereign_check_env`
   (wallet present? domain owned? UDP port free? build dir healthy?).
4. **Invokes** `sovereign_deploy` via MCP, passing structured input
   (`wallet: {kind: "tonconnect" | "agentic", ...}`). Receives structured
   progress events and a structured result.
5. **Handles** the "site stays live only while daemon runs" constraint
   by either:
   a) keeping the user's local daemon process supervised, or
   b) provisioning a remote daemon (cheap VPS, Fly.io, etc.) — out of
      scope for v0.8.0 (deferred to 0.8.x).
6. **Reports** back to the user with: bag id, .ton URL, dashboard URL,
   liveness state, next-step suggestions.

**The CLI stays the human entry point.** Agents use the MCP server. The
v0.7 CLI flow (TonConnect QR via wallet app) is unchanged for humans.
Every kit decision after v0.8 is judged against "does this make *both*
agent flows and human flows clearer / less error-prone?"

## Architecture: what has to change

The kit already has a partly-typed programmatic surface
(`runDeployTonutils(opts, buildDir) → TonutilsDeployReturn`). But the
entry layer is CLI-shaped. We need to invert the layering:

```
Today (v0.7)                v0.8
────────────                ────
src/cli.ts (commander)      src/sdk/             ← pure programmatic core
  └── runDeploy*()            ├── deploy.ts
       └── inline IO         ├── check.ts
                             ├── schemas.ts      ← single zod source of truth
                             └── events.ts       ← typed progress events

                            src/cli/             ← thin wrapper, today's UX
                            src/mcp.ts           ← MCP server (stdio)
                            skills/sovereign-deploy.md   ← skill markdown
                            templates/.well-known/mcp.json
```

(Single repo, dual `bin` entries — `ton-sovereign-deploy` and `ton-sovereign-mcp` —
not a monorepo split. Per OQ#3 in `concept-update-2026-05-10.md`.)

Concretely:

- **No console output in the SDK core.** Progress is emitted as typed
  events. The CLI subscribes and renders; the MCP server subscribes
  and forwards as MCP `notifications/progress`. Lint-enforced (`src/sdk/`
  has zero `console.*`).
- **All CLI flags become a single `DeployOptions` object** with JSON
  Schema generated from it. No flag without a schema entry.
- **Wallet is a discriminated union**, not a substring. Two signing paths
  per the [P-1 probe verdict](at-mcp-probe.md):

  ```ts
  wallet: {kind: "tonconnect", connector: "Tonkeeper"}    // Path 1 (default)
        | {kind: "agentic", config_path?, wallet_label?}  // Path 2 (new in v0.8.0)
  ```

  - **Path 1 (TonConnect, human-signed):** v0.6/v0.7 carryover. Wallet QR /
    deep-link surfaced via `awaiting_signature` event with a `signing_url`.
    `@ton/mcp` is **not** involved; this is the existing kit's TonConnect
    connector.
  - **Path 2 (agentic, autonomous):** the SDK reads `~/.config/ton/config.json`
    (or `$TON_CONFIG_PATH`) directly via `@ton/walletkit` — the same loader
    `@ton/mcp` uses. Picks the active or labeled wallet, signs the DNS-write
    BOC internally. `@ton/mcp` is a *peer* MCP server an agent may also load
    for unrelated wallet/swap/NFT/DNS-resolve operations, but `ton-sovereign-mcp`
    does **not** call into it via MCP-RPC. The integration is at the filesystem
    level (shared on-disk config), not at the protocol level.
- **Errors are typed.** `EnvCheckError`, `WalletSignError`,
  `DaemonSpawnError`, `DnsTxError`, etc. Each has a stable `code` an
  agent can branch on (e.g. `ERR_NO_WALLET`, `ERR_PORT_BUSY`,
  `ERR_DNS_SIGN_REJECTED` — the latter Path 1 only).
- **`check` is a first-class tool** (`sovereign_check_env`, not just
  `doctor`). Returns structured `{ ready: bool, missing: [...], warnings: [...] }`.
- **Idempotency.** Calling `deploy` twice with the same source dir +
  domain produces the same bag id and either short-circuits or
  no-ops on DNS if the record already matches.
- **Cancellation is best-effort post-`awaiting_signature`.** See
  `mcp-core-requirements.md` F4 for the realistic semantics — the wallet
  may sign and broadcast even after agent cancellation in Path 1; in Path
  2, cancellation is effective up until the broadcast moment.

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

**Ships:** semver-minor (0.8.0). CLI behaviour unchanged.

### P1 — MCP server (~5 days)
New package surface (still single repo for now): `src/mcp/`.

- **GA tools (exactly 2, per `mcp-core-requirements.md` In Scope):**
  - `sovereign_deploy` — input: source dir, domain, `WalletSpec`, options. Output: bag id, dns tx hash, dashboard URL, optional daemon handle.
  - `sovereign_check_env` — pre-flight readiness probe.
- **Deferred to v0.8.x** (do NOT implement at GA): `sovereign_status`, `sovereign_redeploy`, `sovereign_stop`. Validate the two-tool contract first; expand once agent usage shows the need.
- Schemas via zod → JSON Schema. Schemas double as the SDK's typing source of truth.
- Stdio transport first (Claude Code / Cursor compatibility). HTTP
  transport later (P4) for remote agent platforms.
- `bin: { ton-sovereign-mcp: ./dist/mcp.js }` (dual-bin in the same `ton-sovereign-deploy` npm package). MCP client config invokes via `--package`:
  `{"command":"npx","args":["-y","--package","ton-sovereign-deploy","ton-sovereign-mcp"]}`.

**Ships:** 0.8.0 alongside SDK.

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

**Ships:** 0.8.0 in repo. PR submission separate timeline.

### P3a — Agent-friendly signing (resolved by [P-1] verdict; ships at GA in v0.8.0)

- The `wallet` field is a discriminated union (Path 1 = TonConnect human-signed,
  Path 2 = agentic via shared `@ton/walletkit` config). Both are first-class
  in v0.8.0. No auto-detection — the caller chooses explicitly. CLI default
  remains TonConnect for backwards compat.
- `@ton/mcp` is **not** imported. Path 2 reads `~/.config/ton/config.json`
  via `@ton/walletkit` directly. See `mcp-core-requirements.md` §F2 and §NF6.

**Ships:** 0.8.0 GA (week 6, alongside the MCP server).

### P3b — Daemon lifecycle (deferred to v0.8.x)

Three documented modes:
  - `local` (today): daemon stays alive on user's machine.
  - `detached`: daemon written as a launchd / systemd unit so it
    survives reboot. Kit ships templates.
  - `remote`: kit can SSH to a user-provided VPS, install daemon,
    register the public IP. Opt-in only — no SaaS, no "we manage it for you".

**Ships:** 0.8.x patch releases (after 0.8.0 GA). Daemon lifecycle is
orthogonal to the agent-surface track — not a v0.8.0 GA gate.

### P4 — Discoverability (PROMOTED to v0.8.0 In Scope per concept update)

Originally scheduled to be split across v0.8.0 (keywords + README) and v0.8.x
(everything else). The [concept update](concept-update-2026-05-10.md) moves
multi-channel discoverability fully into v0.8.0 — it's the moat (P4 premise).
rc1 ([D4] #24) and GA ([D5] #25) split as follows:

**rc1 (week 1):**
- npm keywords += `mcp`, `mcp-server`, `agent-skill`, `ton`, `claude-skill`
- README "Agent quickstart" section near the top, pointing at the existing
  CLI (rc1 doesn't have MCP server yet)

**GA (week 6):**
- In-repo `skills/sovereign-deploy.md` referencing the now-stable MCP tool
  names (`sovereign_deploy`, `sovereign_check_env`)
- `templates/.well-known/mcp.json` — MCP-server self-description for the
  local dashboard. **Not** a provenance manifest; distinct from the
  `.well-known/ton-deploy.json` axis from concept-update Phase 3.5 which is
  noted as a candidate for future versions only.
- PR to `ton-org/skills` opened referencing the in-repo skill md

**Explicitly deferred to 0.8.x:**
- `mcp.ton.org` registry submission — no submission flow exists today
  (`mcp.ton.org` is a curated landing page for the official `@ton/mcp`,
  not a third-party registry; see [P-1 probe](at-mcp-probe.md) Phase 2.75).
  Revisit when a flow exists.

**Ships:** rc1 + GA, both in 0.8.0.

### P5 — Observability for agents (~2 days)
Agents need machine-readable state.

- `--json-output` already exists; expand to cover all phases (today
  it's success-only).
- Dashboard exposes `/api/status` returning the same JSON shape the
  MCP `sovereign_status` tool returns.
- Errors include `code`, `severity` (`fatal` | `recoverable`),
  `next_action_hint` (string an agent can show the user).

**Ships:** 0.8.x.

## Hard problems / open questions

Q1 (signing) and Q3 (repo layout) are resolved. Q2 (daemon lifecycle) and Q4 (naming) below.

### Q1 — Signing model — DECIDED (`(c)` resolved by [P-1] verdict)

The original three options were `(a) Agentic Wallet first` / `(b) TonConnect-only` /
`(c) Both, equal-status, user picks per call`.

**Resolved: (c)**, with the discriminated union schema in `mcp-core-requirements.md`
§F2. CLI default remains TonConnect (Path 1) for backwards compat with v0.6/v0.7
users; `--wallet-mode agentic` opts in to Path 2. `@ton/mcp` is not bundled —
Path 2 reads its config file via `@ton/walletkit`. See [P-1 probe](at-mcp-probe.md)
for the full rationale.

### Q2 — Daemon lifecycle for agent flows
- **(a) Local + detached, no remote** ← recommended for v0.8.0
- (b) Local + detached + opt-in remote (kit SSHes to user-provided VPS)
- (c) Local + detached + managed remote (we run a SaaS hosting service)

Recommendation: (a) for v0.8.0, (b) for v0.8.x once we've seen agent
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

Recommendation: (a). Short, unique enough. `@ton/mcp` already uses
non-prefixed verbs (`get_wallet`, `send_ton`, `resolve_dns`, ...) so a
namespace clash is unlikely; `sovereign_*` keeps our domain explicit
without inheriting any registry-namespace assumption.

## What v0.8 explicitly does NOT do

- ❌ No SaaS hosting plane. Daemon stays on infra the user controls.
- ❌ No telemetry / analytics. Agent calls remain private.
- ❌ No replacement of TonConnect for human users. Default human flow
  is unchanged from v0.6.
- ❌ No coupling to a specific agent runtime (Claude Code / Cursor /
  OpenAI Agents). MCP is the only contract.

## Decision criteria for shipping 0.8.0

- P0 SDK refactor passes all v0.6 tests.
- P1 MCP server boots and a Claude Code agent can deploy a sample
  `dist/` to testnet end-to-end without human CLI invocation
  (one-shot mainnet test before tagging).
- P2 skill is in the repo; PR to `ton-org/skills` is open (not
  necessarily merged).
- P4 README + npm keywords land.
- P3 + P5 may slip into 0.8.x — they're refinements, not gates.

## Out-of-scope for v0.8, parked for later (v0.9+ / v1.0)

> v0.9 now reserves C2 NAT traversal + C3 Payment Network (formerly the
> v0.8 parked slot, renumbered after the 2026-05-10 concept update). Items
> below are *not* assigned a specific version; they sit beyond the agent
> surface track and will be slotted as ecosystem signals warrant.

- Multi-deploy orchestration (one agent deploying many sites).
- Remote daemon SaaS / managed hosting.
- Provider economy reintegration (waiting on ecosystem; tracked in
  `docs/v0.5/round-postmortem.md` and `docs/v0.6/roadmap-draft.md`).
- TSA Audit Skill integration in CI (parked in
  `docs/v0.6/ecosystem-watch-2026-05.md`).

## Next step

Review this doc, lock the four open questions (Q1–Q4), then I'll
break P0 into tickets and start the SDK refactor.
