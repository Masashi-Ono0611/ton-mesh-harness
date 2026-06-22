import { describe, it, expect } from 'vitest'
import { networkInterfaces } from 'node:os'
import { guessPrimaryIface, isPublicIpLocallyBound } from '../../src/daemon/net'

describe('isPublicIpLocallyBound', () => {
  it('returns true for the loopback address (always locally bound)', () => {
    expect(isPublicIpLocallyBound('127.0.0.1')).toBe(true)
  })

  it('returns false for a public IP that is not on any local NIC (NAT case)', () => {
    // 8.8.8.8 (Google DNS) is never a local interface address on a dev/CI host.
    expect(isPublicIpLocallyBound('8.8.8.8')).toBe(false)
  })

  it('returns true for an address actually reported by os.networkInterfaces()', () => {
    // Cross-check against the live interface table so the test is host-agnostic.
    const anyIpv4 = Object.values(networkInterfaces())
      .flatMap((a) => a ?? [])
      .find((a) => a.family === 'IPv4')
    if (anyIpv4) {
      expect(isPublicIpLocallyBound(anyIpv4.address)).toBe(true)
    }
  })
})

describe('guessPrimaryIface', () => {
  it('returns a real non-internal interface name or null (no hard-coded guess)', () => {
    const iface = guessPrimaryIface()
    if (iface !== null) {
      expect(typeof iface).toBe('string')
      expect(iface.length).toBeGreaterThan(0)
      // It must be a name os actually reports.
      expect(Object.keys(networkInterfaces())).toContain(iface)
    }
  })
})
