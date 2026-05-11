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

import { resolveTxHashFromMessageHash } from '../src/sdk/resolve-tx'

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
    expect(out).toBeNull()
    expect(mocks.apiClientCtorMock).not.toHaveBeenCalled()
  })

  it('returns null when hex too short', async () => {
    const out = await resolveTxHashFromMessageHash('0xabcd', 'mainnet', { timeout_ms: 100 })
    expect(out).toBeNull()
  })

  it('returns tx hash with 0x prefix when Toncenter has indexed', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: 'deadbeef1234' }],
    })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 10,
    })
    expect(out).toBe('0xdeadbeef1234')
  })

  it('lower-cases and prefixes 0x once, even if input is uppercase or already prefixed', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValueOnce({
      transactions: [{ hash: '0xABCDEF' }],
    })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 10,
    })
    expect(out).toBe('0xabcdef')
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
    expect(out).toBe('0xcafe1234')
    expect(mocks.getTransactionsByHashMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('returns null on timeout', async () => {
    mocks.getTransactionsByHashMock.mockResolvedValue({ transactions: [] })
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 80,
      interval_ms: 10,
    })
    expect(out).toBeNull()
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
    expect(out).toBe('0xok42')
  })

  it('aborts immediately on pre-aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()
    const out = await resolveTxHashFromMessageHash(goodHex, 'mainnet', {
      timeout_ms: 5_000,
      interval_ms: 100,
      signal: controller.signal,
    })
    expect(out).toBeNull()
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
})
