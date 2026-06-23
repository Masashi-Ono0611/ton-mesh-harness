import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync } from 'fs'
import fsp from 'fs/promises'
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

  // #9: concurrent read-modify-write must not lose updates.
  it('does not lose updates under concurrent setItem (serialized read-modify-write)', async () => {
    const s = new FSStorage(storagePath)
    const keys = Array.from({ length: 20 }, (_, i) => `k${i}`)
    await Promise.all(keys.map((k, i) => s.setItem(k, String(i))))
    const persisted = JSON.parse(readFileSync(storagePath, 'utf-8'))
    for (let i = 0; i < keys.length; i++) {
      expect(persisted[keys[i]]).toBe(String(i))
    }
    expect(Object.keys(persisted)).toHaveLength(keys.length)
  })

  it('serializes a removeItem against concurrent setItems without dropping survivors', async () => {
    const s = new FSStorage(storagePath)
    await s.setItem('keep', 'yes')
    await Promise.all([
      s.setItem('a', '1'),
      s.removeItem('keep'),
      s.setItem('b', '2'),
    ])
    const persisted = JSON.parse(readFileSync(storagePath, 'utf-8'))
    expect(persisted.a).toBe('1')
    expect(persisted.b).toBe('2')
    expect('keep' in persisted).toBe(false)
  })

  // #10: a non-ENOENT lstat error (e.g. EACCES/ELOOP) must surface, not be
  // swallowed — swallowing it would defeat the symlink defense and let the
  // write proceed past a permission/loop failure.
  it('surfaces a non-ENOENT lstat error from writeObject instead of swallowing it', async () => {
    const s = new FSStorage(storagePath)
    const eacces = Object.assign(new Error('EACCES: permission denied, lstat'), { code: 'EACCES' })
    const spy = vi.spyOn(fsp, 'lstat').mockRejectedValue(eacces)
    try {
      await expect(s.setItem('k', 'v')).rejects.toMatchObject({ code: 'EACCES' })
    } finally {
      spy.mockRestore()
    }
  })

  it('still treats a missing file (ENOENT lstat) as a normal first write', async () => {
    // ENOENT is the expected "no file yet" case — it must NOT surface.
    const s = new FSStorage(storagePath)
    await expect(s.setItem('first', 'write')).resolves.toBeUndefined()
    expect(await s.getItem('first')).toBe('write')
  })
})
