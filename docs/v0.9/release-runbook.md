# Release runbook — daemon version bumps

How to bump a pinned daemon version and refresh its SHA-256 integrity
hashes without the error-prone manual `curl + shasum × 5 platforms`
ritual. Uses `scripts/bump-daemon-hashes.cjs` (#32).

## When

Whenever you raise a daemon version constant:

| Installer | Version constant |
|---|---|
| `src/daemon/tonutils-installer.ts` | `TONUTILS_VERSION` |
| `src/daemon/rldp-http-proxy-installer.ts` | `DEFAULT_VERSION` (→ `RLDP_HTTP_PROXY_VERSION`) |

The pinned `expectedSha256` map MUST move in lockstep with the version —
a stale hash makes every install fail the integrity check.

> Out of scope: the legacy ton-core `src/daemon/installer.ts` has a
> different dual-map shape (two binaries). Bump its hashes manually.

## Workflow

1. **Edit the version constant** in the installer file (e.g.
   `TONUTILS_VERSION = 'v1.4.2'`).

2. **Dry-run** to see what the hashes would become:

   ```bash
   node scripts/bump-daemon-hashes.cjs src/daemon/tonutils-installer.ts --check
   ```

   Prints a per-platform diff (`=` unchanged, `~` would change). Exit
   code: `0` already up-to-date, `2` a bump is needed, `1` on error
   (bad args, a 404, or a non-hex result).

3. **Patch** the file in place:

   ```bash
   node scripts/bump-daemon-hashes.cjs src/daemon/tonutils-installer.ts
   ```

   Downloads each platform asset (concurrently, via `curl` following
   GitHub's asset redirects), computes SHA-256, validates 64 lowercase
   hex, and rewrites only the hash literals (assetMap / comments /
   ordering untouched). If any asset 404s it aborts non-zero and writes
   nothing — fix the version/asset name and re-run.

4. **Review + commit** the diff:

   ```bash
   git diff src/daemon/tonutils-installer.ts
   git commit -m "chore(daemon): bump tonutils-storage → v1.4.2 + SHA-256"
   ```

5. **Verify** the new binary actually installs:

   ```bash
   rm -rf ~/.ton-sovereign/bin   # force a fresh download on next run
   npm run build && node dist/cli.js doctor
   ```

## Notes

- The script targets SPEC-shaped installers (a single `assetMap`, an
  arrow `downloadUrl: (version, asset) => `…``, and per-platform 64-hex
  literals). Both `tonutils-installer.ts` and the default block of
  `rldp-http-proxy-installer.ts` match.
- `RLDP_HTTP_PROXY_SHA256` lets an operator pin a hash for an overridden
  `RLDP_HTTP_PROXY_VERSION` at runtime — independent of this script,
  which only refreshes the committed default-version map.
- Provenance: hashes are computed from the official GitHub release
  assets (`xssnick/tonutils-storage`, `ton-blockchain/ton`). Re-run
  `--check` any time to confirm the committed hashes still match the
  published assets (a mismatch means the upstream asset was re-cut).
