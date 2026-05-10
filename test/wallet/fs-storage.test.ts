import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { FSStorage } from '../../src/wallet/FSStorage'

let workDir: string
let storagePath: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'sdk-fsstorage-'))
  storagePath = join(workDir, 'tonconnect.json')
})

afterEach(() => {
  try { rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
})

describe('FSStorage', () => {
  it('returns null for an unknown key', async () => {
    const s = new FSStorage(storagePath)
    expect(await s.getItem('missing')).toBeNull()
  })

  it('round-trips set/get', async () => {
    const s = new FSStorage(storagePath)
    await s.setItem('k', 'v')
    expect(await s.getItem('k')).toBe('v')
  })

  it('persists across instances (same path)', async () => {
    const a = new FSStorage(storagePath)
    await a.setItem('shared', 'yes')

    const b = new FSStorage(storagePath)
    expect(await b.getItem('shared')).toBe('yes')
  })

  it('removes an item', async () => {
    const s = new FSStorage(storagePath)
    await s.setItem('k', 'v')
    await s.removeItem('k')
    expect(await s.getItem('k')).toBeNull()
  })

  it('creates parent directories on first write', async () => {
    const nested = join(workDir, 'a', 'b', 'c', 'tonconnect.json')
    const s = new FSStorage(nested)
    await s.setItem('k', 'v')
    expect(existsSync(nested)).toBe(true)
  })

  it('writes valid JSON', async () => {
    const s = new FSStorage(storagePath)
    await s.setItem('one', '1')
    await s.setItem('two', '2')
    const raw = readFileSync(storagePath, 'utf-8')
    expect(JSON.parse(raw)).toEqual({ one: '1', two: '2' })
  })

  it('writes the file with 0600 mode (owner-only)', async () => {
    const s = new FSStorage(storagePath)
    await s.setItem('secret', 'value')
    // Lower 9 bits of st_mode are the unix permission bits.
    const mode = statSync(storagePath).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('keeps 0600 mode after subsequent writes', async () => {
    const s = new FSStorage(storagePath)
    await s.setItem('a', '1')
    await s.setItem('b', '2')
    const mode = statSync(storagePath).mode & 0o777
    expect(mode).toBe(0o600)
  })
})
