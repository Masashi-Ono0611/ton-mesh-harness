# v0.8 concept update — 2026-05-10

**Status:** APPROVED (decisions made; doc edits pending — see Next Steps)
**Inputs:** `agent-native-pivot.md` (draft), `mcp-core-requirements.md` (draft), `docs/v0.7/roadmap-draft.md`
**Source session:** GStack `/office-hours` builder mode, with Codex cold-read second opinion
**Long-form artifact (personal, not committed):** `~/.gstack/projects/Masashi-Ono0611-sovereign-deploy-kit/masashi_mac_ssd-main-design-20260510-195207.md`

This doc records the concept-level decisions that update v0.8 framing. Implementation-level edits to `agent-native-pivot.md` and `mcp-core-requirements.md` happen in Next Steps #2–#3 below; both files are still valid until then.

---

## Summary of what changed

1. **"v0.8 pivot" → "v0.8 agent-surface track."** v0.8 is no longer framed as a CLI-to-MCP pivot. It's an agent-surface track running in parallel with the v0.6/v0.7 self-host-UX track. CLI usage doesn't drop. Different users (human builder vs AI agent), different concerns.
2. **`mcp.ton.org` is not a registry.** Verified during the session (May 2026): it's a landing page for two official TON MCP servers (TON Blockchain MCP + TON Documentation MCP). No third-party submission flow, no ranking algorithm. The original `agent-native-pivot.md` "Why now" point #1 needs revision.
3. **Discovery is multi-channel.** The wedge for agent discovery in 2026 is `npm keywords` + README "Agent quickstart" + in-repo skill markdown + `.well-known/mcp.json` + listings on `modelcontextprotocol/servers`, `glama.ai`, `mcpmarket.com`, `pulsemcp.com`, `ton-org/skills`. Single-registry positioning is vanity.
4. **Compose with `@ton/mcp`, don't compete.** Wallet primitives, signing, raw tx, TON DNS resolution are *delegated* to `@ton/mcp` upstream — not deferred. `ton-sovereign-deploy` MCP server scope narrows to the deploy domain (bag upload, daemon lifecycle, DNS storage/site record write, liveness verification). This eliminates the Q1 (Agentic Wallet vs TonConnect) decision in `agent-native-pivot.md` from the v0.8.0 critical path.
5. **`.well-known/ton-deploy.json` provenance manifest (Codex's "View Source + Fork + Redeploy" axis) — noted as a candidate for future versions, not committed.** Recorded here as future direction; no TEP commitment in this doc.
6. **Approach selected: B (parallel full v0.8.0)** over reviewer-recommended A (skill-first weekend ship). Honest framing: the rc1 milestone (week 1) effectively re-introduces A's outcome as a checkpoint inside B's trajectory ("A then B" in execution).

---

## Premises (post-session, Codex-refined)

| # | Premise | Status |
|---|---|---|
| P1 | Agent discovery wedge is multi-channel content discoverability (skill md + npm keywords + `.well-known/mcp.json` + vendor skill directories), not "MCP server first." | Agreed |
| P2' | **First useful + indexed + copy-pastable + credible TON-aligned** mover claims canonical, not "first mover" alone. *(Refined from original P2 by Codex challenge.)* | Agreed (refined) |
| P3 | v0.7 (self-host UX, target = human builder) and v0.8 (agent surface, target = AI agent) are orthogonal in design but **sequential in execution** for a solo maintainer. | Agreed (with solo-bandwidth honesty) |
| P4 | Real moat is owning the query "deploy a static site to .ton" across skill text, npm metadata, README, examples, `.well-known` manifests — not single-registry rank. | Agreed |
| P5 | "Pivot" framing is misleading. Agent-surface track opens in parallel with v0.6/v0.7. May need to ship before v0.7 because the discoverability moat has time pressure that v0.7 does not. | Agreed |

The Eureka behind P1/P4: `mcp.ton.org` was assumed to be the canonical TON MCP registry by `agent-native-pivot.md`. It isn't. That assumption needs to be removed wherever it appears in v0.8 docs.

---

## Open Questions — resolutions

| OQ | Decision |
|---|---|
| OQ#0 — Trigger to abandon B and fall back to A | If a competitor ships a TON-deploy MCP / skill before our 0.8.0-rc1 tag (~week 1), abandon B's GA-first sequencing and re-stage as Approach A's full scope. Re-evaluate B as v1.0. Watch: weekly grep of `ton-org/skills`, `modelcontextprotocol/servers`, `glama.ai`, `mcpmarket.com` for "TON" + "deploy" / "TON Storage" / ".ton DNS". |
| OQ#1 — rc1 scope | RESOLVED. rc1 (week 1) ships: README "Agent quickstart" pointing to existing CLI + npm keyword update. Does NOT ship: skill md, `.well-known/mcp.json`, MCP server itself. Required artifacts: README + npm only. |
| OQ#2 — `@ton/mcp` compose contract | PROMOTED to P-1 (must verify before P0). 4-hour memo to `docs/v0.8/at-mcp-probe.md`. **P0 SDK extraction cannot begin until this memo lands.** |
| OQ#3 — Provenance manifest scheduling | RESOLVED (no commitment). Noted as candidate; revisit after 0.8.0 ships. |
| OQ#4 — TON Foundation endorsement path | Post-0.8.0 strategy, not a 0.8.0 ship gate. Defer the explicit ask (PR to `ton-org/skills`, TON docs listing, a TON-aligned reference deploy on `.ton`) to a separate post-launch decision. |
| OQ#5 — CLI-vs-MCP feature parity | RESOLVED. **SDK is source of truth; CLI and MCP are both adapters.** CLI may add human-only ergonomics but does not gain capabilities the SDK lacks. Lock this in v0.8.0 NF1. |
| OQ#6 — Solo-bandwidth allocation | RESOLVED (c). v0.8.0 (agent surface) and v0.9 (C2 NAT + C3 Payments, formerly v0.7-deferred) interleave week-by-week. Within v0.9, C2 (`adnl-tunnel-client` NAT traversal) is priority; C3 follows once C2 has a real tunnel pool. SDK-extraction weeks are v0.8.0-only because `runDeployTonutils` is the shared seam. *(Note: v0.7 C1 + C4 + C5.1 are already shipped in v0.7.0 today. Original concept-update assumed C1 was pending; corrected after the 2026-05-10 audit.)* |
| OQ#7 — Gateway 2026 calendar fit | RESOLVED (moot). Gateway 2026 has been cancelled as an event (confirmed 2026-05-10). The original 3-option choice is no longer applicable. Ship 0.8.0 without external calendar pressure. Nominal v0.8.0 timeline stretches 3 → ~5–6 weeks under interleave. |

---

## `@ton/mcp` compose handoff (assumption to verify in P-1)

```
1. Agent loads two MCP servers: @ton/mcp (stdio) and ton-sovereign-mcp (stdio).
2. Agent calls @ton/mcp::wallet_connect → wallet session is established and
   persisted to ~/.tonconnect/<session>.json (or @ton/mcp's actual cache path).
3. Agent calls ton-sovereign-mcp::sovereign_deploy({source_dir, domain, wallet}).
4. ton-sovereign-mcp's deploy implementation reads the same TonConnect cache
   file (file-based session sharing, no inter-MCP RPC). If absent,
   sovereign_deploy returns ERR_NO_WALLET with fix_hint pointing the agent at
   @ton/mcp::wallet_connect.
5. DNS sign request emits awaiting_signature progress; agent surfaces
   signing_url to human.
6. After signature, sovereign_deploy completes; bag_id + dns_tx_hash returned.
```

If `@ton/mcp` does not write its session to a discoverable on-disk cache, design a thin internal TonConnect connector and update `mcp-core-requirements.md` accordingly. The "compose" framing weakens but doesn't collapse.

---

## Observable success metric — "agency transfer" red-team test

Acceptance criteria in `mcp-core-requirements.md` verify that artifacts ship. They don't verify the *whoa scene*. Adding one observable test, run manually at rc1 and GA:

> Give a fresh Claude Code session (no prior context) only the prompt: *"deploy this static dir to my .ton domain — censorship resistant."* No mention of the kit name, no pre-installed tooling beyond the standard agent skill registry / npm. The agent must independently invoke `ton-sovereign-deploy` (CLI at rc1, MCP at GA) without the maintainer naming the tool. If the agent fails to find the kit or names a competitor first, the discoverability moat (P2' / P4) has not been claimed and the multi-channel artifacts need rework before public announcement.

---

## Next Steps (v0.8.0 agent surface + v0.9 C2/C3 interleaved)

> **Audit note:** v0.7 C1 (auto-spawn `rldp-http-proxy` via `--site-auto`), C4 (provider probe — verdict: dormant, `--provider` stays disabled), and C5.1 (doctor probe extension) all shipped in v0.7.0 today. The week-2 row originally planned C1 work; with C1 done, that bandwidth front-loads v0.9 C2 spike instead. C2 NAT + C3 Payments now live in v0.9 (renumbered from v0.7-deferred slot via the rename below).

| Week | Track | Action |
|---|---|---|
| 0 | v0.8.0 | **(P-1) Verify `@ton/mcp` compose contract.** ~4h. Output: `docs/v0.8/at-mcp-probe.md` with verdict + design impact. **Gate: P0 cannot begin until this memo lands.** |
| 1 | v0.8.0 | Tag `0.8.0-rc1`. Ship README "Agent quickstart" + npm keywords. Update `agent-native-pivot.md` ("pivot" → "agent-surface track parallel to self-host UX track"). Rescope `mcp-core-requirements.md` (compose contract section, F4 cancellation realism, drop agentic-wallet from F2, list moved-in items). Run **red-team agent test** end of week. |
| 2 | v0.9 | C2 NAT spike — read `adnl-tunnel-client` source, validate xssnick `tonutils-go` tunnel implementation, decide Go shim vs Node binding. Output: `docs/v0.9/c2-tunnel-spike.md`. v0.9-only week. |
| 3 | v0.8.0 | P0 SDK extraction per `mcp-core-requirements.md` NF1. `src/sdk/{deploy,check,schemas,events}.ts`, zero `console.*` in SDK. CLI becomes adapter. v0.9 paused this week (`runDeployTonutils` is the shared seam). |
| 4 | v0.9 | C2 NAT implementation (continuation from week 2 spike). Defer C3 (payments) until C2 has a real tunnel pool to test against. |
| 5 | v0.8.0 | P1 MCP server. `src/mcp.ts` stdio transport, `sovereign_deploy` + `sovereign_check_env` tools, error code contract per `mcp-core-requirements.md` F1–F5. |
| 6 | v0.8.0 | GA. Skill markdown at `skills/sovereign-deploy.md`. `.well-known/mcp.json` template in `templates/`. PR to `ton-org/skills`. Re-run red-team test. Tag `v0.8.0`. |

Beyond week 6, v0.9 C2/C3 resume in interleaved cadence. v0.8.x roadmap (Agentic Wallet, remote daemon, observability) is post-v0.8.0.

---

## Edits required in existing v0.8 docs (Next Step #1, scheduled week 1)

These edits are **planned but not yet applied**. Both files are still valid as drafts until the rescope happens.

**`docs/v0.8/agent-native-pivot.md`:**
- Title / framing: "v0.8 plan — agent-native pivot" → "v0.8 plan — agent-surface track (parallel to self-host UX track)"
- "Why now" #1: remove the `mcp.ton.org launched (2026-05-01) ... we want to be in that registry` claim (it's not a third-party registry)
- "Current state vs target": clarify CLI usage continues; agent-surface is additive, not a replacement
- Architecture section: re-frame to compose-with-`@ton/mcp` (see handoff sequence above)
- Q1 (signing model): mark as decided — TonConnect for human-signed flows, Agentic Wallet integration is a `@ton/mcp` consumer concern, not a sovereign-deploy concern in v0.8.0

**`docs/v0.8/mcp-core-requirements.md`:**
- F2 `sovereign_deploy.wallet`: remove agentic-wallet implication. Document as "TonConnect connector substring" only.
- Out-of-scope list: keep "Agentic Wallet integration" but reword from "deferred" to "delegated to @ton/mcp upstream"
- New In-Scope section: "@ton/mcp compose contract" with the handoff sequence
- F4 cancellation: add realistic semantics — *"After `awaiting_signature` event fires, cancellation is best-effort. The wallet may sign and broadcast even after the agent cancels."*
- Move into v0.8.0 In Scope (was P4 deferred in `agent-native-pivot.md`):
  - README "Agent quickstart" section
  - npm keywords (`mcp`, `mcp-server`, `agent-skill`, `ton`, `claude-skill`)
  - In-repo `skills/sovereign-deploy.md` (distinct from PR to `ton-org/skills`)
  - `templates/.well-known/mcp.json` (MCP-server self-description; **NOT** a provenance manifest, distinct from rejected `.well-known/ton-deploy.json`)
- Explicitly defer to 0.8.x: `mcp.ton.org` registry submission (no submission flow exists today)

---

## What this concept update does NOT change

- v0.6.3 behaviour (already shipped today). The CLI surface stays.
- v0.7 roadmap C1 / C4 / C5.1 — already shipped in v0.7.0 today (see CHANGELOG `[0.7.0]`). v0.7 roadmap C2 / C3 — still valid as scope, but renumbered to v0.9 (the agent-surface track took the v0.8 slot per the 2026-05-10 rename). `docs/v0.7/roadmap-draft.md` C2/C3 sections remain as historical reference.
- The kit's "self-host first" positioning for human builders. Agent-surface is additive, not a replacement.
- Mainnet behaviours (`--site-adnl`, sites/storage record write, doctor, watch, JSON mode).
