import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// pollDnsRecord / pollDnsSiteRecord call getDnsResolved → httpsGet. Mock the
// HTTP layer so we can feed crafted (and malformed) TONAPI responses.
vi.mock('../src/utils/http', () => ({ httpsGet: vi.fn() }))

import { httpsGet } from '../src/utils/http'
import { pollDnsRecord, pollDnsSiteRecord } from '../src/dns'

const mockGet = httpsGet as unknown as ReturnType<typeof vi.fn>
const EXPECTED_ADNL = 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516'

describe('pollDnsSiteRecord — malformed TONAPI `sites` does not crash the poll loop (#102/#11)', () => {
  beforeEach(() => mockGet.mockReset())

  // Every one of these would crash the old `(data?.sites ?? []).map(...)`:
  // non-arrays have no .map; arrays of non-strings break `.toLowerCase()`.
  const malformed: unknown[] = [null, undefined, {}, { foo: 1 }, 42, 'a-string', [123, null, { x: 1 }]]
  for (const bad of malformed) {
    it(`tolerates sites=${JSON.stringify(bad) ?? 'undefined'} → resolves false, no throw`, async () => {
      mockGet.mockResolvedValue({ sites: bad })
      await expect(
        pollDnsSiteRecord('mysite.ton', EXPECTED_ADNL, 20, 5, false, { silent: true }),
      ).resolves.toBe(false)
    })
  }

  it('still matches a well-formed sites array (case/0x-insensitive)', async () => {
    mockGet.mockResolvedValue({ sites: ['0x' + EXPECTED_ADNL.toUpperCase()] })
    await expect(
      pollDnsSiteRecord('mysite.ton', EXPECTED_ADNL, 5_000, 5, false, { silent: true }),
    ).resolves.toBe(true)
  })
})

describe('pollDnsRecord — timeout hint normalizes a shorthand domain (#102/#19)', () => {
  let logs: string[]
  let logSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    mockGet.mockReset()
    logs = []
    logSpy = vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
      logs.push(a.map(String).join(' '))
    })
  })
  afterEach(() => logSpy.mockRestore())

  it('prints the .ton-normalized URL for a bare domain on timeout', async () => {
    mockGet.mockResolvedValue({ storage: 'deadbeef' }) // never equals the expected bag id
    const ok = await pollDnsRecord('mysite', 'a'.repeat(64), 20, 5, false)
    expect(ok).toBe(false)
    const hint = logs.find((l) => l.includes('/v2/dns/'))
    expect(hint).toBeDefined()
    expect(hint).toContain('/v2/dns/mysite.ton/resolve')
    expect(hint).not.toContain('/v2/dns/mysite/resolve')
  })

  it('leaves an already-.ton domain unchanged in the hint', async () => {
    mockGet.mockResolvedValue({ storage: 'deadbeef' })
    await pollDnsRecord('mysite.ton', 'a'.repeat(64), 20, 5, false)
    const hint = logs.find((l) => l.includes('/v2/dns/'))
    expect(hint).toContain('/v2/dns/mysite.ton/resolve')
  })
})
