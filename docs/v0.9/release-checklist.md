# v0.9.0 GA release checklist

The ritual for cutting a GA tag. Since v0.9.0 the kit ships via **OIDC trusted
publishing**: pushing a `vX.Y.Z` tag runs `.github/workflows/publish.yml`, which
gates, publishes to npm (no token, no 2FA prompt), and creates the GitHub
Release. So the manual surface is small: **bump → merge → tag push**.

## One-time setup (done for 0.9.0)

- `.github/workflows/publish.yml` is on `main`.
- npmjs.com → `ton-mesh-harness` → Trusted Publishers → add GitHub Actions:
  owner `Masashi-Ono0611`, repo `ton-mesh-harness`, workflow `publish.yml`,
  Environment empty. (It adds an auth path; existing owner rights stay, so the
  manually-published `0.6.3` lineage is unaffected.)

## Pre-conditions

- [x] **V3** — `#18` E2E acceptance PASSED on mainnet (a real MCP-driven
      `change_dns_record` for `masashi-ono0611.ton`, verified on-chain).
- [ ] **V4** — `#26` agency-transfer red-team. **Deferred to v0.9.x**: it needs
      the package live on npm, so it runs post-publish. Not a GA blocker.
- [ ] Working tree clean, on `main`, up-to-date with `origin/main`.
- [ ] CI green on the head commit.

## Steps

### 1. Bump + CHANGELOG (one PR)

For a normal x.y.z bump, use the prep script:

```bash
scripts/release.sh 0.9.1
```

It bumps `package.json`, `src/version.ts`, the README status/quickstart lines,
promotes the `GA-PREDRAFT` block to `## [0.9.1] – <date>`, and runs
`bun run verify` + the tarball smoke. Inspect the diff, open a PR, merge.

> v0.9.0 itself bundled v0.8 + the v0.9 reserve by hand (the GA-PREDRAFT was
> v0.8-shaped, and 0.8.0 was skipped as a public version). From v0.9.1 on, the
> script path is the norm — `release.sh` was generalised to any `x.y.z`.

### 2. Tag → auto-publish

After the bump PR is merged to `main`:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

`publish.yml` then runs on its own:

1. `tag == package.json version` guard (mismatch fails the run).
2. `bun run verify` (lint + tsc + tests + build + smokes) + `node scripts/tarball-smoke.cjs`.
3. `NPM_CONFIG_PROVENANCE=false npm publish` — OIDC trusted publishing, no token.
4. `gh release create … --generate-notes --latest`.

Watch it on the repo's **Actions** tab. The `Verify tag matches package.json
version` step should print `package=X.Y.Z tag=X.Y.Z`.

### 3. Verify the published package

```bash
mkdir -p /tmp/smoke && cd /tmp/smoke && npm init -y > /dev/null
npm install ton-mesh-harness@X.Y.Z
./node_modules/.bin/ton-mesh-harness --version   # X.Y.Z
./node_modules/.bin/ton-mesh-harness --help | grep -E "daemon-mode|http"
node -e "console.log(Object.keys(require('ton-mesh-harness')).sort())"
```

The bin reports `X.Y.Z`; the SDK default-import exposes `deploy`, `checkEnv`,
`status`, `SdkError`, and the zod schemas.

### 4. Close issues / announce

- Close `#21` (D3 prep), `#18` (V3 acceptance), `#28` (v0.9 reserve epic) with
  links to the npm package + GitHub Release.
- Optional announcement copy: `docs/v0.8/announcements-draft.md` (#39).
- Run the deferred **V4 red-team** (`#26`) in a fresh agent session; record the
  result before v0.9.x.

## Rollback

`npm` forbids un-publish past 72h and it breaks consumers anyway — deprecate
instead:

```bash
npm deprecate ton-mesh-harness@X.Y.Z "Critical bug — use X.Y.(Z+1)"
# fix on a branch, bump to X.Y.(Z+1), tag → auto-publish.
```
