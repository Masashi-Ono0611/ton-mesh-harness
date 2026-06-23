import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock only chmodSync + accessSync (keep the rest of node:fs real) to drive the
// "chmod failed but file may still be executable" branch deterministically.
const { chmodSync, accessSync } = vi.hoisted(() => ({ chmodSync: vi.fn(), accessSync: vi.fn() }))
vi.mock('node:fs', async (orig) => {
  const actual = await orig<typeof import('node:fs')>()
  return { ...actual, chmodSync, accessSync }
})

import { chmodExecutable } from '../../src/daemon/installer-utils'

describe.skipIf(process.platform === 'win32')(
  'chmodExecutable — tolerate chmod failure iff the file is executable (#102/#17)',
  () => {
    beforeEach(() => {
      chmodSync.mockReset()
      accessSync.mockReset()
    })

    it('chmod succeeds → no access re-check needed', () => {
      chmodSync.mockReturnValue(undefined)
      expect(() => chmodExecutable('/bin/whatever')).not.toThrow()
      expect(accessSync).not.toHaveBeenCalled()
    })

    it('chmod fails but the file is executable (perm-less FS) → tolerated', () => {
      chmodSync.mockImplementation(() => {
        throw Object.assign(new Error('EPERM: operation not permitted, chmod'), { code: 'EPERM' })
      })
      accessSync.mockReturnValue(undefined) // X_OK passes
      expect(() => chmodExecutable('/mnt/exfat/storage-daemon')).not.toThrow()
      expect(accessSync).toHaveBeenCalledTimes(1)
    })

    it('chmod fails AND the file is not executable → surfaces the error', () => {
      chmodSync.mockImplementation(() => {
        throw Object.assign(new Error('EROFS: read-only file system, chmod'), { code: 'EROFS' })
      })
      accessSync.mockImplementation(() => {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' })
      })
      expect(() => chmodExecutable('/ro/storage-daemon')).toThrow(/not executable and chmod failed/)
    })
  },
)
