# Draft PR text — adding `mesh-deploy` to `ton-org/skills`

**Target repo:** https://github.com/ton-org/skills (per `docs.ton.org/ecosystem/ai/mcp`)
**Upstream layout:** unknown without inspecting the upstream tree at PR time. Per a 2026-05-10 spot-check, skills appear to live under top-level group dirs (e.g. `wallets/`, `docs/`) with second-level directories containing a `SKILL.md` file. Confirm the exact target path with the upstream maintainer before opening.
**Suggested target:** `deploy/mesh-deploy/SKILL.md` (or wherever the maintainer points).
**Our skill source:** [`skills/mesh-deploy.md`](../../skills/mesh-deploy.md) in this repo

The actual PR opens at v0.8.0 GA per [D5] #25. This file is the prepared text plus an internal pre-submit checklist.

---

## PR title

`Add mesh-deploy: censorship-resistant static-site publishing skill (TON Storage + .ton DNS)`

## PR body

### Why

This skill fills a gap in the TON skills directory: a one-call "deploy a
static site to .ton" flow. Existing skills cover wallet operations,
on-chain transactions, and docs search, but not the upload-to-TON-Storage
+ write-.ton-DNS path that DeFi-frontend, journalism, and DAO-frontend
builders need to escape takedown.

`ton-mesh-harness` has been on npm since 2026-05-10. v0.8 ships an
MCP server (`ton-mesh-harness-mcp`) plus an `agentic` signing path that
composes with `@ton/mcp` at the `~/.config/ton/config.json` filesystem
level (no inter-MCP RPC needed).

### What this PR adds

- `<group>/mesh-deploy/SKILL.md` (verbatim from [our in-repo
  copy](https://github.com/Masashi-Ono0611/ton-mesh-harness/blob/main/skills/mesh-deploy.md))
- whatever package descriptor this directory expects (point at the
  upstream npm package: `ton-mesh-harness`)

### Verification

- Open a fresh Claude Code / Cursor session
- User prompt: *"deploy this static dir to my .ton domain — censorship resistant"*
- Agent should discover the skill via `ton-org/skills`, install via
  `npx -y --package ton-mesh-harness ton-mesh-harness-mcp`, run
  `mesh_check_env`, then `mesh_deploy`.

### Compose with @ton/mcp

The skill is intentionally compatible with `@ton/mcp@alpha` for agentic
wallet flows. Both servers read/write the same `~/.config/ton/config.json`
(no inter-MCP RPC). Documented inline in the skill md.

### License

MIT. Source: https://github.com/Masashi-Ono0611/ton-mesh-harness

Happy to iterate on the file layout / naming / description per repo
conventions — point us at the right group dir and we'll move the file.

---

## Internal pre-submit checklist (NOT part of the PR body)

- [ ] v0.8.0 GA is tagged and published to npm (rc11 is feature-complete as of 2026-05-12; GA = V3+V4 acceptance per [V3] #18 + [V4] #26)
- [x] The in-repo `skills/mesh-deploy.md` is current — documents the rc11 3-tool MCP surface (`mesh_check_env`, `mesh_deploy`, `mesh_status`) for both TonConnect + agentic signing ✅ 2026-05-11 (rev: rc6 added `mesh_status`)
- [x] `templates/.well-known/mcp.json` template is in `main` ✅
- [ ] `[V4]` red-team agent test (rc1 path AND GA path) has passed at least once and the transcript is checked in
- [ ] Confirmed the actual upstream `ton-org/skills` directory layout (likely `<group>/<skill-name>/SKILL.md`); update this draft accordingly before opening
- [ ] No private TON Foundation pre-coordination required — open the PR cold through the public submission process
