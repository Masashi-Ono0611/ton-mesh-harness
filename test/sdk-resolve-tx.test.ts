import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Unit tests for resolve-tx.ts. We mock `@ton/walletkit` so the test
 * exercises the polling loop, hex/base64 conversion, abort handling,
 * and the malformed-input fast-fail path without any real network IO.
 */

const mocks = vi.hoisted(() => ({
  getTransactionsByHashMock: vi.fn(),
  apiClientCtorMock: vi.fn(),
}))

vi.mock('@ton/walletkit', () => {
  return {
    ApiClientToncenter: mocks.apiClientCtorMock.mockImplementation((cfg: unknown) => ({
      cfg,
      getTransactionsByHash: mocks.getTransactionsByHashMock,
    })),
    Network: {
      mainnet: () => ({ chainId: '-239' }),
      testnet: () => ({ chainId: '-3' }),
    },
  }
})

import { Address, beginCell, external, storeMessage } from '@ton/core'
import { normalizedExternalInHashHex, resolveTxHashFromMessageHash } from '../src/sdk/resolve-tx'

describe('resolveTxHashFromMessageHash', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiClientCtorMock.mockImplementation((cfg: unknown) => ({
      cfg,
      getTransactionsByHash: mocks.getTransactionsByHashMock,
    }))
  })
  afterEach(() => vi.restoreAllMocks())

  const goodHex = '0x' + 'ab'.repeat(32) // 64 hex chars after strip

  it('returns null on malformed hex (fast-fail, no network call)', async () => {
    const out = await resolveTxHashFromMessageHash('0xnot_hex', 'mainnet', { timeout_ms: 100 })
    expect(out.txHash).toBeNull()
    expect(mocks.apiClientCtorMock).not.toHaveBeenCalled()
  })

  it('accepts short hex (pad-start to 64) — does NOT fast-fail', async () => {
    // Walletkit drops leading zero nibbles; short hex is valid input.
    // The lookup runs (returns nothing → polls until timeout).
    mocks.getTransactionsByHashMock.mockResolvedValue({ transactions: [] })
    const out = await resolveTxHashFromMessageHash('0xabcd', 'mainnet', {
      timeout_ms: 80,
      interval_ms: 10,
    })
    expect(out.txHash).toBeNull()
    // The lookup WAS attempted (not fast-failed at the regex).
    expect(mocks.getTransactionsByHashMock).toHaveBeenCalled()
  })

  it('returns tx hash with 0x prefix when Toncenter has indexed', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: 'deadbeef1234' }],
    })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 10,
    })
    expect(out.txHash).toBe('0xdeadbeef1234')
  })

  it('lower-cases and prefixes 0x once, even if input is uppercase or already prefixed', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: '0xABCDEF' }],
    })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 10,
    })
    expect(out.txHash).toBe('0xabcdef')
  })

  it('polls until success', async () => {
    mocks.getTransactionsByHashMock
      .mockResolvedValueOnce({ transactions: [] })
      .mockResolvedValueOnce({ transactions: [] })
      .mockResolvedValueOnce({ transactions: [{ hash: 'cafe1234' }] })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 1,
    })
    expect(out.txHash).toBe('0xcafe1234')
    expect(mocks.getTransactionsByHashMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('returns null on timeout, throttled=false when responses were just empty (#120)', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValue({ transactions: [] })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 80,
      interval_ms: 10,
    })
    expect(out).toEqual({ txHash: null, throttled: false })
  })

  it('reports throttled=true on timeout when the last failures were rate-limit/auth (#120)', async () => {
    mocks.getTransactionsByHashMock
      .mockRejectedValueOnce(new Error('429 too many requests'))
      .mockRejectedValue(new Error('401 unauthorized'))
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 60,
      interval_ms: 10,
    })
    expect(out).toEqual({ txHash: null, throttled: true })
  })

  it('reports throttled=false when the last failure recovered to a benign not-indexed (#120)', async () => {
    mocks.getTransactionsByHashMock
      .mockRejectedValueOnce(new Error('429 too many requests'))
      .mockResolvedValue({ transactions: [] }) // recovered → not throttled at timeout
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 60,
      interval_ms: 10,
    })
    expect(out).toEqual({ txHash: null, throttled: false })
  })

  it('gives up EARLY after 5 consecutive throttles (does not poll the full window) (#120)', async () => {
    mocks.getTransactionsByHashMock.mockRejectedValue(new Error('429 too many requests'))
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      // Long window — but it must bail after ~5 attempts, not poll for 10s.
      timeout_ms: 10_000,
      interval_ms: 1,
    })
    expect(out).toEqual({ txHash: null, throttled: true })
    // 5 consecutive throttles trigger give-up — far fewer than a full 10s poll.
    expect(mocks.getTransactionsByHashMock.mock.calls.length).toBe(5)
  })

  it('swallows toncenter errors and keeps polling', async () => {
    mocks.getTransactionsByHashMock
      .mockRejectedValueOnce(new Error('429 too many requests'))
      .mockRejectedValueOnce(new Error('500 internal'))
      .mockResolvedValueOnce({ transactions: [{ hash: 'ok42' }] })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 1,
    })
    expect(out.txHash).toBe('0xok42')
  })

  it('aborts immediately on pre-aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 100,
      signal: controller.signal,
    })
    expect(out.txHash).toBeNull()
  })

  it('selects testnet endpoint for testnet network', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: 'feed' }],
    })
    await resolveTxHashFromMessageHash(goodHex, 'testnet', { timeout_ms: 5_000, interval_ms: 1 })
    expect(mocks.apiClientCtorMock).toHaveBeenCalled()
    const cfg = mocks.apiClientCtorMock.mock.calls[0][0] as { endpoint: string }
    expect(cfg.endpoint).toBe('https://testnet.toncenter.com')
  })

  it('passes toncenter_api_key through', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: 'feed' }],
    })
    await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 1,
      toncenter_api_key: 'KEY',
    })
    const cfg = mocks.apiClientCtorMock.mock.calls[0][0] as { apiKey: string }
    expect(cfg.apiKey).toBe('KEY')
  })

  it('converts hex msg hash to padded base64 for the toncenter query', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: 'feed' }],
    })
    await resolveTxHashFromMessageHash(goodHex, 'mainnet', { timeout_ms: 5_000, interval_ms: 1 })
    const arg = mocks.getTransactionsByHashMock.mock.calls[0][0] as { msgHash: string }
    // 32 bytes → 44 base64 chars w/ padding (one '=' at end)
    expect(arg.msgHash.length).toBe(44)
    expect(arg.msgHash.endsWith('=')).toBe(true)
    // round-trip back to hex matches input
    const roundTripHex = Buffer.from(arg.msgHash, 'base64').toString('hex')
    expect(roundTripHex).toBe(goodHex.slice(2))
  })

  it('pad-shorts left-pad with zeros when walletkit drops leading zero nibbles', async () => {
    // Walletkit returns `0x${bigInt.toString(16)}` — a 32-byte hash that
    // starts with a zero byte becomes 62 hex chars. The resolver must
    // pad-start to 64 before base64 encoding, otherwise the lookup
    // misses (Codex S2.7 review MAJOR 2 fix).
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: 'feed' }],
    })
    const shortHex = '0x' + 'ab'.repeat(31) // 62 chars (= leading 00 byte dropped)
    await resolveTxHashFromMessageHash(shortHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 1,
    })
    const arg = mocks.getTransactionsByHashMock.mock.calls[0][0] as { msgHash: string }
    const roundTripHex = Buffer.from(arg.msgHash, 'base64').toString('hex')
    expect(roundTripHex).toBe('00' + 'ab'.repeat(31))
  })
})

describe('normalizedExternalInHashHex (TEP-467)', () => {
  function makeExternalInBoc(): string {
    const dest = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000')
    const body = beginCell().storeUint(0xdeadbeef, 32).endCell()
    const ext = external({ to: dest, body })
    return beginCell().store(storeMessage(ext)).endCell().toBoc().toString('base64')
  }

  it('returns null for non-base64 input', () => {
    expect(normalizedExternalInHashHex('not_a_boc')).toBeNull()
  })

  it('returns null for an internal message (not external-in)', () => {
    // Build a body cell directly — loading as Message will fail.
    const body = beginCell().storeUint(0x42, 32).endCell()
    expect(normalizedExternalInHashHex(body.toBoc().toString('base64'))).toBeNull()
  })

  it('returns 64-char hex for a valid external-in message', () => {
    const boc = makeExternalInBoc()
    const h = normalizedExternalInHashHex(boc)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same input → same hash', () => {
    const boc = makeExternalInBoc()
    expect(normalizedExternalInHashHex(boc)).toBe(normalizedExternalInHashHex(boc))
  })
})
