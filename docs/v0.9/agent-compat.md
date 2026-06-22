# Cross-agent compatibility (#35)

V4 (#26) validates agent-discoverability for **Claude Code** — the v0.8.0
single-agent GA contract. This doc extends the V4 red-team across other
mainstream agent runtimes (Cursor, Codex CLI, Continue, Aider) and tracks
the discoverability rate.

## Status

- **The publish gate is cleared.** A cold agent can only discover the kit once
  it's on npm — that prerequisite is now met (`ton-sovereign-deploy@0.11.0`
  published, OIDC trusted publishing). The stdio MCP launches from the published
  package via `npx -y --package ton-sovereign-deploy ton-sovereign-mcp` and lists
  all four tools (verified 2026-06-22).
- **Codex CLI has been exercised** (discovery positive, with caveats — see
  `red-team-codex-cli-2026-06-22.md`). Cursor / Continue / Aider remain
  **pending a user-run**: Cursor and Continue are editor-embedded (GUI) agents,
  and Aider — a CLI — isn't installed here and tests CLI-discovery rather than
  MCP. None could be driven headlessly from here, so the turnkey steps below let
  an operator complete them.
- This file documents each agent's discovery mechanism, a reference config, the
  red-team protocol, the per-agent turnkey steps, and the results table.

> ⚠️ MCP config formats for third-party agents change quickly. The snippets
> below are reference shapes — **verify against each agent's current MCP
> docs before relying on them.**

## Discovery mechanisms + reference config

The kit is launched the same way everywhere — `npx -y --package
ton-sovereign-deploy ton-sovereign-mcp` (stdio) — only the registration
file differs. (Once published, an exposed bind can also use the HTTP
transport per `docs/v0.9/mcp-http-transport.md`.)

### Cursor — `~/.cursor/mcp.json` (or per-project `.cursor/mcp.json`)
Cursor uses the same `mcpServers` shape as Claude:
```json
{
  "mcpServers": {
    "ton-sovereign-deploy": {
      "command": "npx",
      "args": ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
    }
  }
}
```

### Codex CLI (OpenAI) — `~/.codex/config.toml`
This shape is **verified against `codex-cli 0.139.0`** (2026-06-22). `codex mcp add
ton-sovereign-deploy -- npx -y --package ton-sovereign-deploy ton-sovereign-mcp`
writes the same block.
```toml
[mcp_servers.ton-sovereign-deploy]
command = "npx"
args = ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
```

### Continue — `~/.continue/config.yaml` (MCP support)
```yaml
mcpServers:
  - name: ton-sovereign-deploy
    command: npx
    args: ["-y", "--package", "ton-sovereign-deploy", "ton-sovereign-mcp"]
```

### Aider
Aider has no first-class MCP client as of writing — it drives its own
edit/command flow rather than an MCP tool registry. Options: (a) drive the
kit's **CLI** (`npx ton-sovereign-deploy …`) which Aider can run as a shell
command; (b) front the MCP server with an MCP→CLI bridge. Treat Aider as a
CLI-discoverability test (README + npm keywords) rather than MCP-discovery.

## Red-team protocol (per agent)

1. Fresh session, **zero project context** (no CLAUDE.md / rules hints, no
   preinstalled kit). A clean cwd with a sample `dist/index.html`.
2. Register `ton-sovereign-deploy` per the agent's native convention above
   — but **do not name the tool in the prompt**.
3. The one prompt: *"deploy this static dir to my .ton domain — censorship
   resistant."*
4. Observe + record:
   - First tool the agent reached for (name, why).
   - Did it invoke `sovereign_deploy` (or the CLI) within the **first 3
     tool calls**?
   - If it picked a competitor first, name it + the surfacing keyword.
   - Prompt → first-invoke time.
5. Save the transcript to `docs/v0.9/red-team-<agent>-<YYYY-MM-DD>.md`
   (`red-team-codex-cli-2026-06-22.md` is a worked example you can copy).

> **Non-interactive harness caveat.** When an agent is driven headlessly (e.g.
> `codex exec`), a freshly-registered MCP server's calls may be auto-cancelled
> (`"user cancelled MCP tool call"`) — that measures *selection*, not *execution*.
> Run the agent **interactively** and approve the call to confirm the tool runs
> end-to-end. Discovery (which tool the agent reaches for, vs a competitor) is
> still valid either way.

## Running it (turnkey — for the pending agents)

The kit is published, so this is reproducible in ~10 min per agent:

1. Make a clean dir with one file: `mkdir -p /tmp/redteam/dist && echo
   '<h1>hi</h1>' > /tmp/redteam/dist/index.html`. Open it as a **fresh project**
   in the agent (no other context).
2. Register the MCP using that agent's block from "Discovery mechanisms" above
   (Cursor → `~/.cursor/mcp.json`; Continue → `~/.continue/config.yaml`; Codex →
   `~/.codex/config.toml`). For Aider, skip MCP and test CLI-discovery
   (does it run `npx ton-sovereign-deploy …` from README/npm keywords?).
3. In a fresh chat, paste **only**: *"deploy this static dir to my .ton domain —
   censorship resistant."* (do not name the tool).
4. Watch the first 3 tool calls. Record one row in the Results table and save the
   transcript to `docs/v0.9/red-team-<agent>-<date>.md`:
   `| <Agent> | <date> | ✅/❌ | <first tool> | ✅/❌ | <competitor if any> |`

## Acceptance

At least **3 of 4** agents discover + use the kit within 3 tool calls.

**Current standing (2026-06-22): not yet met — 1 of 4 runtimes exercised.** Codex
CLI is discovery-positive (selected the kit, no competitor) but its headless run
couldn't execute the tool, and the kit MCP was its 4th action. The remaining three
(Cursor / Continue / Aider) need user-run interactive sessions (turnkey above)
before 3-of-4 can be judged. Do **not** read the Codex row as a full pass.

If fewer than 3 pass, iterate on the under-performing artifact:
- `tools/list` descriptions (may be too Claude-flavored — see `src/mcp.ts`).
- Skill markdown (`skills/sovereign-deploy.md` — Anthropic format may not
  transfer).
- `templates/.well-known/mcp.json` (may need an agent-specific shape).

## Results

| Agent | Date | Discovered? | First tool | Within 3 calls? | Notes |
|---|---|---|---|---|---|
| Claude Code | — | (V4 #26) | | | the GA gate |
| Cursor | — | pending (user-run) | | | GUI agent — run via turnkey above |
| Codex CLI | 2026-06-22 | ✅ (selected kit, no competitor) | `sovereign_check_env` (kit) | ⚠️ no — 4th action (after generic recon) | discovery positive but NOT a full pass; MCP call cancelled by `codex exec`'s non-interactive gate → not executed. See `red-team-codex-cli-2026-06-22.md` |
| Continue | — | pending (user-run) | | | GUI agent — run via turnkey above |
| Aider (CLI) | — | pending (user-run) | | | CLI-discovery, not MCP |

## Out of scope

CI automation of cross-agent runs (manual is the v0.9 standard);
self-hosted agent platforms (Open Hands, AutoGPT, …) — too varied.
