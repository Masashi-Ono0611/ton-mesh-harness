# `docs/` index

A map of the project's documentation. Docs are kept **in place** (they're
tightly cross-referenced — see the historical record for design rationale),
and classified here as **Current**, **Reference**, or **Historical** so it's
obvious what reflects the shipped product vs. what's a point-in-time record.

> The live status dashboard is [`dashboard.html`](./dashboard.html).
> Release notes live in the repo-root [`CHANGELOG.md`](../CHANGELOG.md).

## Current — reflects the shipped product

These describe how the kit works today; keep them accurate.

| Doc | What |
|---|---|
| [`v0.9/daemon-service-mode.md`](./v0.9/daemon-service-mode.md) | `--daemon-mode` (embedded/detached/service) + launchd/systemd ownership (#37) |
| [`v0.9/mcp-http-transport.md`](./v0.9/mcp-http-transport.md) | `ton-sovereign-mcp --http` transport, auth, CORS, threat model (#33) |
| [`v0.9/provenance.md`](./v0.9/provenance.md) | signed `.well-known/ton-deploy.json` manifest + `verify-provenance` (#34) |
| [`v0.9/release-runbook.md`](./v0.9/release-runbook.md) | daemon version bump + SHA-256 refresh workflow (#32) |
| [`v0.9/agent-compat.md`](./v0.9/agent-compat.md) | cross-agent MCP discovery config + red-team protocol (#35) |
| [`v0.8/agent-stack-compose.md`](./v0.8/agent-stack-compose.md) | composing the kit + `@ton/mcp` for an agent (mainnet flow) |
| [`v0.8/agentic-cli-usage.md`](./v0.8/agentic-cli-usage.md) | `--wallet-mode agentic` prerequisites / selectors / CI |
| [`v0.8/e2e-runbook.md`](./v0.8/e2e-runbook.md) | V3 mainnet MCP E2E reproduction + testnet rehearsal |
| [`v0.8/mcp-core-requirements.md`](./v0.8/mcp-core-requirements.md) | the MCP server spec (F1–F5 / NF) — authoritative reference |
| [`v0.8/release-checklist.md`](./v0.8/release-checklist.md) | the GA cut ritual (`release.sh` + npm + GitHub release) |
| [`v0.6/byo-rldp-http-proxy.md`](./v0.6/byo-rldp-http-proxy.md) | bring-your-own rldp-http-proxy for `--site-adnl` |
| [`provider-contract.md`](./provider-contract.md) | storage-provider contract reference (`--provider`, currently dormant) |

## Reference — pending / external-facing artifacts

| Doc | What |
|---|---|
| [`v0.8/announcements-draft.md`](./v0.8/announcements-draft.md) | GA-day announcement copy (execute post-publish, #39) |
| [`v0.8/ton-org-skills-pr-draft.md`](./v0.8/ton-org-skills-pr-draft.md) | draft PR body for the ton-org/skills listing |

## Historical — point-in-time records (archived in place; not current)

Kept for design rationale + provenance. They describe a past state and are
**not** maintained against the shipped product.

- **v0.8 planning** — `v0.8/agent-native-pivot.md`, `v0.8/concept-update-2026-05-10.md`,
  `v0.8/at-mcp-probe.md` (the agent-surface pivot design; the pivot has shipped).
- **v0.7** — `v0.7/roadmap-draft.md` (C2/C3 → #29/#30 reserve),
  `v0.7/c1-design-notes.md`, `v0.7/provider-probe-2026-05-10.md`.
- **v0.6** — `v0.6/roadmap-draft.md`, `v0.6/ecosystem-watch-2026-05.md`,
  `v0.6/sites-record-discovery.md`.
- **v0.5** — `v0.5/round-postmortem.md` (provider-economy dormancy, still cited),
  `v0.5/lane-b-self-generated-boc.md` (the `--span` BOC design), and the
  resolved max-span upstream saga (`v0.5/lane-b-max-span-status.md`,
  `v0.5/upstream-issue-max-span.md`, `v0.5/next-research-plan.md`).

> `docs/research/` is per-developer scratch (telegram archives, etc.) and is
> **git-ignored** — not part of the published docs.
