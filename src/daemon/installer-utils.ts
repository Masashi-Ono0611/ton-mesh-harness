// Shared installer infrastructure for the kit's three daemon binaries
// (storage-daemon / tonutils-storage / rldp-http-proxy).
//
// Each installer module wraps a per-binary URL pattern + version pin,
// but the surrounding mechanics (bin dir, atomic curl download, chmod,
// macOS xattr / Windows Unblock-File quarantine removal) were copy-
// pasted across all three. This module hosts the shared helpers; per-
// binary modules call into them with their own URL.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'

/** All daemon binaries live here. Created on demand by callers. */
export const BIN_DIR = path.join(os.homedir(), '.ton-sovereign', 'bin')

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
    throw new Error(`Failed to download ${url} (curl exit ${result.status})`)
  }
  renameSync(tmp, dest)
}

/**
 * Apply executable permission on POSIX. No-op on Windows (the .exe
 * extension is the executable marker there).
 */
export function chmodExecutable(absPath: string): void {
  if (process.platform === 'win32') return
  try {
    spawnSync('chmod', ['+x', absPath])
  } catch {
    /* ignore — caller validates via existsSync, not permission bits */
  }
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
  chmodExecutable(paths.daemon)
  removeQuarantine(paths.daemon)
  writeFileSync(paths.versionFile, spec.version)
}
