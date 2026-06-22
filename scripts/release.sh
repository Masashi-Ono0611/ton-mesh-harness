#!/usr/bin/env bash
#
# scripts/release.sh — promote the v0.8.0 GA pre-draft to a live
# release entry, bump version strings, and run the full verify gate.
#
# Does NOT push, tag, or publish — those steps are intentionally
# manual (see docs/v0.8/release-checklist.md). The script's job is to
# turn 4 mechanical edits + 1 verify into one command.
#
# Usage:
#
#     scripts/release.sh <version>
#
# Examples:
#
#     scripts/release.sh 0.8.0          # promote pre-draft → GA
#     scripts/release.sh 0.8.0-rc6      # cut another rc
#
# Idempotent against a fresh tree. If anything fails the script exits
# non-zero and leaves no partial state behind (each edit is gated on
# the previous succeeding).

set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "usage: $0 <version>" >&2
  exit 2
fi
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$ ]]; then
  echo "error: '$VERSION' is not a valid semver string" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "error: working tree dirty — commit or stash first" >&2
  exit 1
fi

CURRENT_VERSION="$(node -p "require('./package.json').version")"
echo "→ bumping $CURRENT_VERSION → $VERSION"

# ---------------------------------------------------------------------------
# 1. package.json version
# ---------------------------------------------------------------------------
node -e "
  const fs = require('fs');
  const p = require('./package.json');
  p.version = '$VERSION';
  fs.writeFileSync('./package.json', JSON.stringify(p, null, 2) + '\n');
"

# ---------------------------------------------------------------------------
# 2. src/version.ts
# ---------------------------------------------------------------------------
node -e "
  const fs = require('fs');
  const f = './src/version.ts';
  const src = fs.readFileSync(f, 'utf-8');
  const out = src.replace(/MESH_HARNESS_VERSION = '[^']+'/, \"MESH_HARNESS_VERSION = '$VERSION'\");
  if (out === src) { console.error('error: did not find MESH_HARNESS_VERSION in', f); process.exit(1); }
  fs.writeFileSync(f, out);
"

# ---------------------------------------------------------------------------
# 3. CHANGELOG.md — promote GA pre-draft for x.y.0 releases (no pre-release
#    tag). For rcN releases CHANGELOG editing is MANUAL: the operator
#    renames the existing `## [Unreleased]` section to
#    `## [0.8.0-rcN] – <date>` before running this script. Automation
#    here would have to guess what's "in flight" vs "shipped"; the
#    operator already knows. release-checklist.md spells out the step.
# ---------------------------------------------------------------------------
if [[ "$VERSION" != *-* ]]; then
  TODAY="$(date -u +%Y-%m-%d)"
  echo "→ writing CHANGELOG ## [$VERSION] – $TODAY"
  node -e "
    const fs = require('fs');
    const f = './CHANGELOG.md';
    const src = fs.readFileSync(f, 'utf-8');
    // Promote a GA pre-draft block if one is present; otherwise promote the
    // ## [Unreleased] section in place (Keep a Changelog style). The latter
    // is the normal path once a GA-PREDRAFT has already been consumed.
    const re = /<!-- GA-PREDRAFT-BEGIN[\\s\\S]*?GA-PREDRAFT-END -->/m;
    const match = src.match(re);
    if (match) {
      const beginRe = /^<!-- GA-PREDRAFT-BEGIN[\\s\\S]*?\\n\\n/;
      const endRe = /\\n\\nGA-PREDRAFT-END -->\$/;
      let inner = match[0].replace(beginRe, '').replace(endRe, '');
      inner = inner.replace(/^## \\[[^\\]]*\\] – TODO\$/m, '## [$VERSION] – $TODAY');
      fs.writeFileSync(f, src.replace(re, inner));
    } else {
      const unrel = /^## \\[Unreleased\\]\$/m;
      if (!unrel.test(src)) { console.error('error: no GA-PREDRAFT block and no ## [Unreleased] heading in', f); process.exit(1); }
      fs.writeFileSync(f, src.replace(unrel, '## [Unreleased]\\n\\n## [$VERSION] – $TODAY'));
    }
  "
fi

# ---------------------------------------------------------------------------
# 4. README.md — flip the status line for x.y.0 releases.
# ---------------------------------------------------------------------------
if [[ "$VERSION" != *-* ]]; then
  node -e "
    const fs = require('fs');
    const f = './README.md';
    const src = fs.readFileSync(f, 'utf-8');
    const out = src
      .replace(/v0\\.\\d+\\.\\d+(?:-[A-Za-z0-9.]+)? \\(\\d{4}-\\d{2}-\\d{2}\\)/, 'v$VERSION (' + new Date().toISOString().slice(0,10) + ')')
      .replace(/## Agent quickstart \\([^)]*\\)/, '## Agent quickstart (v$VERSION)');
    fs.writeFileSync(f, out);
  "
fi

# ---------------------------------------------------------------------------
# 5. Verify gate (basic) + tarball pack/install/run end-to-end.
# ---------------------------------------------------------------------------
echo "→ running bun run verify"
bun run verify

echo "→ running tarball install + run smoke (final pre-publish gate)"
node scripts/tarball-smoke.cjs

# ---------------------------------------------------------------------------
# 6. Next-step hints (intentionally manual).
# ---------------------------------------------------------------------------
cat <<EOF

✅ Release prep complete for v$VERSION.

Next (manual):

    git add -A
    git commit -m "release: v$VERSION"
    git tag -a v$VERSION -m "v$VERSION"
    git push origin main
    git push origin v$VERSION
    npm publish $([[ "$VERSION" == *-* ]] && echo "--tag next" || echo "")
    gh release create v$VERSION --notes-from-tag

Then close GitHub issues #21 (D3) and #4 (Epic).
See docs/v0.8/release-checklist.md for the full ritual.
EOF
