import { describe, it, expect } from 'vitest'
import { daemonHashKey } from '../src/daemon/platform'
import { STORAGE_DAEMON_HASHES, STORAGE_DAEMON_CLI_HASHES } from '../src/daemon/installer'

// #101: the legacy installer downloads a single x86-64 storage-daemon.exe for
// every Windows arch (getBinaryName), but the hash map only pins win32-x64.
// daemonHashKey maps the 64-bit Windows arches onto win32-x64 (so the download
// is still integrity-checked) and rejects 32-bit Windows (can't run x64).
describe('daemonHashKey — Windows single-asset hash resolution (#101)', () => {
  it('passes non-Windows keys through unchanged', () => {
    for (const k of ['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64', 'win32-x64']) {
      expect(daemonHashKey(k)).toBe(k)
    }
  })

  it('maps 64-bit ARM Windows onto the x64 hash (verified, runs under emulation)', () => {
    expect(daemonHashKey('win32-arm64')).toBe('win32-x64')
  })

  it('rejects 32-bit Windows (ia32) with a clear error — fail fast, no silent install', () => {
    expect(() => daemonHashKey('win32-ia32')).toThrow(/32-bit Windows|not supported/i)
  })

  // The whole point of #101: the resolved key must index a REAL pinned hash, so
  // the integrity check is no longer skipped (trust-on-first-use) on ARM64 Win.
  it('closes the TOFU gap: the resolved key has a pinned hash in both daemon + cli maps', () => {
    for (const arch of ['win32-x64', 'win32-arm64']) {
      const key = daemonHashKey(arch)
      expect(STORAGE_DAEMON_HASHES[key]).toMatch(/^[0-9a-f]{64}$/)
      expect(STORAGE_DAEMON_CLI_HASHES[key]).toMatch(/^[0-9a-f]{64}$/)
    }
  })
})
