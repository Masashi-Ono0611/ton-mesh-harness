import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectPublicIp } from '../../src/daemon/rldp-http-proxy-process'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(text: string, ok = true): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, text: async () => text }))
}

describe('detectPublicIp — validates the IPv4 (#102/#14)', () => {
  it('returns a valid public IPv4 (trimmed)', async () => {
    stubFetch('203.0.113.5\n')
    expect(await detectPublicIp()).toBe('203.0.113.5')
  })

  it('rejects out-of-range octets (the old regex accepted 999.999.999.999)', async () => {
    stubFetch('999.999.999.999')
    expect(await detectPublicIp()).toBeNull()
  })

  it('rejects a non-IP body', async () => {
    stubFetch('not-an-ip')
    expect(await detectPublicIp()).toBeNull()
  })

  it('rejects an IPv6 address (IPv4 only)', async () => {
    stubFetch('2001:db8::1')
    expect(await detectPublicIp()).toBeNull()
  })

  it('returns null on a non-ok response', async () => {
    stubFetch('203.0.113.5', false)
    expect(await detectPublicIp()).toBeNull()
  })
})
