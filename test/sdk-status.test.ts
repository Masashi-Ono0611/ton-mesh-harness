import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpsGetMock: vi.fn(),
  getDomainNftAddressMock: vi.fn(),
  extractStorageBagIdMock: vi.fn(),
}))

vi.mock('../src/utils/http', () => ({
  httpsGet: mocks.httpsGetMock,
}))

vi.mock('../src/dns', () => ({
  getDomainNftAddress: mocks.getDomainNftAddressMock,
  extractStorageBagId: mocks.extractStorageBagIdMock,
}))

import { status } from '../src/sdk/status'
import { SdkError } from '../src/sdk/deploy'

describe('status()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => vi.restoreAllMocks())

  it('rejects malformed input with ERR_INVALID_INPUT', async () => {
    await expect(status({} as never)).rejects.toThrowError(SdkError)
  })

  it('accessible bag without domain — returns bag fields, null domain', async () => {
    mocks.httpsGetMock.mockResolvedValueOnce({
      status: 'active',
      size: 1024,
      file_count: 3,
    })
    const r = await status({ bag_id: 'abc123' })
    expect(r.bag_id).toBe('abc123')
    expect(r.bag_accessible).toBe(true)
    expect(r.bag_size_bytes).toBe(1024)
    expect(r.bag_file_count).toBe(3)
    expect(r.domain).toBeNull()
  })

  // #102/#12: a malformed TONAPI size (negative / fractional) must NOT make
  // status() throw a raw ZodError from StatusResultSchema.parse — it should
  // coerce to null and still resolve (the "never throws on a network response"
  // contract).
  it('coerces a malformed (negative / fractional) TONAPI size to null without throwing', async () => {
    mocks.httpsGetMock.mockResolvedValueOnce({
      status: 'active',
      size: -5,
      file_count: 3.14,
    })
    const r = await status({ bag_id: 'abc123' })
    expect(r.bag_accessible).toBe(true)
    expect(r.bag_size_bytes).toBeNull()
    expect(r.bag_file_count).toBeNull()
  })

  it('TONAPI 404 / network failure → bag_accessible false, sizes null', async () => {
    mocks.httpsGetMock.mockRejectedValueOnce(new Error('timeout'))
    const r = await status({ bag_id: 'abc123' })
    expect(r.bag_accessible).toBe(false)
    expect(r.bag_size_bytes).toBeNull()
    expect(r.bag_file_count).toBeNull()
  })

  it('TONAPI status="not_found" → bag_accessible false', async () => {
    mocks.httpsGetMock.mockResolvedValueOnce({ status: 'not_found' })
    const r = await status({ bag_id: 'abc123' })
    expect(r.bag_accessible).toBe(false)
  })

  it('with domain — fetches NFT address + resolves bag_id from DNS', async () => {
    // Two http calls: bag probe + domain resolve. NFT lookup is a third
    // call to getDomainNftAddress (mocked separately).
    mocks.httpsGetMock
      .mockResolvedValueOnce({ status: 'active', size: 100, file_count: 1 })
      .mockResolvedValueOnce({ storage: 'abc123' })
    mocks.getDomainNftAddressMock.mockResolvedValueOnce({
      toString: () => 'EQNftAddress',
    })
    mocks.extractStorageBagIdMock.mockReturnValueOnce('abc123')
    const r = await status({ bag_id: 'abc123', domain: 'foo.ton' })
    expect(r.domain).toEqual({
      name: 'foo.ton',
      nft_address: 'EQNftAddress',
      resolved_bag_id: 'abc123',
      matches: true,
    })
  })

  it('matches=false when DNS points at a different bag', async () => {
    mocks.httpsGetMock
      .mockResolvedValueOnce({ status: 'active', size: 100, file_count: 1 })
      .mockResolvedValueOnce({ storage: 'OTHER' })
    mocks.getDomainNftAddressMock.mockResolvedValueOnce({
      toString: () => 'EQNftAddress',
    })
    mocks.extractStorageBagIdMock.mockReturnValueOnce('other')
    const r = await status({ bag_id: 'abc123', domain: 'foo.ton' })
    expect(r.domain?.matches).toBe(false)
    expect(r.domain?.resolved_bag_id).toBe('other')
  })

  it('matches=true is case-insensitive', async () => {
    mocks.httpsGetMock
      .mockResolvedValueOnce({ status: 'active', size: 100, file_count: 1 })
      .mockResolvedValueOnce({ storage: 'ABC123' })
    mocks.getDomainNftAddressMock.mockResolvedValueOnce({
      toString: () => 'EQNftAddress',
    })
    mocks.extractStorageBagIdMock.mockReturnValueOnce('ABC123')
    const r = await status({ bag_id: 'abc123', domain: 'foo.ton' })
    expect(r.domain?.matches).toBe(true)
  })

  it('domain NFT lookup failure → nft_address null but still returns', async () => {
    mocks.httpsGetMock
      .mockResolvedValueOnce({ status: 'active', size: 100, file_count: 1 })
      .mockResolvedValueOnce({ storage: 'abc123' })
    mocks.getDomainNftAddressMock.mockRejectedValueOnce(new Error('TONAPI 404'))
    mocks.extractStorageBagIdMock.mockReturnValueOnce('abc123')
    const r = await status({ bag_id: 'abc123', domain: 'foo.ton' })
    expect(r.domain?.nft_address).toBeNull()
    expect(r.domain?.resolved_bag_id).toBe('abc123')
  })

  it('domain DNS resolve failure → resolved_bag_id null, matches false', async () => {
    mocks.httpsGetMock
      .mockResolvedValueOnce({ status: 'active', size: 100, file_count: 1 })
      .mockRejectedValueOnce(new Error('boom'))
    mocks.getDomainNftAddressMock.mockResolvedValueOnce({
      toString: () => 'EQNftAddress',
    })
    const r = await status({ bag_id: 'abc123', domain: 'foo.ton' })
    expect(r.domain?.resolved_bag_id).toBeNull()
    expect(r.domain?.matches).toBe(false)
  })

  it('result satisfies StatusResultSchema (round-trip validates)', async () => {
    mocks.httpsGetMock.mockResolvedValueOnce({ status: 'active', size: 1, file_count: 1 })
    const r = await status({ bag_id: 'abc' })
    // status() parses output through StatusResultSchema before returning,
    // so any shape drift would throw. Reach here = round-trip OK.
    expect(r).toBeDefined()
  })

  it('hits the canonical TONAPI v2/storage/bag/{id} path (NOT /blockchain/storage/...)', async () => {
    // Regression guard for a URL-drift bug caught in self-review:
    // the first commit of this module had `/v2/blockchain/storage/bags/{id}`
    // (plural, wrong namespace) instead of the working `/v2/storage/bag/{id}`
    // that src/verify.ts has used since v0.3.
    mocks.httpsGetMock.mockResolvedValueOnce({ status: 'active', size: 1, file_count: 1 })
    await status({ bag_id: 'abc' })
    const calledUrl = mocks.httpsGetMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('/v2/storage/bag/abc')
    expect(calledUrl).not.toContain('/v2/blockchain/storage')
    expect(calledUrl).not.toContain('/bags/')
  })

  it('uses mainnet TONAPI by default and testnet TONAPI when testnet=true', async () => {
    mocks.httpsGetMock.mockResolvedValueOnce({ status: 'active' })
    await status({ bag_id: 'abc' })
    expect(mocks.httpsGetMock.mock.calls[0][0]).toContain('tonapi.io/v2/storage/bag/abc')

    mocks.httpsGetMock.mockResolvedValueOnce({ status: 'active' })
    await status({ bag_id: 'abc', testnet: true })
    expect(mocks.httpsGetMock.mock.calls[1][0]).toContain('testnet.tonapi.io/v2/storage/bag/abc')
  })

  it('retries TONAPI once on transient failure (5xx → success)', async () => {
    mocks.httpsGetMock
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce({ status: 'active', size: 1024, file_count: 3 })
    const r = await status({ bag_id: 'abc' })
    expect(r.bag_accessible).toBe(true)
    expect(r.bag_size_bytes).toBe(1024)
    expect(mocks.httpsGetMock).toHaveBeenCalledTimes(2)
  })

  it('gives up after exactly 2 attempts on persistent failure', async () => {
    mocks.httpsGetMock
      .mockRejectedValueOnce(new Error('503'))
      .mockRejectedValueOnce(new Error('503'))
    const r = await status({ bag_id: 'abc' })
    expect(r.bag_accessible).toBe(false)
    expect(mocks.httpsGetMock).toHaveBeenCalledTimes(2)
  })

  // Codex review 2026-05-12 MAJOR: status() absorbed both "not_found"
  // (the genuine "bag not propagated yet" state) AND "network error"
  // (TONAPI unreachable / endpoint drifted) into bag_accessible=false.
  // bag_unavailable_reason now lets callers distinguish.

  it('not_found → bag_unavailable_reason="not_found"', async () => {
    mocks.httpsGetMock.mockResolvedValueOnce({ status: 'not_found' })
    const r = await status({ bag_id: 'abc' })
    expect(r.bag_accessible).toBe(false)
    expect(r.bag_unavailable_reason).toBe('not_found')
  })

  it('network 5xx (persistent) → bag_unavailable_reason="network_error"', async () => {
    mocks.httpsGetMock
      .mockRejectedValueOnce(new Error('503 down'))
      .mockRejectedValueOnce(new Error('503 still down'))
    const r = await status({ bag_id: 'abc' })
    expect(r.bag_accessible).toBe(false)
    expect(r.bag_unavailable_reason).toBe('network_error')
  })

  it('accessible bag → bag_unavailable_reason=null', async () => {
    mocks.httpsGetMock.mockResolvedValueOnce({ status: 'active', size: 1, file_count: 1 })
    const r = await status({ bag_id: 'abc' })
    expect(r.bag_accessible).toBe(true)
    expect(r.bag_unavailable_reason).toBeNull()
  })

  // Codex review 2026-05-12 (verify pass): TONAPI returns HTTP 404 for
  // un-indexed bags. httpsGet wraps that as "Not found: <url>". The
  // catch branch used to classify this as network_error (along with
  // real 5xx / transport failures), which is wrong — 404 is the
  // genuine "not propagated" state.

  it('TONAPI 404 (httpsGet throws "Not found") → bag_unavailable_reason="not_found"', async () => {
    mocks.httpsGetMock.mockRejectedValueOnce(
      new Error('Not found: https://tonapi.io/v2/storage/bag/abc'),
    )
    const r = await status({ bag_id: 'abc' })
    expect(r.bag_accessible).toBe(false)
    expect(r.bag_unavailable_reason).toBe('not_found')
    // 404 short-circuits the retry — only one call.
    expect(mocks.httpsGetMock).toHaveBeenCalledTimes(1)
  })

  it('"HTTP 404" error string also maps to not_found', async () => {
    mocks.httpsGetMock.mockRejectedValueOnce(new Error('HTTP 404: '))
    const r = await status({ bag_id: 'abc' })
    expect(r.bag_unavailable_reason).toBe('not_found')
  })
})
