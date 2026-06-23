/**
 * Platform detection and binary naming utilities
 */

export const PLATFORM_MAP: Record<string, string> = {
  'darwin-arm64':  'mac-arm64',
  'darwin-x64':    'mac-x86-64',
  'linux-arm64':   'linux-arm64',
  'linux-x64':     'linux-x86_64',
  'win32-x64':     'win-x86-64',
  'win32-arm64':   'win-arm64',
  'win32-ia32':    'win-x86-32',
}

/**
 * Get the platform key for the current system
 * @throws {Error} if platform is not supported
 */
export function getPlatformKey(): string {
  const key = `${process.platform}-${process.arch}`
  if (!PLATFORM_MAP[key]) {
    throw new Error(`Unsupported platform: ${key}. Supported: ${Object.keys(PLATFORM_MAP).join(', ')}`)
  }
  return key
}

/**
 * Get the release-asset name for the current platform.
 *
 * Asset naming on ton-blockchain/ton GitHub releases:
 *   - macOS / Linux: `<base>-<platform-suffix>`     (e.g. `storage-daemon-mac-arm64`)
 *   - Windows:       `<base>.exe`                   (NO platform suffix — single
 *                                                     x86_64 asset across Win
 *                                                     architectures)
 *
 * Pre-rc11 the Windows branch returned `<base>-<suffix>.exe` (e.g.
 * `storage-daemon-win-x86-64.exe`) which doesn't exist on GitHub —
 * Windows users got a 404 from curl. Self-audit caught this while
 * pinning SHA-256 hashes for the legacy installer.
 *
 * @param base - Base binary name
 */
export function getBinaryName(base: 'storage-daemon' | 'storage-daemon-cli'): string {
  if (process.platform === 'win32') return `${base}.exe`
  const platformSuffix = PLATFORM_MAP[getPlatformKey()]
  return `${base}-${platformSuffix}`
}

/**
 * Resolve the platform key used to look up a pinned SHA-256 for the legacy
 * storage-daemon binaries (src/daemon/installer.ts).
 *
 * TON publishes a SINGLE x86-64 Windows asset (`storage-daemon.exe`) for all
 * Windows architectures — `getBinaryName` returns that one file regardless of
 * arch — but the hash map only pins `win32-x64`. Without this mapping,
 * `win32-arm64` / `win32-ia32` look up an `undefined` hash and the integrity
 * check is silently skipped (trust-on-first-use), installing an unverified —
 * and on 32-bit, unrunnable — binary.
 *
 * - `win32-arm64` → `win32-x64`: the downloaded file IS the x64 `.exe`, which
 *   64-bit ARM Windows runs under its built-in x64 emulation; verify it against
 *   the known x64 hash.
 * - `win32-ia32` → throw: a 32-bit OS cannot run an x64 binary, so fail fast
 *   with a clear message instead of installing a broken, unverified binary.
 * - every other key passes through unchanged.
 *
 * @throws {Error} on 32-bit Windows (`win32-ia32`).
 */
export function daemonHashKey(platformKey: string): string {
  if (platformKey === 'win32-ia32') {
    throw new Error(
      '32-bit Windows (ia32) is not supported: TON publishes only an x86-64 ' +
        'storage-daemon.exe, which cannot run on a 32-bit OS. Use 64-bit Windows (x64, ' +
        'or ARM64 via the built-in x64 emulation).',
    )
  }
  if (platformKey === 'win32-arm64') return 'win32-x64'
  return platformKey
}
