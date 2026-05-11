# Draft PR text — adding `sovereign-deploy` to `ton-org/skills`

**Target repo:** https://github.com/ton-org/skills (per `docs.ton.org/ecosystem/ai/mcp`)
**Upstream layout:** `packages/<skill-name>/` per the existing `@ton/mcp` pattern (the agentskills.io spec)
**Our skill source:** [`skills/sovereign-deploy.md`](../../skills/sovereign-deploy.md) in this repo

The actual PR opens at v0.8.0 GA per [D5] #25. This file is the prepared text.

---

## PR title

`Add @ton/sovereign-deploy: sovereign static-site publishing skill (TON Storage + .ton DNS)`

## PR body

### Why

`ton-org/skills` is the curated TON skills directory. The static-site-on-TON
niche is currently empty — `@ton/mcp` covers wallet ops / on-chain tx /
docs search, but nothing covers the "publish a build directory to TON
Storage with a `.ton` DNS record" flow that DeFi-frontend / journalism /
DAO-frontend builders need to escape takedown.

`ton-sovereign-deploy` fills that gap. It's been on npm since 2026-05-10
and ships an MCP server (`ton-sovereign-mcp`) since v0.8.0-rc2 plus the
`agentic-wallet` Path 2 that composes with `@ton/mcp` at the
`~/.config/ton/config.json` filesystem level.

### What this PR adds

- `packages/sovereign-deploy/skill.md` — the skill file (verbatim from
  [our in-repo copy](https://github.com/Masashi-Ono0611/sovereign-deploy-kit/blob/main/skills/sovereign-deploy.md))
- `packages/sovereign-deploy/package.json` (or whatever convention this
  repo uses) — points at the upstream npm package

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

---

## Pre-submit checklist (for the maintainer)

- [ ] v0.8.0 GA is tagged and published to npm
- [ ] The in-repo `skills/sovereign-deploy.md` is current
- [ ] `templates/.well-known/mcp.json` template is in `main`
- [ ] [V4] red-team agent test (rc1 path AND GA path) has passed at least once
- [ ] No private TON Foundation pre-coordination needed (open PR cold per the public submission process)
