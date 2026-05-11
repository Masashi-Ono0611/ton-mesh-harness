# Draft PR text — adding `sovereign-deploy` to `ton-org/skills`

**Target repo:** https://github.com/ton-org/skills (per `docs.ton.org/ecosystem/ai/mcp`)
**Upstream layout:** unknown without inspecting the upstream tree at PR time. Per a 2026-05-10 spot-check, skills appear to live under top-level group dirs (e.g. `wallets/`, `docs/`) with second-level directories containing a `SKILL.md` file. Confirm the exact target path with the upstream maintainer before opening.
**Suggested target:** `deploy/sovereign-deploy/SKILL.md` (or wherever the maintainer points).
**Our skill source:** [`skills/sovereign-deploy.md`](../../skills/sovereign-deploy.md) in this repo

The actual PR opens at v0.8.0 GA per [D5] #25. This file is the prepared text plus an internal pre-submit checklist.

---

## PR title

`Add sovereign-deploy: censorship-resistant static-site publishing skill (TON Storage + .ton DNS)`

## PR body

### Why

This skill fills a gap in the TON skills directory: a one-call "deploy a
static site to .ton" flow. Existing skills cover wallet operations,
on-chain transactions, and docs search, but not the upload-to-TON-Storage
+ write-.ton-DNS path that DeFi-frontend, journalism, and DAO-frontend
builders need to escape takedown.

`ton-sovereign-deploy` has been on npm since 2026-05-10. v0.8 ships an
MCP server (`ton-sovereign-mcp`) plus an `agentic` signing path that
composes with `@ton/mcp` at the `~/.config/ton/config.json` filesystem
level (no inter-MCP RPC needed).

### What this PR adds

- `<group>/sovereign-deploy/SKILL.md` (verbatim from [our in-repo
  copy](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/blob/main/skills/sovereign-deploy.md))
- whatever package descriptor this directory expects (point at the
  upstream npm package: `ton-sovereign-deploy`)

### Verification

- Open a fresh Claude Code / Cursor session
- User prompt: *"deploy this static dir to my .ton domain — censorship resistant"*
- Agent should discover the skill via `ton-org/skills`, install via
  `npx -y --package ton-sovereign-deploy ton-sovereign-mcp`, run
  `sovereign_check_env`, then `sovereign_deploy`.

### Compose with @ton/mcp

The skill is intentionally compatible with `@ton/mcp@alpha` for agentic
wallet flows. Both servers read/write the same `~/.config/ton/config.json`
(no inter-MCP RPC). Documented inline in the skill md.

### License

MIT. Source: https://github.com/Masashi-Ono0611/sovereign-deploy-kit

Happy to iterate on the file layout / naming / description per repo
conventions — point us at the right group dir and we'll move the file.

---

## Internal pre-submit checklist (NOT part of the PR body)

- [ ] v0.8.0 GA is tagged and published to npm (rc5 is feature-complete; GA = V3+V4 acceptance)
- [x] The in-repo `skills/sovereign-deploy.md` is current — documents rc5 end-to-end MCP flow (TonConnect + agentic) ✅ 2026-05-11
- [x] `templates/.well-known/mcp.json` template is in `main` ✅
- [ ] `[V4]` red-team agent test (rc1 path AND GA path) has passed at least once and the transcript is checked in
- [ ] Confirmed the actual upstream `ton-org/skills` directory layout (likely `<group>/<skill-name>/SKILL.md`); update this draft accordingly before opening
- [ ] No private TON Foundation pre-coordination required — open the PR cold through the public submission process
