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

describe('generateContractMessage — span vs provider.maxSpan guard', () => {
  // Daemon is never reached: the guard at the top of generateContractMessage
  // fires before any daemon call.
  const fakeDaemon = {} as unknown as DaemonHandle

  it('throws when span exceeds provider.maxSpan', () => {
    const provider = {
      address: '0:cafe',
      ratePerMbDay: 20,
      maxSpan: 3600, // 1 hour
    }
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 86_400),
    ).toThrow(/exceeds provider's max_span/)
  })

  it('throws with helpful suggestion text', () => {
    const provider = {
      address: '0:cafe',
      ratePerMbDay: 20,
      maxSpan: 3600,
    }
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 86_400),
    ).toThrow(/--span ≤ 3600/)
  })

  it('accepts span equal to provider.maxSpan (boundary)', () => {
    const provider = {
      address: '0:cafe',
      ratePerMbDay: 20,
      maxSpan: 86_400,
    }
    // The guard should NOT throw; we only need to confirm it gets past the
    // guard and then fails downstream (daemon CLI absent), which manifests as
    // a different error message.
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 86_400),
    ).not.toThrow(/exceeds provider's max_span/)
  })

  it('skips guard when provider.maxSpan is 0 (manual address fallback)', () => {
    const provider = {
      address: '0:cafe',
      ratePerMbDay: 0,
      maxSpan: 0, // sentinel — provider params unknown
    }
    // The guard should be bypassed; downstream will fail because no daemon,
    // but NOT with the maxSpan error.
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 999_999),
    ).not.toThrow(/exceeds provider's max_span/)
  })

  it('rejects span outside uint32 range before checking maxSpan', () => {
    const provider = {
      address: '0:cafe',
      ratePerMbDay: 20,
      maxSpan: 86_400,
    }
    expect(() =>
      generateContractMessage('00ff'.repeat(16), 100, provider, fakeDaemon, 0),
    ).toThrow(/positive integer/)
  })
})
