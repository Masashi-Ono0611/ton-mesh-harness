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
})
