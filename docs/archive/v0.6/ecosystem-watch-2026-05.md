# Ecosystem watch — 2026-05 (kit-side actionable summary)

Source: `docs/research/` Telegram channel archives (captured 2026-05-10),
covering the period **2026-04-10 → 2026-05-10**. This file distills only
what actually changes a v0.6+ kit decision; everything else stayed in the
raw archives for later grep.

## Things that changed but the kit was already correct on

Verified by grep across `*.md` / `*.ts` / `*.html` (excluding
`docs/research/`, `node_modules`, `dist`):

| Ecosystem change | Kit impact |
|---|---|
| TON network fees dropped 6× (~$0.0005/tx, fixed) on 2026-05-01 | No-op. Kit doesn't quote a fee figure anywhere. |
| ETH → TON Token Bridge V3 closed 2026-04-27 | No-op. Kit has zero references to `bridge-v3` / `bridge.ton.org`. |
| Rust TON node clarified as **mainnet-not-supported** (2026-05-04) | No-op. Kit pins to C++ reference impl already (`ton-blockchain/ton`, `storage-daemon` v2026.02-1, plus xssnick Go for `tonutils-storage`). No Rust-node code paths to remove. |
| dton.io GraphQL endpoint closes 2026-06-01 | No-op. Kit has no `dton.io` / `graphql.ton` / `dassets_bot` dependencies. |
| Validator min/max stake rising to 1M / 3M TON | No-op. Kit doesn't ship a validator-operation guide; `--watch` is end-user seeding, not validation. |

Net: **zero code/doc edits required** for the operational changes shipped
in the last 30 days. The kit's narrow scope (storage + DNS + optional
tunnel client + payment client interface) sat outside the blast radius.

## Things to actually track

### 1. MTONGA Step 3 — Telegram becomes TON's largest validator (2-3 weeks from 2026-05-04)

Durov (`@durov/501`, 2026-05-04):
> "Telegram replaces the TON Foundation as the driving force behind TON
> and becomes its largest validator. Timeline — 2-3 weeks. New ton.org,
> new dev tools, new performance upgrades."

Why this matters to the kit:

- `roadmap-draft.md` opens with "We're aligning with the **TON Core
  2025-03 official direction**". The technical content of that direction
  (Proxy + ADNL Tunnel + Payment Network) is independent of who runs the
  org chart, so the alignment claim stays accurate.
- However the **branding** ("TON Core", "TON Foundation") in our
  README/code may get re-issued under a Telegram-led umbrella. Wait for
  the new `ton.org` to land before sweeping rename — premature rewrites
  of historical attribution are worse than leaving them.
- Watch for **new dev tools** Durov mentions. If they ship an official
  CLI for the same surface our kit covers (storage bag → DNS publish),
  we need to decide: integrate, coexist, or refocus.

Action when Step 3 lands:
- Re-read `@durov`, `@toncore` for the launch posts.
- Diff our user-facing strings against any new official terminology.
- Decide kit positioning: "compatible with the new official tools" vs
  "alternative to" vs "obsolete by".

### 2. mcp.ton.org + Agentic Wallets (2026-05-01) and TSA Audit Skill (2026-04-23)

Two AI-adjacent surfaces appeared:

- `mcp.ton.org` — MCP (Model Context Protocol) endpoint for AI agents
  to act on TON. Open skills repo at `ton-org/skills`. Agentic Wallets
  standard is the underlying primitive.
- `tonsec.dev` TSA — symbolic-execution + LLM smart-contract auditor,
  free for TON devs. Detects unauthorized withdrawals, replay attacks,
  bounced-message mishandling at the bytecode level.

Neither is on the v0.6 critical path, but they're worth listing as
**v0.7+ optional integrations** because they fit the kit's audience:

- An **MCP skill** for the kit (`deploy bag from a directory + write DNS
  storage record`) would turn it into a primitive an AI agent can
  invoke. Low-effort, high-leverage if the agent-on-TON narrative grows.
- **TSA in CI** — the kit doesn't deploy smart contracts itself, but
  v0.5's `provider` path does call into `op::offer_storage_contract`
  (0x107c49ef). When v0.7 reintroduces provider support, running TSA
  against the contract code we sign would be a cheap belt-and-braces.

Action: park as v0.7 backlog, no v0.6 work.

### 3. Validator economics shift (informational)

`@durov/505`: TON is #1 in annual staking rewards among the top-50
cryptocurrencies. Stake threshold rising 824K-2.4M → 1M-3M TON. Total
validation stake passed 1B TON.

This doesn't touch the kit, but it's a signal that the validator pool
is rationalising upward — fewer, larger operators. If we ever ship a
"run a TON node alongside your bag-seeding daemon" feature, the
validator path would no longer be "spin up MyTonCtrl on a small VPS";
it'd be "use a staking pool". Useful framing for any future README
content about node-operation economics.

## Posture for the next watch (2026-06-10)

Re-run the scrapers when:

- Step 3 announcement lands (probably late May 2026 per Durov's "2-3
  weeks" comment).
- A user reports something we shipped looks outdated.
- We're about to start v0.7 planning (verify provider economy state,
  tunnel pool availability, MCP/TSA maturity).

Otherwise, **do nothing**. The 50 posts in this watch produced one new
backlog item (v0.7 MCP/TSA evaluation) and zero kit edits — exactly the
signal-to-noise ratio that justifies "no recurring scrape" as the
default policy.
