import { describe, it, expect, vi, beforeEach } from 'vitest'
import os from 'os'
import path from 'path'

// Mocks: tests that touch fs / child_process never hit the real filesystem.
vi.mock('child_process', () => ({
  spawnSync: vi.fn().mockReturnValue({ status: 0, stdout: '', stderr: '' }),
  spawn: vi.fn().mockReturnValue({
    on: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  }),
}))

describe('getPlatformKey', () => {
  it('returns a supported platform key for the current machine', async () => {
    const { getPlatformKey } = await import('../src/daemon')
    // Expected to run on macOS arm64 (M1/M2) or x64.
    const key = getPlatformKey()
    expect(key).toMatch(/^(darwin|linux)-(arm64|x64)$/)
  })
})

describe('getDaemonPaths', () => {
  it('returns paths under ~/.ton-sovereign/bin/', async () => {
    const { getDaemonPaths } = await import('../src/daemon')
    const paths = getDaemonPaths()
    const expectedBinDir = path.join(os.homedir(), '.ton-sovereign', 'bin')

    expect(paths.binDir).toBe(expectedBinDir)
    expect(paths.daemon).toBe(path.join(expectedBinDir, 'storage-daemon'))
    expect(paths.cli).toBe(path.join(expectedBinDir, 'storage-daemon-cli'))
    expect(paths.mainnetConfig).toBe(path.join(expectedBinDir, 'global.config.json'))
    expect(paths.testnetConfig).toBe(path.join(expectedBinDir, 'testnet-global.config.json'))
  })
})

describe('findFreePort', () => {
  it('returns a port number in the requested range', async () => {
    const { findFreePort } = await import('../src/daemon')
    const port = await findFreePort(5000, 6000)
    expect(port).toBeGreaterThanOrEqual(5000)
    expect(port).toBeLessThanOrEqual(6000)
  })
})
