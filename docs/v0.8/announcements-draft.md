# v0.8.0 GA announcement playbook (#39)

Pre-written, paste-and-go copy for GA day. Fill the `<…>` placeholders
once the gates close, then execute top-to-bottom.

## Placeholders to fill on GA day

| Token | Source |
|---|---|
| `<NPM_URL>` | https://www.npmjs.com/package/ton-sovereign-deploy |
| `<RELEASE_URL>` | the GitHub release page for `v0.8.0` |
| `<V3_TRANSCRIPT>` | #18 comment link (mainnet E2E transcript) |
| `<V4_RESULT>` | #26 result — did the agent reach `sovereign_deploy` within 3 commands? |
| `<DEMO_GIF>` | asciinema / gif of an agent driving the deploy |

> Cross-check: do NOT announce before #18 (V3) + #26 (V4) have passed and
> the package is live on npm (release-checklist steps 6–7). The V4 result
> is the headline — if it failed, fix discoverability artifacts first
> (#24/#25), don't announce.

---

## 1. Twitter / X thread

> **1/**
> Claude can now deploy your website to `.ton` — censorship-resistant,
> no server, no CDN, no domain registrar.
>
> Just say "deploy this static dir to my .ton domain" and the agent does
> the rest: TON Storage upload + TON DNS write, signed by your wallet.
>
> 🧵

> **2/** 30-second demo — an AI agent discovering and driving the deploy
> end-to-end, no tool named by the user:
> `<DEMO_GIF>`

> **3/** Self-host first. One command:
> ```
> npx ton-sovereign-deploy ./build --watch
> ```
> Or wire it as an MCP server (`ton-sovereign-mcp`) and let your agent
> call it. MIT, open source: <RELEASE_URL>

> **4/** The "whoa" test we gated GA on (#26): a fresh agent session, zero
> context, one prompt — *"deploy this static dir to my .ton domain"*.
> Result: `<V4_RESULT>`.
>
> Aligned with TON's digital-resistance stack (TON Proxy + ADNL Tunnel).

> **Bonus reply:** cc @anthropic @claude_ai @ton_blockchain — agent-native
> deploy tooling for the censorship-resistant web.

---

## 2. Telegram

### `@tondev_eng` (TON developers chat)

> **Sovereign Deploy Kit v0.8.0 is live** 🚀
> One-command CLI + MCP server to publish a static site to TON Storage +
> `.ton` DNS, self-hosted from your own machine. Agent-callable — Claude
> (or any MCP client) can drive the whole deploy.
>
> `npx ton-sovereign-deploy ./build --watch`
>
> npm: `<NPM_URL>`
> Designed for the digital-resistance stack — a web that can't be taken
> down. Feedback / issues welcome.

### `@TONStorageDev` / `@tonstorage` (if active)

> New tool for TON Storage builders: **Sovereign Deploy Kit** wraps
> bag creation + `.ton` DNS storage-record write into one command, seeds
> from your own tonutils-storage daemon (`--watch` keeps it alive). Also
> exposes an MCP server so AI agents can create + publish bags. v0.8.0:
> `<NPM_URL>`

### Japanese TON community channels

> **Sovereign Deploy Kit v0.8.0 is live** 🚀
> A CLI + MCP server that publishes a static site to TON Storage + `.ton`
> DNS in **one command**. Self-hosted — it seeds from your own machine, so
> no server, no CDN, no registrar. AI agents (Claude, etc.) can drive the
> whole flow over MCP.
>
> `npx ton-sovereign-deploy ./build --watch`
>
> npm: `<NPM_URL>` — MIT, OSS. For people building a censorship-resistant web.

---

## 3. dev.ton.org forum (new thread under "Tooling")

**Title**: Sovereign Deploy Kit v0.8.0 — agent-native `.ton` static-site deploy (CLI + MCP)

**Body**:

> Released v0.8.0 of Sovereign Deploy Kit — a one-command CLI + MCP server
> that publishes a static site to TON Storage and points a `.ton` domain
> at it via TON DNS, seeded from your own daemon (self-host first).
>
> What's new in the v0.8 agent-surface track:
> - MCP server (`ton-sovereign-mcp`) with 3 tools: `sovereign_check_env`,
>   `sovereign_deploy`, `sovereign_status`
> - Agentic signing (autonomous, via a key shared with `@ton/mcp`) +
>   TonConnect (human-approved) paths
> - Real on-chain `dns_tx_hash`
>
> Install: `npx ton-sovereign-deploy ./build --watch`
> npm: `<NPM_URL>`
> Release + full README: `<RELEASE_URL>`
> Roadmap: https://github.com/Masashi-Ono0611/sovereign-deploy-kit/issues/4
> Mainnet E2E transcript (V3): `<V3_TRANSCRIPT>`
>
> Aligned with the TON digital-resistance stack (TON Proxy + ADNL Tunnel
> + Payment Network). Feedback and bug reports welcome.

---

## 4. Registries

- **Anthropic skill registry** — if a submission process exists by GA day,
  submit `skills/sovereign-deploy.md`. (Check the current registry intake
  before GA; the format may have moved.)
- **ton-org/skills PR** — merge / re-open per `docs/v0.8/ton-org-skills-pr-draft.md`;
  re-point it at the `v0.8.0` GA tag.

## 5. Hacker News (optional)

- Show HN: "Sovereign Deploy Kit — AI agents deploy your site to a
  censorship-resistant `.ton` domain" → `<RELEASE_URL>`
- Timing: Tue–Wed, ~8–10am US Eastern is the conventional sweet spot.
  Weigh against bandwidth to respond to comments same-day.

---

## 6. Post-launch monitoring

**Day-after**:
- [ ] Watch GitHub issues + Discussions; respond within 24h.
- [ ] Watch the Telegram threads + Twitter replies for confusion / bugs.
- [ ] Note the first-install friction points reported.

**Week-after**:
- [ ] Triage reported bugs → `hotfix/0.8.x` branch (per release-checklist
      rollback section). Deprecate-don't-unpublish if a critical bug ships.
- [ ] Capture discoverability signal: did anyone find it agent-first (the
      P2'/P4 moat) vs. link-first? Feeds the v0.9 discoverability work.

## Out of scope (per #39)

Paid marketing, Discord/Slack (TON is Telegram-native), conference mentions.
