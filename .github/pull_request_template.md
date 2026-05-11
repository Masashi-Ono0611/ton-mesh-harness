<!--
Thanks for sending a PR! Quick checklist below — see CONTRIBUTING.md
for full architecture rules + Codex-review pattern.
-->

## Summary

<!-- 1–3 bullets: what changed and why. Link relevant issues (#NN). -->

## Quality bar (must be ✅ before requesting review)

- [ ] `npm run lint` clean (no-console enforced on `src/sdk/`)
- [ ] `npx tsc --noEmit` clean (strict + noUnusedLocals)
- [ ] `npm test` green (default suite — daemon-spawn tests skipped unless `RUN_DAEMON_TESTS=1`)
- [ ] `npm run build` clean (dual bin emits `dist/cli.js` + `dist/mcp.js`)
- [ ] MCP smoke (if touching `src/mcp.ts` or anything it imports — see CONTRIBUTING.md)

## Architecture impact

<!--
Tick whichever applies; leave others unchecked:
- [ ] Touches src/sdk/ (the load-bearing public contract)
- [ ] Adds or modifies a zod schema (likely needs snapshot update)
- [ ] Touches src/mcp.ts (MCP server contract)
- [ ] Changes daemon process lifecycle (kill paths, signal handlers)
- [ ] Changes AbortSignal threading
- [ ] Pure docs / templates / CI
-->

## Codex review

Significant SDK or MCP changes should run through a Codex review before
merge — paste the severity-tagged findings + a short note on each fix in
this section, or link to the review session.

- [ ] No Codex review needed (docs / CI / trivial)
- [ ] Codex BLOCKERs / MAJORs found and addressed: <!-- summarise -->
- [ ] Codex review pending — DRAFT status until done

## Regression / behaviour

- [ ] No user-facing CLI behaviour changes (regression-zero)
- [ ] User-facing CLI behaviour intentionally changed — described below

<!-- if behaviour changed, list what was old → new for each affected flag / command -->

## Closes

<!-- Closes #NN, #MM -->
