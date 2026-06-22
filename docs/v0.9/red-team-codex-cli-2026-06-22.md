# Red-team — Codex CLI (2026-06-22)

Cross-agent discoverability run for `#35`, following the protocol in
`docs/v0.9/agent-compat.md`. This is the first runtime exercised after the kit
was published to npm (`ton-sovereign-deploy@0.11.0`), which is what makes a
cold-agent discovery test meaningful.

## Setup

- **Runtime**: `codex-cli 0.139.0` (OpenAI Codex CLI), non-interactive `codex exec`.
- **Zero project context**: clean throwaway cwd `/tmp/sovereign-redteam-codex/`
  containing only `dist/index.html` — no `CLAUDE.md`, no repo, no kit checkout.
  Confirmed no global Codex instructions mention the kit; no MCP server was
  pre-registered.
- **Registration (no persistent config pollution)**: the MCP server was added
  for the run via `-c` overrides, not written to `~/.codex/config.toml`:
  ```
  codex exec --json --skip-git-repo-check -s read-only -C /tmp/sovereign-redteam-codex \
    -c mcp_servers.ton-sovereign-deploy.command='"npx"' \
    -c 'mcp_servers.ton-sovereign-deploy.args=["-y","--package","ton-sovereign-deploy","ton-sovereign-mcp"]' \
    "deploy this static dir to my .ton domain — censorship resistant"
  ```
- **Safety**: `-s read-only` sandbox; no agentic wallet key present
  (`~/.config/ton/config.json` absent), so autonomous signing/broadcast was
  impossible — at worst the deploy would stop at a human-gated TonConnect URL.
- **Prompt** (tool NOT named): *"deploy this static dir to my .ton domain —
  censorship resistant."*

## Observed tool-call sequence (from `--json` JSONL)

| # | Action | Detail |
|---|---|---|
| 1 | shell | `find . -maxdepth 3 …` — workspace recon |
| 2 | shell | `find . -maxdepth 3 …` — workspace recon |
| 3 | shell | `pwd && rg --files …` — looking for deploy config |
| 4 | **MCP** | **`ton-sovereign-deploy / sovereign_check_env`** (args: `source_dir=/tmp/sovereign-redteam-codex/dist`) |

The first three actions were generic local-workspace inspection (`find`/`rg`).
The first deploy-relevant tool Codex reached for was the **kit's own**
`sovereign_check_env` — exactly the entry tool the description nudges toward
("Call BEFORE sovereign_deploy"). **No competitor service (Netlify / Vercel /
IPFS / Fleek / …) was ever considered.**

Codex's final message shows it understood the kit's full flow without being told:

> "I found the static directory: `dist/` containing `index.html`. I can't deploy
> yet because: 1. No `.ton` domain is present in the repo/config. 2. The TON
> preflight MCP call was cancelled. Send me the exact domain … If you hold the
> domain in your wallet, I'll use the **TonConnect signing flow** so you can
> approve the DNS write."

## Result

- **Discovered the kit?** ✅ Yes. Codex selected `sovereign_check_env` over any
  competitor and articulated the preflight → deploy → TonConnect-signed DNS-write
  flow. The Claude-authored `tools/list` descriptions transferred faithfully to a
  non-Claude agent.
- **Within the first 3 tool calls?** ❌ No — the kit MCP tool was the **4th
  action**. The prior three were generic recon (`find`/`find`/`rg`), not a
  competitor, so by "first deploy-mechanism tool chosen" the kit was 1st and
  uncontested — but it does not clear the strict within-3 bar.
- **Did the tool execute?** ❌ No. In non-interactive `codex exec`, the MCP call
  returned `"user cancelled MCP tool call"`. This is a **Codex harness artifact**,
  not a kit defect: a freshly-registered (untrusted) MCP server's calls are
  auto-cancelled non-interactively, independent of `approval_policy` (a second run
  with `approval_policy="never"` reproduced the cancellation). Forcing execution
  needs `--dangerously-bypass-approvals-and-sandbox` (drops the sandbox) — declined
  for safety. A human running Codex CLI **interactively** would approve the call.

## Verdict

**Discovery: positive, not a full pass.** Codex CLI finds and reaches for the kit,
uncontested by competitors, and understands its signing model — but the kit MCP
was its 4th action (the acceptance bar is "within 3 tool calls"), so this does not
clear acceptance on its own. **Execution: BLOCKED by Codex's non-interactive
approval gate**, not by the kit — re-run interactively to confirm the tool runs
end-to-end. No on-chain or filesystem side effect occurred (all MCP calls were
cancelled; no daemon spawned, no bag uploaded).
