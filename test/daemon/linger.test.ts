import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import os from 'node:os'

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }))
import { execFileSync } from 'node:child_process'
import { lingerAdvisory } from '../../src/daemon/linger'

const mockExec = vi.mocked(execFileSync)

const ORIG_PLATFORM = process.platform
function setPlatform(p: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value: p, configurable: true })
}

describe('lingerAdvisory', () => {
  beforeEach(() => {
    mockExec.mockReset()
  })
  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: ORIG_PLATFORM, configurable: true })
  })

  it('returns null on macOS — launchd survives reboot via RunAtLoad', () => {
    setPlatform('darwin')
    expect(lingerAdvisory()).toBeNull()
    expect(mockExec).not.toHaveBeenCalled() // never shells out off-Linux
  })

  it('returns null on win32', () => {
    setPlatform('win32')
    expect(lingerAdvisory()).toBeNull()
  })

  it('returns null on Linux when lingering is enabled (--value form: "yes")', () => {
    setPlatform('linux')
    mockExec.mockReturnValue(Buffer.from('yes\n'))
    expect(lingerAdvisory()).toBeNull()
  })

  it('returns null on Linux when lingering is enabled (old "Linger=yes" form)', () => {
    setPlatform('linux')
    mockExec.mockReturnValue(Buffer.from('Linger=yes\n'))
    expect(lingerAdvisory()).toBeNull()
  })

  it('advises enable-linger on Linux when lingering is disabled', () => {
    setPlatform('linux')
    mockExec.mockReturnValue(Buffer.from('no\n'))
    const adv = lingerAdvisory()
    expect(adv).not.toBeNull()
    expect(adv).toContain('sudo loginctl enable-linger')
    expect(adv).toContain(os.userInfo().username)
  })

  it('advises on Linux for the old "Linger=no" form too', () => {
    setPlatform('linux')
    mockExec.mockReturnValue(Buffer.from('Linger=no'))
    expect(lingerAdvisory()).toContain('enable-linger')
  })

  it('returns null on Linux when loginctl is absent / throws — stays quiet', () => {
    setPlatform('linux')
    mockExec.mockImplementation(() => {
      throw new Error('spawn loginctl ENOENT')
    })
    expect(lingerAdvisory()).toBeNull()
  })

  it('queries loginctl read-only (show-user … --property=Linger --value)', () => {
    setPlatform('linux')
    mockExec.mockReturnValue(Buffer.from('no'))
    lingerAdvisory()
    expect(mockExec).toHaveBeenCalledWith(
      'loginctl',
      ['show-user', os.userInfo().username, '--property=Linger', '--value'],
      expect.anything(),
    )
  })
})
