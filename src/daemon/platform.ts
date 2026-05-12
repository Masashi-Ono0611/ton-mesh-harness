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
