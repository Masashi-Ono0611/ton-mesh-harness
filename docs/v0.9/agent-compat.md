# Cross-agent compatibility (#35)

V4 (#26) validates agent-discoverability for **Claude Code** — the v0.8.0
single-agent GA contract. This doc extends the V4 red-team across the **other
CLI / MCP agent runtimes in current use** and tracks the discoverability rate.

## Roster (updated 2026-06-22)

The original issue named **Cursor / Continue / Aider**. That list is from an
earlier landscape and has been re-scoped to the **current CLI agent candidates**
(each one's actual MCP-drivability is recorded per agent below — confirmed here
only for Codex CLI and Claude Code registration; Gemini / Antigravity unconfirmed):

| In roster now | Why | Dropped from original | Why dropped |
|---|---|---|---|
| **Claude Code** | the GA reference (V4 #26) | | |
| **Codex CLI** (OpenAI) | installed, MCP via `config.toml`, headless `exec` | **Cursor** | editor-embedded (GUI); not headless-drivable; not in current use here |
| **Antigravity** (`agy`, Google) | installed, headless `-p` | **Continue** | editor-embedded (GUI) |
| **Gemini CLI** (Google) | installed, MCP via settings, headless `-p` | **Aider** | no first-class MCP client; would only be a CLI-discovery test |

The kit is launched the same way everywhere — `npx -y --package
ton-mesh-harness ton-mesh-harness-mcp` (stdio) — only the registration differs.

## Status

- **The publish gate is cleared.** A cold agent can only discover the kit once
  it's on npm — that prerequisite is now met (`ton-mesh-harness@0.11.0`,
  OIDC trusted publishing). The stdio MCP launches from the published package via
  `npx -y --package ton-mesh-harness ton-mesh-harness-mcp` and lists all four
  tools (verified on local `dist/mcp.js` and the published npx path, 2026-06-22).
- **One clean cross-agent data point: Codex CLI** (discovery positive — see
  `red-team-codex-cli-2026-06-22.md`). The other current runtimes could **not** be
  red-teamed cleanly headlessly from here (2026-06-22 — see "Headless drivability"
  below); interactive runs remain the reliable path for them.

> ⚠️ MCP config formats for third-party agents change quickly. Blocks below are
> reference shapes unless marked **verified** — **check each agent's current MCP
> docs before relying on them.**

## Discovery mechanisms + reference config

### Claude Code — `--mcp-config <file>` or project `.mcp.json`
Uses the standard `mcpServers` shape. **Verified 2026-06-22**: `claude -p …
--mcp-config <file> --strict-mcp-config` registered the server (init reported
`ton-mesh-harness`).
```json
{
  "mcpServers": {
    "ton-mesh-harness": {
      "command": "npx",
      "args": ["-y", "--package", "ton-mesh-harness", "ton-mesh-harness-mcp"]
    }
  }
}
```

### Codex CLI (OpenAI) — `~/.codex/config.toml`
**Verified against `codex-cli 0.139.0`** (2026-06-22): `codex mcp add
ton-mesh-harness -- npx -y --package ton-mesh-harness ton-mesh-harness-mcp`
writes the identical block.
```toml
[mcp_servers.ton-mesh]
command = "npx"
args = ["-y", "--package", "ton-mesh-harness", "ton-mesh-harness-mcp"]
```

### Antigravity (`agy`, Google) / Gemini CLI — `.gemini/settings.json` (workspace or `~/.gemini/`)
Reference shape (Gemini-style `mcpServers`; **not yet confirmed loaded** for these
two — see Headless drivability). Both are launched headlessly with `-p`.
```json
{
  "mcpServers": {
    "ton-mesh-harness": {
      "command": "npx",
      "args": ["-y", "--package", "ton-mesh-harness", "ton-mesh-harness-mcp"]
    }
  }
}
```

## Red-team protocol (per agent)

1. Fresh session, **zero project context** (no global agent instructions that
   mention the kit, no preinstalled kit). A clean cwd with a sample `dist/index.html`.
2. Register `ton-mesh-harness` per the agent's native convention above
   — but **do not name the tool in the prompt**.
3. The one prompt: *"deploy this static dir to my .ton domain — censorship
   resistant."*
4. Observe + record: first tool reached for; did it invoke `mesh_deploy` /
   `mesh_check_env` (or the CLI) within the **first 3 tool calls**; did it
   pick a competitor first; prompt → first-invoke time.
5. Save the transcript to `docs/v0.9/red-team-<agent>-<YYYY-MM-DD>.md`
   (`red-team-codex-cli-2026-06-22.md` is a worked example you can copy).

## Headless drivability (2026-06-22 — why interactive runs are the reliable path)

Attempting to red-team the current roster *headlessly* (so a run is reproducible
and observable) hit concrete confounds. Recorded so future sessions don't repeat them:

- **Claude Code** — a fair cold test must suppress the user's global `CLAUDE.md` /
  memory (which is kit-aware). Isolating via `CLAUDE_CONFIG_DIR=<temp>` removes that
  context but **breaks auth** ("Not logged in"); copying credentials into the temp
  dir is blocked by the safety classifier. So Claude stays the **V4 #26 reference**
  rather than a re-run here.
- **Codex CLI** — works (see worked example). Caveat: in non-interactive `codex
  exec`, a freshly-registered MCP server's calls are auto-cancelled (`"user
  cancelled MCP tool call"`), so the run measures *selection*, not *execution*.
- **Gemini CLI** — **BLOCKED: no auth method configured** ("set an Auth method … or
  `GEMINI_API_KEY` …") — no Gemini auth/quota is set up on this machine.
- **Antigravity (`agy`)** — authenticated and runs, but **inconclusive**: it
  appears to reason over a *cached active project* rather than the clean throwaway
  cwd (zero-context not guaranteed), and its logs showed **no MCP connection** for
  the workspace `.gemini/settings.json` server — so a "didn't discover" can't be
  separated from "MCP not loaded". Needs interactive verification.

**Bottom line:** headless auto-red-teaming is reliable only for Codex here. For the
rest, run the agent **interactively** (turnkey below) — that's where MCP approval,
auth, and project scoping behave as a real user would experience them.

## Running it (turnkey — interactive)

The kit is published, so this is reproducible in ~10 min per agent:

1. Clean dir, one file: `mkdir -p /tmp/redteam/dist && echo '<h1>hi</h1>' >
   /tmp/redteam/dist/index.html`. Open it as a **fresh project** (no other context).
2. Register the MCP per the agent's block above (Claude → `--mcp-config` /
   `.mcp.json`; Codex → `~/.codex/config.toml`; Antigravity / Gemini →
   `.gemini/settings.json`).
3. Fresh chat, paste **only**: *"deploy this static dir to my .ton domain —
   censorship resistant."* (do not name the tool).
4. Watch the first 3 tool calls. Record one row in Results and save the transcript
   to `docs/v0.9/red-team-<agent>-<date>.md`:
   `| <Agent> | <date> | ✅/❌ | <first tool> | ✅/❌ | <competitor if any> |`

## Acceptance

Target: a majority of the current roster discover + use the kit within 3 tool calls.

**Current standing (2026-06-22): not met by automation — 1 clean data point.**
Codex CLI is discovery-positive (selected the kit, no competitor) but missed the
strict within-3-calls bar (kit MCP was its 4th action) and didn't execute. Claude
Code is the V4 #26 reference. Gemini is auth-blocked; Antigravity is inconclusive
headlessly. The honest read is that **interactive runs are required** to judge the
non-Codex agents — automation here couldn't.

If an agent under-performs once run, iterate on the under-performing artifact:
- `tools/list` descriptions (may be too Claude-flavored — see `src/mcp.ts`).
- Skill markdown (`skills/mesh-deploy.md` — Anthropic format may not transfer).
- `templates/.well-known/mcp.json` (may need an agent-specific shape).

## Results

| Agent | Date | Discovered? | First tool | Within 3 calls? | Notes |
|---|---|---|---|---|---|
| Claude Code | — | (V4 #26 reference) | | | GA gate; cold re-test confounded (auth vs. kit-aware global config) |
| Codex CLI | 2026-06-22 | ⚠️ selected kit, no competitor (not a full pass) | `mesh_check_env` (kit) | ❌ no — 4th action (after generic recon) | discovery positive but NOT a full pass; MCP call cancelled by `codex exec`'s non-interactive gate → not executed. See `red-team-codex-cli-2026-06-22.md` |
| Antigravity (`agy`) | 2026-06-22 | inconclusive | — | — | runs + authed, but cached-project context + MCP not observed loaded → needs interactive run |
| Gemini CLI | 2026-06-22 | blocked | — | — | no auth method configured on this machine |

## Out of scope

CI automation of cross-agent runs (manual is the standard); editor-embedded GUI
agents (Cursor / Continue) and non-MCP CLIs (Aider); self-hosted agent platforms
(Open Hands, AutoGPT, …) — too varied.
