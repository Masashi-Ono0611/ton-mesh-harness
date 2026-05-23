# Cross-agent compatibility (#35)

V4 (#26) validates agent-discoverability for **Claude Code** — the v0.8.0
single-agent GA contract. This doc extends the V4 red-team across other
mainstream agent runtimes (Cursor, Codex CLI, Continue, Aider) and tracks
the discoverability rate.

## Status

- **Execution is manual + publish-gated.** A cold agent can only discover
  `ton-sovereign-mcp` once it's on npm (#38 publish parked) and/or in the
  agent's skill registry. Run these after publishing.
- This file documents each agent's discovery mechanism, a reference config,
  the red-team protocol, and a results table to fill in.

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
5. Save the transcript to `docs/v0.9/red-team-<agent>-<YYYY-MM-DD>.md`.

## Acceptance

At least **3 of 4** agents discover + use the kit within 3 tool calls. If
fewer, iterate on the under-performing artifact:
- `tools/list` descriptions (may be too Claude-flavored — see `src/mcp.ts`).
- Skill markdown (`skills/sovereign-deploy.md` — Anthropic format may not
  transfer).
- `templates/.well-known/mcp.json` (may need an agent-specific shape).

## Results

| Agent | Date | Discovered? | First tool | Within 3 calls? | Notes |
|---|---|---|---|---|---|
| Claude Code | — | (V4 #26) | | | the GA gate |
| Cursor | — | ☐ | | | |
| Codex CLI | — | ☐ | | | |
| Continue | — | ☐ | | | |
| Aider (CLI) | — | ☐ | | | CLI-discovery, not MCP |

## Out of scope

CI automation of cross-agent runs (manual is the v0.9 standard);
self-hosted agent platforms (Open Hands, AutoGPT, …) — too varied.
