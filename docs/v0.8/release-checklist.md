# v0.8.0 GA release checklist

This is the script-by-script ritual for cutting the v0.8.0 GA tag and
publishing to npm. `scripts/release.sh` automates steps 1–5 (the
mechanical edits + verify gate); steps 6–10 stay manual because they
touch shared / external state (git remote, npm registry, GitHub
release).

Pre-conditions (none are negotiable):

- [ ] **V3** — `#18` E2E acceptance has passed at least once. Transcript
      attached to the issue. Real **mainnet** deploy completed end-to-end
      via the MCP server. (Re-defined from "testnet" 2026-05-23: the v0.8
      SDK rejects `testnet:true` — the MCP path is mainnet-only. Testnet
      lives only on the legacy CLI `--daemon-backend=ton-core` path, which
      bypasses MCP + agentic signing. See `docs/v0.8/e2e-runbook.md`.)
- [ ] **V4** — `#26` agency-transfer red-team test passed in a fresh
      Claude Code session. Transcript attached.
- [ ] **Working tree clean** — `git status` shows nothing pending.
- [ ] On `main`, up-to-date with `origin/main`.
- [ ] CI green on the most recent commit (lint + tsc + tests + build +
      cli-smoke + mcp-smoke + npm pack dry-run, on Node 18/20/22 ×
      ubuntu/macos).

## Steps

### 1. Run the prep script

```bash
scripts/release.sh 0.8.0
```

That single command performs five mechanical edits + the full verify
gate:

1. `package.json::version` → `0.8.0`
2. `src/version.ts::SOVEREIGN_DEPLOY_VERSION` → `'0.8.0'`
3. `CHANGELOG.md` — promotes the `<!-- GA-PREDRAFT-BEGIN ... END -->`
   block to a live `## [0.8.0] – <today>` heading.
4. `README.md` — flips the status line + Agent-quickstart heading from
   the latest rc (rc11 as of 2026-05-12) → 0.8.0.
5. `npm run verify` — lint + tsc + tests + build + cli + mcp + sdk
   smokes (+ tarball smoke via `npm run smoke:full`).

If any step fails the script exits non-zero and leaves the rest
untouched. Inspect, fix, re-run.

### 2. Inspect the diff

```bash
git diff --stat
git diff CHANGELOG.md | head -100
git diff README.md
```

Confirm:
- The `[0.8.0]` heading reads correctly (today's date in UTC).
- No stray `GA-PREDRAFT` markers remain.
- Every `0.8.0-rcN` reference in README + package.json description
  is now `0.8.0` (no half-bumps).

### 3. Commit

```bash
git add -A
git commit -m "release: v0.8.0"
```

### 4. Tag

```bash
git tag -a v0.8.0 -m "v0.8.0 — agent-surface track GA"
```

Tag message convention matches the rc tags. The annotation body can
include a one-liner summary of the GA scope.

### 5. Push

```bash
git push origin main
git push origin v0.8.0
```

Pushing the tag triggers (whatever CI you've wired to tag pushes —
currently nothing, but reserve the slot).

### 6. Publish to npm

```bash
npm whoami    # confirm you're logged in to the right account
npm publish
```

The kit publishes from `dist/` per `files` allowlist. `npm publish`
runs `prepublishOnly` if defined (currently none — `npm pack --dry-run`
is the manual sanity check).

For an rc (e.g. `scripts/release.sh 0.8.0-rc11` → `npm publish`),
add `--tag next` so the rc doesn't take the `latest` dist-tag:

```bash
npm publish --tag next
```

### 7. GitHub release

```bash
gh release create v0.8.0 \
  --title "v0.8.0 — agent-surface track GA" \
  --notes-from-tag
```

`--notes-from-tag` pulls the annotation as the release body. If you
want the full CHANGELOG section instead, do:

```bash
gh release create v0.8.0 \
  --title "v0.8.0 — agent-surface track GA" \
  --notes "$(awk '/^## \[0\.8\.0\]/{p=1} p; /^## \[/{if(p&&!/0\.8\.0/)exit}' CHANGELOG.md)"
```

### 8. Update the Epic and close issues

- Close `#21` (D3 release prep) with a comment linking the npm
  package + GitHub release.
- Close `#4` (Epic v0.8.0).
- Cross-link from issues #18 and #26 to the release.

### 9. Verify the published package

In a clean sandbox:

```bash
mkdir -p /tmp/smoke && cd /tmp/smoke
npm init -y > /dev/null
npm install ton-sovereign-deploy
./node_modules/.bin/ton-sovereign-deploy --version  # 0.8.0
./node_modules/.bin/ton-sovereign-deploy --help | grep wallet-mode
node -e "console.log(Object.keys(require('ton-sovereign-deploy')).sort())"
```

The bin should report `0.8.0`. The SDK default-import should expose
`deploy`, `checkEnv`, `status`, `SdkError`, and the zod schemas.

### 10. Announce

(optional — the project's external comms cadence)

- TON Foundation Telegram / Discord channels.
- Tweet linking the npm + GitHub release.
- Update the `ton-org/skills` PR (per the draft in
  `docs/v0.8/ton-org-skills-pr-draft.md`) to point at the GA tag.

## Rollback (worst case)

If a critical bug surfaces post-publish:

```bash
# 1. deprecate the bad version
npm deprecate ton-sovereign-deploy@0.8.0 "Critical bug X — use 0.8.1"

# 2. fix on a branch + release 0.8.1
git checkout -b hotfix/0.8.1
# ... make the fix, write a test, commit ...
git checkout main
git merge --ff-only hotfix/0.8.1
scripts/release.sh 0.8.1
# ... steps 3–7 above ...

# 3. NEVER unpublish — npm policy forbids it past 72 hours, and even
#    inside that window unpublish breaks transitive consumers. Deprecate
#    is the right tool.
```

## Cutting an rc (e.g. rc11)

Same checklist, with rc-specific differences:

- `scripts/release.sh 0.8.0-rcN` (the script keeps the GA pre-draft
  intact — only x.y.0 tags promote it).
- Manually promote `## [Unreleased] – <date>` → `## [0.8.0-rcN] – <date>`
  in `CHANGELOG.md` (release.sh only auto-promotes GA pre-drafts;
  rc CHANGELOG bumps stay manual).
- `npm publish --tag next` (don't claim `latest`).
- GitHub release marked as pre-release: `gh release create v0.8.0-rcN
  --prerelease ...`.
- Skip the Epic close + announce steps.
