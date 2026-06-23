// Shared installer infrastructure for the kit's three daemon binaries
// (storage-daemon / tonutils-storage / rldp-http-proxy).
//
// Each installer module wraps a per-binary URL pattern + version pin,
// but the surrounding mechanics (bin dir, atomic curl download, chmod,
// macOS xattr / Windows Unblock-File quarantine removal) were copy-
// pasted across all three. This module hosts the shared helpers; per-
// binary modules call into them with their own URL.

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'

/** All daemon binaries live here. Created on demand by callers. */
export const BIN_DIR = path.join(os.homedir(), '.ton-mesh', 'bin')

/**
 * Atomically download `url` to `dest`. Uses `curl -fsSL` (HTTPS, follow
 * redirects, fail on HTTP error) and writes through a `.tmp` file
 * renamed via Node's `renameSync` so the move is portable across
 * darwin/linux/win32 (`mv` isn't on PATH on stock Windows).
 *
 * Throws on non-zero curl exit. The caller is responsible for `chmod +x`
 * and quarantine removal (see `chmodExecutable` / `removeQuarantine`).
 */
export function downloadFile(url: string, dest: string): void {
  const tmp = dest + '.tmp'
  const result = spawnSync('curl', ['-fsSL', '-o', tmp, url], { stdio: 'inherit' })
  if (result.status !== 0) {
    // curl writes the output file before it knows the request failed, so a
    // non-zero exit (HTTP error, network drop) or a spawn failure (curl not on
    // PATH → result.error, status null) can leave a partial / zero-byte `.tmp`
    // behind. Remove it so it can't be mistaken for a good download by a later
    // existsSync check or a retry.
    try { unlinkSync(tmp) } catch { /* may not have been created */ }
    const reason = result.error ? result.error.message : `curl exit ${result.status}`
    throw new Error(`Failed to download ${url} (${reason})`)
  }
  renameSync(tmp, dest)
}

/**
 * Apply executable permission on POSIX. No-op on Windows (the .exe
 * extension is the executable marker there).
 */
export function chmodExecutable(absPath: string): void {
  if (process.platform === 'win32') return
  // Use Node's chmodSync rather than shelling out to `chmod`. spawnSync('chmod')
  // returns a non-zero `status` (or a `result.error`, e.g. chmod not on PATH)
  // on failure WITHOUT throwing, so the old try/catch silently swallowed it —
  // leaving a downloaded daemon non-executable, which then fails much later
  // with a confusing EACCES at spawn time. chmodSync throws on failure, so a
  // bad permission set surfaces immediately at install.
  chmodSync(absPath, 0o755)
}

/**
 * Strip platform-specific download quarantine markers:
 *   - macOS: `xattr -c <file>` removes `com.apple.quarantine` (and
 *     other extended attributes — equivalent to a fresh download).
 *   - Windows: PowerShell `Unblock-File` clears the
 *     `Zone.Identifier` alternate data stream that triggers the
 *     "this file came from another computer" prompt.
 *   - Linux: no-op (no quarantine system).
 *
 * Failures are silent — the binary may still launch fine.
 */
export function removeQuarantine(absPath: string): void {
  if (process.platform === 'darwin') {
    spawnSync('xattr', ['-c', absPath])
  } else if (process.platform === 'win32') {
    spawnSync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Unblock-File -LiteralPath "${absPath}"`,
    ])
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Higher-level installer template — used by tonutils + rldp-http-proxy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spec for a daemon installer. `installBinary` and `resolveBinaryPaths`
 * consume one. Lets the two release-asset-shaped installers
 * (tonutils-storage, rldp-http-proxy) live as ~25 LOC each instead of
 * 85 LOC of copy-paste.
 */
export interface BinaryInstallerSpec {
  /** Human-readable banner name (`Downloading <name> (<version>)…`). */
  name: string
  /** Pinned version string written into the on-disk version file. */
  version: string
  /** Base file name; `.exe` is appended on win32 automatically. */
  exeName: string
  /** Version-stamp file name (kept next to the binary in BIN_DIR). */
  versionFileName: string
  /** `${process.platform}-${process.arch}` → release asset file name. */
  assetMap: Record<string, string>
  /** Builds the download URL for a given (version, asset). */
  downloadUrl: (version: string, asset: string) => string
  /** Trailing line appended to the "no asset for $platform-$arch" error. */
  unsupportedHint: string
  /**
   * Pinned SHA-256 hashes per `${platform}-${arch}` key. Verified after
   * download — mismatch deletes the partial file and throws. Required
   * for supply-chain integrity: without it, a compromised GitHub
   * release asset or MITM'd CDN endpoint would execute as the user.
   * Codex pre-GA review round 11 (self-audit) caught the missing
   * verification. v0.8 hashes pinned for the version of each binary
   * embedded above; bump them in lockstep with `version` when
   * upgrading.
   *
   * An empty / missing entry for the current platform-arch falls back
   * to TOFU (trust on first use) + a loud stderr warning. Hashes for
   * ALL supported platforms should be pinned before GA tag.
   */
  expectedSha256?: Partial<Record<string, string>>
}

export interface BinaryPaths {
  binDir: string
  daemon: string
  versionFile: string
}

export function resolveBinaryPaths(spec: BinaryInstallerSpec): BinaryPaths {
  const isWindows = process.platform === 'win32'
  return {
    binDir: BIN_DIR,
    daemon: path.join(BIN_DIR, isWindows ? `${spec.exeName}.exe` : spec.exeName),
    versionFile: path.join(BIN_DIR, spec.versionFileName),
  }
}

export interface InstallBinaryOptions {
  /** Suppress the human-readable download banner (JSON-output mode). */
  silent?: boolean
}

/**
 * Idempotent installer: returns immediately if the binary at
 * `spec.exeName` already matches `spec.version`; otherwise downloads
 * the platform-appropriate asset, chmods it, strips quarantine, and
 * writes the version stamp.
 *
 * Throws if no asset is mapped for the current platform/arch.
 */
export function installBinary(
  spec: BinaryInstallerSpec,
  opts: InstallBinaryOptions = {},
): void {
  mkdirSync(BIN_DIR, { recursive: true })
  const paths = resolveBinaryPaths(spec)
  const currentVersion = existsSync(paths.versionFile)
    ? readFileSync(paths.versionFile, 'utf8').trim()
    : ''
  if (currentVersion === spec.version && existsSync(paths.daemon)) return

  const key = `${process.platform}-${process.arch}`
  const asset = spec.assetMap[key]
  if (!asset) {
    throw new Error(
      `${spec.name} has no published asset for ${key}. ` +
        `Supported: ${Object.keys(spec.assetMap).join(', ')}. ` +
        spec.unsupportedHint,
    )
  }

  const url = spec.downloadUrl(spec.version, asset)
  if (!opts.silent) {
    // Banners go to stderr so `--json-output` stdout stays parseable.
    process.stderr.write(`  Downloading ${spec.name} (${spec.version})…\n`)
  }
  downloadFile(url, paths.daemon)
  // SHA-256 integrity check BEFORE chmod+x and BEFORE the version
  // stamp is written. A failed verification deletes the partial
  // download — the next install attempt starts fresh.
  verifyDownloadedBinary(spec, key, paths.daemon)
  chmodExecutable(paths.daemon)
  removeQuarantine(paths.daemon)
  writeFileSync(paths.versionFile, spec.version)
}

/**
 * Verify a downloaded file's SHA-256 against an expected hash. Throws
 * + `unlinkSync`'s the file on mismatch so the next install attempt
 * starts fresh. Pass `expected: undefined` to opt into TOFU (emits a
 * loud stderr warning and proceeds).
 *
 * Public helper exported for installers that don't go through
 * `installBinary` — e.g. `src/daemon/installer.ts` downloads two
 * binaries + two config files in its own loop. Used inline there
 * after each `downloadFile` call.
 */
export function verifyFileSha256(args: {
  name: string
  version: string
  platformKey: string
  filePath: string
  expected: string | undefined
}): void {
  const { name, version, platformKey, filePath, expected } = args
  if (!expected) {
    process.stderr.write(
      `  ⚠ ${name} (${version}) for ${platformKey}: no SHA-256 hash pinned; ` +
        `skipping integrity check. Run \`shasum -a 256 ${filePath}\` and pin the value in ` +
        `src/daemon/<installer>.ts before GA.\n`,
    )
    return
  }
  let actual: string
  try {
    actual = createHash('sha256').update(readFileSync(filePath)).digest('hex')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`${name}: failed to read downloaded binary for SHA-256 check: ${msg}`)
  }
  if (actual !== expected) {
    try { unlinkSync(filePath) } catch { /* best effort */ }
    throw new Error(
      `${name} (${version}) download integrity check FAILED for ${platformKey}.\n` +
        `  expected SHA-256: ${expected}\n` +
        `  got SHA-256:      ${actual}\n` +
        `The downloaded file has been deleted. If you believe the pinned hash is stale ` +
        `(upstream re-published the asset), open an issue at ` +
        `https://github.com/Masashi-Ono0611/ton-mesh-harness/issues — DO NOT ` +
        `unpin the hash to bypass the check.`,
    )
  }
}

function verifyDownloadedBinary(
  spec: BinaryInstallerSpec,
  platformKey: string,
  filePath: string,
): void {
  verifyFileSha256({
    name: spec.name,
    version: spec.version,
    platformKey,
    filePath,
    expected: spec.expectedSha256?.[platformKey],
  })
}
