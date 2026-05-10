import { describe, it, expect } from 'vitest'
import { beginCell } from '@ton/ton'
import {
  OP_OFFER_STORAGE_CONTRACT,
  buildOfferStorageContractMessage,
  generateContractMessage,
} from '../src/provider'
import type { DaemonHandle } from '../src/daemon'

// Fixture: a TorrentInfo-like cell (opaque to this builder — we only embed it as a ref).
const fakeTorrentInfo = beginCell()
  .storeUint(0xCAFEBABE, 32)
  .storeUint(123_456n, 64)
  .endCell()

const validHash = Buffer.alloc(32, 0xAB) // 32 × 0xAB
const validRate = 20n                     // 20 nanoTON / MB / day
const validQueryId = 1_715_000_000n       // ~unix seconds

describe('buildOfferStorageContractMessage — TL-B layout', () => {
  it('opcode is 0x107c49ef', () => {
    expect(OP_OFFER_STORAGE_CONTRACT).toBe(0x107c49ef)

    const cell = buildOfferStorageContractMessage({
      queryId: validQueryId,
      torrentInfo: fakeTorrentInfo,
      microchunkHash: validHash,
      expectedRateNanoPerMbDay: validRate,
      expectedMaxSpanSeconds: 86_400,
    })

    const slice = cell.beginParse()
    expect(slice.loadUint(32)).toBe(0x107c49ef)
  })

  it('round-trips queryId / microchunkHash / rate / span exactly', () => {
    const cell = buildOfferStorageContractMessage({
      queryId: validQueryId,
      torrentInfo: fakeTorrentInfo,
      microchunkHash: validHash,
      expectedRateNanoPerMbDay: validRate,
      expectedMaxSpanSeconds: 86_400,
    })

    const slice = cell.beginParse()
    expect(slice.loadUint(32)).toBe(0x107c49ef)
    expect(slice.loadUintBig(64)).toBe(validQueryId)
    // info is a ref — check it's there and identical to what we passed
    expect(cell.refs.length).toBe(1)
    expect(cell.refs[0].equals(fakeTorrentInfo)).toBe(true)

    const microchunkExpected = BigInt('0x' + validHash.toString('hex'))
    expect(slice.loadUintBig(256)).toBe(microchunkExpected)
    expect(slice.loadCoins()).toBe(validRate)
    expect(slice.loadUint(32)).toBe(86_400)
  })

  it('accepts spans far above the daemon CLI uint8 cap (this is the whole point)', () => {
    // 200s cap is a CLI parser bug; on-chain contract takes uint32.
    for (const span of [256, 86_400, 2_592_000, 31_536_000, 0xffff_ffff]) {
      const cell = buildOfferStorageContractMessage({
        queryId: validQueryId,
        torrentInfo: fakeTorrentInfo,
        microchunkHash: validHash,
        expectedRateNanoPerMbDay: validRate,
        expectedMaxSpanSeconds: span,
      })
      const slice = cell.beginParse()
      slice.loadUint(32)        // op
      slice.loadUintBig(64)     // queryId
      slice.loadUintBig(256)    // microchunk
      slice.loadCoins()         // rate
      expect(slice.loadUint(32)).toBe(span)
    }
  })

  it('serialises to a non-empty BOC', () => {
    const cell = buildOfferStorageContractMessage({
      queryId: validQueryId,
      torrentInfo: fakeTorrentInfo,
      microchunkHash: validHash,
      expectedRateNanoPerMbDay: validRate,
      expectedMaxSpanSeconds: 86_400,
    })
    const boc = cell.toBoc()
    expect(boc.length).toBeGreaterThan(0)
  })

  it('is deterministic for identical inputs (byte-equal BOCs)', () => {
    const args = {
      queryId: validQueryId,
      torrentInfo: fakeTorrentInfo,
      microchunkHash: validHash,
      expectedRateNanoPerMbDay: validRate,
      expectedMaxSpanSeconds: 86_400,
    }
    const a = buildOfferStorageContractMessage(args).toBoc()
    const b = buildOfferStorageContractMessage(args).toBoc()
    expect(a.equals(b)).toBe(true)
  })
})

describe('buildOfferStorageContractMessage — guards', () => {
  const baseArgs = {
    queryId: validQueryId,
    torrentInfo: fakeTorrentInfo,
    microchunkHash: validHash,
    expectedRateNanoPerMbDay: validRate,
    expectedMaxSpanSeconds: 86_400,
  }

  it('rejects microchunkHash of wrong length', () => {
    expect(() =>
      buildOfferStorageContractMessage({
        ...baseArgs,
        microchunkHash: Buffer.alloc(31, 0xAB),
      }),
    ).toThrow(/32 bytes/)
  })

  it('rejects span ≤ 0', () => {
    expect(() =>
      buildOfferStorageContractMessage({ ...baseArgs, expectedMaxSpanSeconds: 0 }),
    ).toThrow(/positive integer/)
    expect(() =>
      buildOfferStorageContractMessage({ ...baseArgs, expectedMaxSpanSeconds: -1 }),
    ).toThrow(/positive integer/)
  })

  it('rejects span > uint32 max', () => {
    expect(() =>
      buildOfferStorageContractMessage({
        ...baseArgs,
        expectedMaxSpanSeconds: 0x1_0000_0000,
      }),
    ).toThrow(/uint32/)
  })

  it('rejects non-integer span', () => {
    expect(() =>
      buildOfferStorageContractMessage({ ...baseArgs, expectedMaxSpanSeconds: 1.5 }),
    ).toThrow(/positive integer/)
  })

  it('rejects negative rate', () => {
    expect(() =>
      buildOfferStorageContractMessage({
        ...baseArgs,
        expectedRateNanoPerMbDay: -1n,
      }),
    ).toThrow(/non-negative/)
  })

  it('rejects queryId outside uint64 range', () => {
    expect(() =>
      buildOfferStorageContractMessage({ ...baseArgs, queryId: -1n }),
    ).toThrow(/uint64/)
    expect(() =>
      buildOfferStorageContractMessage({
        ...baseArgs,
        queryId: 0x1_0000_0000_0000_0000n,
      }),
    ).toThrow(/uint64/)
  })
})

interface FakeProvider {
  address: string
  ratePerMbDay: number
  maxSpan: number
  minimalFileSize: number
  maximalFileSize: number
}
function makeProvider(overrides: Partial<FakeProvider> = {}): FakeProvider {
  return {
    address: '0:cafe',
    ratePerMbDay: 20,
    maxSpan: 86_400,
    minimalFileSize: 0,
    maximalFileSize: 0,
    ...overrides,
  }
}

describe('generateContractMessage — span vs provider.maxSpan guard', () => {
  // Daemon is never reached: the guards at the top of generateContractMessage
  // fire before any daemon call.
  const fakeDaemon = {} as unknown as DaemonHandle

  it('throws when span exceeds provider.maxSpan', () => {
    const provider = makeProvider({ maxSpan: 3600 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 86_400),
    ).toThrow(/exceeds provider's max_span/)
  })

  it('throws with helpful suggestion text', () => {
    const provider = makeProvider({ maxSpan: 3600 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 86_400),
    ).toThrow(/--span ≤ 3600/)
  })

  it('accepts span equal to provider.maxSpan (boundary)', () => {
    const provider = makeProvider({ maxSpan: 86_400 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 86_400),
    ).not.toThrow(/exceeds provider's max_span/)
  })

  it('skips guard when provider.maxSpan is 0 (manual address fallback)', () => {
    const provider = makeProvider({ ratePerMbDay: 0, maxSpan: 0 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 999_999),
    ).not.toThrow(/exceeds provider's max_span/)
  })

  it('rejects span outside uint32 range before checking maxSpan', () => {
    const provider = makeProvider()
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 0),
    ).toThrow(/positive integer/)
  })
})

describe('generateContractMessage — bag size vs provider file-size range', () => {
  const fakeDaemon = {} as unknown as DaemonHandle

  it('throws when bag is smaller than provider.minimalFileSize', () => {
    const provider = makeProvider({ minimalFileSize: 1024, maximalFileSize: 1_000_000 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 76, provider, fakeDaemon, 86_400),
    ).toThrow(/76 bytes; provider requires ≥ 1024 bytes/)
  })

  it('throws when bag is larger than provider.maximalFileSize', () => {
    const provider = makeProvider({ minimalFileSize: 0, maximalFileSize: 1024 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 4096, provider, fakeDaemon, 86_400),
    ).toThrow(/provider accepts ≤ 1024 bytes/)
  })

  it('accepts boundary sizes (=== minimal and === maximal)', () => {
    const provider = makeProvider({ minimalFileSize: 1024, maximalFileSize: 1_000_000 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 1024, provider, fakeDaemon, 86_400),
    ).not.toThrow(/file_too_small|provider requires/)
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 1_000_000, provider, fakeDaemon, 86_400),
    ).not.toThrow(/file_too_big|provider accepts/)
  })

  it('skips both checks when sentinels are 0 (manual address fallback)', () => {
    const provider = makeProvider({ minimalFileSize: 0, maximalFileSize: 0 })
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 1, provider, fakeDaemon, 86_400),
    ).not.toThrow(/provider requires|provider accepts/)
  })
})
