// Shared installer infrastructure for the kit's three daemon binaries
// (storage-daemon / tonutils-storage / rldp-http-proxy).
//
// Each installer module wraps a per-binary URL pattern + version pin,
// but the surrounding mechanics (bin dir, atomic curl download, chmod,
// macOS xattr / Windows Unblock-File quarantine removal) were copy-
// pasted across all three. This module hosts the shared helpers; per-
// binary modules call into them with their own URL.

import { spawnSync } from 'node:child_process'
import { renameSync } from 'node:fs'
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
