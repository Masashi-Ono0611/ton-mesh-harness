import { describe, it, expect } from 'vitest'
import path from 'path'
import os from 'os'
import { startDaemon } from '../src/daemon/process'
import type { DaemonPaths } from '../src/daemon/installer'

// NOTE: this file deliberately does NOT mock child_process — it exercises the
// real spawn() ENOENT path. (test/daemon.test.ts mocks child_process, but
// vitest isolates module registries per file, so the mock does not leak here.)

describe('startDaemon — spawn failure surfaces fast (#97)', () => {
  it('throws the real ENOENT cause quickly, not after the 30s key-gen timeout', async () => {
    const missing = path.join(os.tmpdir(), 'ton-mesh-nonexistent-daemon-binary-xyz')
    const paths: DaemonPaths = {
      binDir: os.tmpdir(),
      daemon: missing, // spawn() of a missing path → async 'error' ENOENT
      cli: missing,
      mainnetConfig: path.join(os.tmpdir(), 'global.config.json'),
      testnetConfig: path.join(os.tmpdir(), 'testnet-global.config.json'),
      versionFile: path.join(os.tmpdir(), 'version'),
    }

    const start = Date.now()
    // Before the fix, the spawn 'error' (async) was missed by the synchronous
    // check, so waitForDaemon waited the full 30s for keys the dead process
    // can never write, then threw a misleading "did not generate CLI keys"
    // error. Now it fails fast with the real cause.
    await expect(startDaemon(false, paths)).rejects.toThrow(/failed to start/i)
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(5_000)
  }, 10_000)

  it('surfaces ENOENT (the real cause) rather than a generic timeout message', async () => {
    const missing = path.join(os.tmpdir(), 'ton-mesh-nonexistent-daemon-binary-zzz')
    const paths: DaemonPaths = {
      binDir: os.tmpdir(),
      daemon: missing,
      cli: missing,
      mainnetConfig: path.join(os.tmpdir(), 'global.config.json'),
      testnetConfig: path.join(os.tmpdir(), 'testnet-global.config.json'),
      versionFile: path.join(os.tmpdir(), 'version'),
    }
    await expect(startDaemon(false, paths)).rejects.toThrow(/ENOENT/)
  }, 10_000)

  it('also fails fast when the daemon path exists but is not executable (EACCES-class)', async () => {
    // Point the daemon at an existing *directory* — spawn() of a non-executable
    // target emits child.on('error') (EACCES / EISDIR) just like a missing
    // binary. Using a directory is root-safe: you can't exec one regardless of
    // uid, so this exercises the "exists but not spawnable" path portably.
    const notExecutable = os.tmpdir()
    const paths: DaemonPaths = {
      binDir: os.tmpdir(),
      daemon: notExecutable,
      cli: notExecutable,
      mainnetConfig: path.join(os.tmpdir(), 'global.config.json'),
      testnetConfig: path.join(os.tmpdir(), 'testnet-global.config.json'),
      versionFile: path.join(os.tmpdir(), 'version'),
    }
    const start = Date.now()
    await expect(startDaemon(false, paths)).rejects.toThrow(/failed to start/i)
    expect(Date.now() - start).toBeLessThan(5_000)
  }, 10_000)
})
