import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Address, beginCell, type Cell } from '@ton/core'

// Mock ONLY TonClient from @ton/ton (keep the real Address/beginCell/Cell that
// src/dns.ts imports from it, so buildDnsStorageRecord still works).
const runMethodMock = vi.fn()
vi.mock('@ton/ton', async (importActual) => {
  const actual = await importActual<typeof import('@ton/ton')>()
  return { ...actual, TonClient: class { runMethod = runMethodMock } }
})

import { buildDnsStorageRecord } from '../src/dns'
import { resolveStorageRecordOnChain, storageRecordMatchesOnChain } from '../src/sdk/dns-onchain'

const NFT = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000')
const BAG = '4a0130acfe6c658eac2d8cf3451251c2a037c05d528ae96d62b81347a73dd258'

/** Mimic a TonClient.runMethod result whose stack is (resolved_bits, value). */
function stackFor(cell: Cell | null, bits = 8) {
  return { stack: { readNumber: () => bits, readCellOpt: () => cell } }
}

describe('resolveStorageRecordOnChain (#119)', () => {
  beforeEach(() => runMethodMock.mockReset())

  it('parses a dns_storage_address record → bag hex (round-trips buildDnsStorageRecord)', async () => {
    runMethodMock.mockResolvedValueOnce(stackFor(buildDnsStorageRecord(BAG)))
    expect(await resolveStorageRecordOnChain({ nftAddress: NFT, network: 'mainnet' })).toBe(BAG)
  })

  it('returns null when the record cell is absent', async () => {
    runMethodMock.mockResolvedValueOnce(stackFor(null, 0))
    expect(await resolveStorageRecordOnChain({ nftAddress: NFT, network: 'mainnet' })).toBeNull()
  })

  it('returns null on a non-storage magic (e.g. an ADNL site record)', async () => {
    const adnlish = beginCell().storeUint(0xad01, 16).storeUint(0n, 256).endCell()
    runMethodMock.mockResolvedValueOnce(stackFor(adnlish))
    expect(await resolveStorageRecordOnChain({ nftAddress: NFT, network: 'mainnet' })).toBeNull()
  })

  it('returns null when runMethod throws (best-effort, never throws)', async () => {
    runMethodMock.mockRejectedValueOnce(new Error('node unreachable'))
    expect(await resolveStorageRecordOnChain({ nftAddress: NFT, network: 'mainnet' })).toBeNull()
  })
})

describe('storageRecordMatchesOnChain (#119)', () => {
  beforeEach(() => runMethodMock.mockReset())

  it('true when the on-chain storage record equals the expected bag', async () => {
    runMethodMock.mockResolvedValueOnce(stackFor(buildDnsStorageRecord(BAG)))
    expect(await storageRecordMatchesOnChain({ nftAddress: NFT, network: 'mainnet', expectedBag: BAG })).toBe(true)
  })

  it('false when the on-chain record points to a different bag', async () => {
    runMethodMock.mockResolvedValueOnce(stackFor(buildDnsStorageRecord(BAG)))
    expect(
      await storageRecordMatchesOnChain({ nftAddress: NFT, network: 'mainnet', expectedBag: 'ff'.repeat(32) }),
    ).toBe(false)
  })

  it('false (not a throw) when the on-chain read fails', async () => {
    runMethodMock.mockRejectedValueOnce(new Error('down'))
    expect(await storageRecordMatchesOnChain({ nftAddress: NFT, network: 'mainnet', expectedBag: BAG })).toBe(false)
  })
})
