import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { mkdtempSync, rmSync, existsSync, writeFileSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// downloadFile shells out to curl via spawnSync — mock it so we can simulate
// failure (and a left-behind .tmp) deterministically without a network call.
vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))
import { spawnSync } from 'node:child_process'
import { downloadFile, chmodExecutable } from '../../src/daemon/installer-utils'

const mockSpawn = spawnSync as unknown as Mock

let workDir: string
beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'installer-utils-'))
  mockSpawn.mockReset()
})
afterEach(() => {
  try { rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
})

describe('downloadFile — cleans up the partial .tmp on failure (#102/#16)', () => {
  it('removes a left-behind .tmp and throws when curl exits non-zero', () => {
    const dest = join(workDir, 'storage-daemon')
    const tmp = dest + '.tmp'
    writeFileSync(tmp, 'partial bytes') // simulate curl having created the output
    mockSpawn.mockReturnValue({ status: 1 })
    expect(() => downloadFile('http://example/x', dest)).toThrow(/Failed to download/)
    expect(existsSync(tmp)).toBe(false)
    expect(existsSync(dest)).toBe(false)
  })

  it('reports a spawn error (curl not on PATH) and cleans up', () => {
    const dest = join(workDir, 'storage-daemon')
    const tmp = dest + '.tmp'
    writeFileSync(tmp, 'x')
    mockSpawn.mockReturnValue({ status: null, error: new Error('spawn curl ENOENT') })
    expect(() => downloadFile('http://example/x', dest)).toThrow(/spawn curl ENOENT/)
    expect(existsSync(tmp)).toBe(false)
  })

  it('renames .tmp to dest on success', () => {
    const dest = join(workDir, 'storage-daemon')
    const tmp = dest + '.tmp'
    mockSpawn.mockImplementation(() => {
      writeFileSync(tmp, 'binary') // emulate curl writing the output, then exit 0
      return { status: 0 }
    })
    downloadFile('http://example/x', dest)
    expect(existsSync(dest)).toBe(true)
    expect(existsSync(tmp)).toBe(false)
  })
})

describe('chmodExecutable — surfaces failures instead of swallowing them (#102/#17)', () => {
  it.skipIf(process.platform === 'win32')('sets the executable bit on an existing file', () => {
    const f = join(workDir, 'bin')
    writeFileSync(f, '#!/bin/sh\n', { mode: 0o644 })
    chmodExecutable(f)
    expect(statSync(f).mode & 0o777).toBe(0o755)
  })

  it.skipIf(process.platform === 'win32')('throws when the target does not exist (no silent swallow)', () => {
    expect(() => chmodExecutable(join(workDir, 'does-not-exist'))).toThrow()
  })

  it.runIf(process.platform === 'win32')('is a no-op on Windows', () => {
    expect(() => chmodExecutable(join(workDir, 'whatever.exe'))).not.toThrow()
  })
})
