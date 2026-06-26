# `docs/` index

A map of the project's documentation. **Current** + **Reference** docs live
here under `docs/`; **Historical** point-in-time records are archived under
[`docs/archive/`](./archive/) (all inbound links were updated on the move).

> The live status dashboard is [`dashboard.html`](./dashboard.html).
> Release notes live in the repo-root [`CHANGELOG.md`](../CHANGELOG.md).

## Current — reflects the shipped product

These describe how the kit works today; keep them accurate.

| Doc | What |
|---|---|
| [`v0.10/site-hosting.md`](./v0.10/site-hosting.md) | hosting a `.ton` site end-to-end — `site-record` / `--site-auto` / `--site-keyring` / cloud reachability / `--daemon-mode service` (#77–#81) |
| [`v0.9/daemon-service-mode.md`](./v0.9/daemon-service-mode.md) | `--daemon-mode` (embedded/detached/service) + launchd/systemd ownership for bag seeders **and** site gateways (#37) |
| [`v0.9/mcp-http-transport.md`](./v0.9/mcp-http-transport.md) | `ton-mesh-harness-mcp --http` transport, auth, CORS, threat model (#33) |
| [`v0.9/provenance.md`](./v0.9/provenance.md) | signed `.well-known/ton-deploy.json` manifest + `verify-provenance` (#34) |
| [`v0.9/release-runbook.md`](./v0.9/release-runbook.md) | daemon version bump + SHA-256 refresh workflow (#32) |
| [`v0.9/agent-compat.md`](./v0.9/agent-compat.md) | cross-agent MCP discovery config + red-team protocol (#35) |
| [`v0.8/agent-stack-compose.md`](./v0.8/agent-stack-compose.md) | composing the kit + `@ton/mcp` for an agent (mainnet flow) |
| [`v0.8/agentic-cli-usage.md`](./v0.8/agentic-cli-usage.md) | `--wallet-mode agentic` prerequisites / selectors / CI |
| [`v0.8/e2e-runbook.md`](./v0.8/e2e-runbook.md) | V3 mainnet MCP E2E reproduction + testnet rehearsal + Stage 3 cancellation gate (§1.6) |
| [`v0.8/mcp-core-requirements.md`](./v0.8/mcp-core-requirements.md) | the MCP server spec (F1–F5 / NF) — authoritative reference |
| [`v0.9/release-checklist.md`](./v0.9/release-checklist.md) | the GA cut ritual (`vX.Y.Z` tag push → OIDC auto-publish) |
| [`v0.6/byo-rldp-http-proxy.md`](./v0.6/byo-rldp-http-proxy.md) | bring-your-own rldp-http-proxy for `--site-adnl` (see `v0.10/site-hosting.md` for the auto / persistent / service flow) |
| [`provider-contract.md`](./provider-contract.md) | storage-provider contract reference (`--provider`, currently dormant) |

## Reference — pending / external-facing artifacts

| Doc | What |
|---|---|
| [`v0.8/announcements-draft.md`](./v0.8/announcements-draft.md) | GA-day announcement copy (execute post-publish, #39) |
| [`v0.8/ton-org-skills-pr-draft.md`](./v0.8/ton-org-skills-pr-draft.md) | draft PR body for the ton-org/skills listing |

## Historical — point-in-time records → [`docs/archive/`](./archive/)

Kept for design rationale + provenance; **not** maintained against the
shipped product. See [`archive/README.md`](./archive/README.md) for the full
list. Summary:

- **[`archive/v0.8/`](./archive/v0.8/)** — the agent-surface pivot design
  (`agent-native-pivot`, `concept-update-2026-05-10`, `at-mcp-probe`). Shipped.
- **[`archive/v0.7/`](./archive/v0.7/)** — `roadmap-draft` (C2/C3 → #29/#30),
  `c1-design-notes`, `provider-probe-2026-05-10`.
- **[`archive/v0.6/`](./archive/v0.6/)** — `roadmap-draft`,
  `ecosystem-watch-2026-05`, `sites-record-discovery`.
- **[`archive/v0.5/`](./archive/v0.5/)** — `round-postmortem` (provider
  dormancy), `lane-b-self-generated-boc` (the `--span` BOC design), + the
  resolved max-span upstream saga.

> The TON ecosystem Telegram archive (formerly `docs/research/`) moved to
> **ton-atlas** (`research/telegram-archive/`, still local-only) on 2026-06-06 —
> all TON ecosystem research is consolidated there. The scraper moved too
> (`ton-atlas/scripts/scrape-tg-channel.py`); refresh via the `ton-research-refresh` skill.
