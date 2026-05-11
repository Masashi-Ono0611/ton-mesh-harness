# Contributing to Sovereign Deploy Kit

Thanks for thinking about contributing. The kit is in an active v0.8.x
cycle (agent-surface track) — read this whole file before opening a PR so
your work lines up with the in-flight refactor.

## Project shape

```
src/
├── cli.ts                 CLI entry (commander)
├── cli/                   CLI adapters → SDK
├── sdk/                   Programmatic SDK (zod schemas + check + deploy)
├── mcp.ts                 MCP server entry (low-level Server handlers)
├── daemon/                tonutils + ton-core + rldp-http-proxy lifecycles
├── wallet/                TonConnect connector
└── utils/                 shared (tunnel-config, http, etc.)
test/                      vitest unit + RUN_DAEMON_TESTS gated integration
docs/v0.8/                 active design docs (mcp-core-requirements,
                           concept-update-2026-05-10, at-mcp-probe, ...)
skills/                    in-repo Anthropic skill md
templates/                 deployable artifacts (GitHub Action, .well-known)
```

The SDK (`src/sdk/`) is the load-bearing contract. The CLI is an adapter;
the MCP server is an adapter. NO `console.*` in `src/sdk/` — lint-enforced.

## Setup

```bash
git clone https://github.com/Masashi-Ono0611/sovereign-deploy-kit.git
cd sovereign-deploy-kit
npm install
```

Node ≥ 18 (the kit declares `engines.node`). The repo currently develops
against Node 22 / 24.

## Quality bar (must pass before opening a PR)

```bash
npm run lint     # eslint src/sdk — no-console rule
npx tsc --noEmit # type-check with strict + noUnusedLocals
npm test         # vitest, default suite (153 tests, no daemon spawn)
npm run build    # tsup dual-bin (cli.js + mcp.js)
```

If you touch daemon-side code, also exercise the gated integration suite:

```bash
RUN_DAEMON_TESTS=1 npm test
```

This spawns real tonutils-storage / rldp-http-proxy binaries and downloads
them on first run (~12–20 MB each, cached at `~/.ton-sovereign/bin/`). It
takes 30–90 s.

## MCP server smoke test

After `npm run build`, the MCP server can be smoked via stdio JSON-RPC:

```bash
(
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"dev","version":"0.0.0"}}}'
  sleep 0.3
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  sleep 0.3
  printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
  sleep 0.5
) | node dist/mcp.js
```

You should see `tools/list` return `sovereign_check_env` and
`sovereign_deploy`.

## Architecture rules (load-bearing)

1. **No `console.*` in `src/sdk/`.** The SDK emits typed `DeployEvent`
   values; the CLI / MCP server render them. Enforced by ESLint.
2. **Strict objects everywhere on the public surface.** All SDK schemas
   use `z.strictObject` so typos in caller input fail loud rather than
   getting silently dropped.
3. **Errors are typed.** Throw `SdkError(code, message, options)` from
   the SDK. The CLI maps to chalk-colored output; the MCP server maps
   to the F5 structured envelope.
4. **AbortSignal is honoured.** Long-running operations check the signal
   at event boundaries. Cancellation kills the daemon and re-throws as
   `ERR_CANCELLED` with `data.phase_at_cancel` set.
5. **Tunnel config validation lives in `src/utils/tunnel-config.ts`.**
   Both CLI and SDK use the same core; don't reimplement.

## Codex review

Significant PRs (anything touching `src/sdk/` or the MCP wiring) should
run a Codex review before merge. The session history under
[`docs/v0.8/concept-update-2026-05-10.md`](docs/v0.8/concept-update-2026-05-10.md)
shows the pattern: assemble the diff + spec context, ask Codex for
severity-tagged findings, fix BLOCKERs and MAJORs in the same PR. The
2 BLOCKERs + 14 MAJORs caught in v0.8 cycles were caught this way.

## Commit messages

We follow Conventional Commits loosely. Common prefixes:
- `feat(v0.8 …):` new feature within the v0.8 cycle
- `fix(v0.8 …):` bug fix
- `refactor(v0.8 …):` non-behaviour-changing structural work
- `docs(v0.8 …):` docs only
- `chore(refactor batch N):` numbered cleanup batches from the
  refactor branches
- `test(…):` test-only changes

The body should explain WHY, not just WHAT. Reference issue numbers
(`#7`, `#15`, etc.) and any prior Codex review findings being addressed.

## v0.8 GA gates

Things still open before v0.8.0 (non-rc) ships:
- `S2.5`: SDK DNS write (currently chained by the CLI outside the SDK)
- `[V3] #18`: Claude Code MCP client end-to-end testnet deploy
- `[V4] #26`: agency-transfer red-team test (manual, fresh agent session)
- `[D3] #21`: release prep (version bump, README roadmap, CHANGELOG)

Touching any of those is high-value; PRs labeled `v0.8-ga-gate` get
priority review.

## Don't

- Don't add console.* to `src/sdk/`.
- Don't bypass `parseWalletInput` — CLI-string wallet inputs must be
  lifted through it before reaching the schema.
- Don't bump deps to major versions without flagging the cross-package
  impact in the PR description.
- Don't merge without `npm run lint && npx tsc --noEmit && npm test &&
  npm run build` all green locally.
- Don't `git push --force` to `main`. Force-push is OK on feature
  branches you own, but `main` is shared.
