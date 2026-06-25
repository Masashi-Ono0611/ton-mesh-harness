import { Address } from '@ton/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Pure-helper tests for dns-helpers.ts. Network-bound helpers
 * (resolveDomainNftOrThrow, pollDnsConfirmationOrThrow,
 * kickoffTxHashResolve) are mocked at the lower-level boundary
 * (`../src/dns` for the propagation pollers, `../src/sdk/resolve-tx`
 * for the Toncenter lookup).
 */

const dnsMocks = vi.hoisted(() => ({
  getDomainNftAddress: vi.fn(),
  pollDnsRecord: vi.fn(),
  pollDnsSiteRecord: vi.fn(),
  resolveTxHashFromMessageHash: vi.fn(),
}))

vi.mock('../src/dns', () => ({
  getDomainNftAddress: dnsMocks.getDomainNftAddress,
  pollDnsRecord: dnsMocks.pollDnsRecord,
  pollDnsSiteRecord: dnsMocks.pollDnsSiteRecord,
  // Build helpers are pure; let the real impl through.
  buildChangeDnsRecordBody: () => ({ toBoc: () => Buffer.alloc(0) }),
  buildChangeDnsSiteRecordBody: () => ({ toBoc: () => Buffer.alloc(0) }),
}))

vi.mock('../src/sdk/resolve-tx', () => ({
  resolveTxHashFromMessageHash: dnsMocks.resolveTxHashFromMessageHash,
}))

import {
  awaitTxHashWithGrace,
  buildAwaitingSignatureAgentic,
  buildAwaitingSignatureTonConnect,
  buildDnsMessageBatch,
  buildVerifyingEvent,
  DNS_UPDATE_AMOUNT_NANO,
  kickoffTxHashResolve,
  pollDnsConfirmationOrThrow,
  resolveDomainNftOrThrow,
  TX_HASH_GRACE_MS,
} from '../src/sdk/dns-helpers'
import { SdkError } from '../src/sdk/deploy'

const NFT = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000')

describe('DNS_UPDATE_AMOUNT_NANO', () => {
  it('is 0.02 TON in nano (20_000_000n)', () => {
    expect(DNS_UPDATE_AMOUNT_NANO).toBe(20_000_000n)
  })
})

describe('resolveDomainNftOrThrow', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('returns the resolved address on success', async () => {
    dnsMocks.getDomainNftAddress.mockResolvedValueOnce(NFT)
    const result = await resolveDomainNftOrThrow('foo.ton', false, 'hint')
    expect(result).toBe(NFT)
  })

  it('wraps TONAPI failure in SdkError(ERR_NO_DOMAIN, fatal)', async () => {
    dnsMocks.getDomainNftAddress.mockRejectedValueOnce(new Error('TONAPI 404'))
    try {
      await resolveDomainNftOrThrow('foo.ton', false, 'verify ownership')
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(SdkError)
      expect((e as SdkError).code).toBe('ERR_NO_DOMAIN')
      expect((e as SdkError).severity).toBe('fatal')
      expect((e as SdkError).message).toContain('foo.ton')
      expect((e as SdkError).fixHint).toBe('verify ownership')
    }
  })

  it('passes the testnet boolean through', async () => {
    dnsMocks.getDomainNftAddress.mockResolvedValueOnce(NFT)
    await resolveDomainNftOrThrow('foo.ton', true, 'hint')
    expect(dnsMocks.getDomainNftAddress).toHaveBeenCalledWith('foo.ton', true)
  })
})

describe('buildDnsMessageBatch', () => {
  it('builds a single storage message when site_adnl is undefined', () => {
    const messages = buildDnsMessageBatch(NFT, 'bag123', undefined)
    expect(messages).toHaveLength(1)
    expect(messages[0].address).toBe(NFT)
    expect(messages[0].amount).toBe(DNS_UPDATE_AMOUNT_NANO)
  })

  it('builds a single storage message when site_adnl is null', () => {
    expect(buildDnsMessageBatch(NFT, 'bag123', null)).toHaveLength(1)
  })

  it('builds two messages when site_adnl is set', () => {
    const adnl = 'a'.repeat(64)
    const messages = buildDnsMessageBatch(NFT, 'bag123', adnl)
    expect(messages).toHaveLength(2)
    expect(messages[0].amount).toBe(DNS_UPDATE_AMOUNT_NANO)
    expect(messages[1].amount).toBe(DNS_UPDATE_AMOUNT_NANO)
  })

  it('both messages target the same NFT address', () => {
    const messages = buildDnsMessageBatch(NFT, 'bag123', 'a'.repeat(64))
    expect(messages[0].address).toBe(NFT)
    expect(messages[1].address).toBe(NFT)
  })
})

describe('pollDnsConfirmationOrThrow', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('returns successfully when both records propagate', async () => {
    dnsMocks.pollDnsRecord.mockResolvedValueOnce(true)
    dnsMocks.pollDnsSiteRecord.mockResolvedValueOnce(true)
    await expect(
      pollDnsConfirmationOrThrow({
        domain: 'foo.ton',
        bagId: 'bag',
        siteAdnl: 'a'.repeat(64),
        testnet: false,
        timeoutHint: 'hint',
      }),
    ).resolves.toBeUndefined()
  })

  it('skips site poll when siteAdnl absent', async () => {
    dnsMocks.pollDnsRecord.mockResolvedValueOnce(true)
    await pollDnsConfirmationOrThrow({
      domain: 'foo.ton',
      bagId: 'bag',
      siteAdnl: undefined,
      testnet: false,
      timeoutHint: 'hint',
    })
    expect(dnsMocks.pollDnsSiteRecord).not.toHaveBeenCalled()
  })

  it('throws ERR_DNS_TX_TIMEOUT when storage poll returns false', async () => {
    dnsMocks.pollDnsRecord.mockResolvedValueOnce(false)
    try {
      await pollDnsConfirmationOrThrow({
        domain: 'foo.ton',
        bagId: 'bag',
        siteAdnl: undefined,
        testnet: false,
        timeoutHint: 'specific tail',
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(SdkError)
      expect((e as SdkError).code).toBe('ERR_DNS_TX_TIMEOUT')
      expect((e as SdkError).severity).toBe('recoverable')
      expect((e as SdkError).message).toContain('specific tail')
    }
  })

  it('throws ERR_DNS_TX_TIMEOUT when site poll returns false', async () => {
    dnsMocks.pollDnsRecord.mockResolvedValueOnce(true)
    dnsMocks.pollDnsSiteRecord.mockResolvedValueOnce(false)
    await expect(
      pollDnsConfirmationOrThrow({
        domain: 'foo.ton',
        bagId: 'bag',
        siteAdnl: 'a'.repeat(64),
        testnet: false,
        timeoutHint: 'h',
      }),
    ).rejects.toThrowError(SdkError)
  })

  it('checkAborted runs between polls', async () => {
    dnsMocks.pollDnsRecord.mockResolvedValueOnce(true)
    dnsMocks.pollDnsSiteRecord.mockResolvedValueOnce(true)
    const checkAborted = vi.fn()
    await pollDnsConfirmationOrThrow({
      domain: 'foo.ton',
      bagId: 'bag',
      siteAdnl: 'a'.repeat(64),
      testnet: false,
      checkAborted,
      timeoutHint: 'h',
    })
    expect(checkAborted).toHaveBeenCalledTimes(2)
  })
})

describe('kickoffTxHashResolve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delegates to resolveTxHashFromMessageHash with combined signal', async () => {
    dnsMocks.resolveTxHashFromMessageHash.mockResolvedValueOnce({ txHash: '0xabc', throttled: false })
    const internal = new AbortController()
    const out = await kickoffTxHashResolve({
      messageHashHex: '0xff',
      network: 'mainnet',
      internalAbortSignal: internal.signal,
    })
    expect(out).toEqual({ txHash: '0xabc', throttled: false })
    expect(dnsMocks.resolveTxHashFromMessageHash).toHaveBeenCalledTimes(1)
    const args = dnsMocks.resolveTxHashFromMessageHash.mock.calls[0]
    expect(args[0]).toBe('0xff')
    expect(args[1]).toBe('mainnet')
    expect(args[2].timeout_ms).toBe(90_000)
  })

  it('aborts the combined signal when caller signal aborts', async () => {
    dnsMocks.resolveTxHashFromMessageHash.mockImplementation(
      async (_h: string, _n: string, opts: { signal?: AbortSignal }) => {
        await new Promise<void>((resolve) => {
          opts.signal?.addEventListener('abort', () => resolve(), { once: true })
        })
        return { txHash: null, throttled: false }
      },
    )
    const internal = new AbortController()
    const caller = new AbortController()
    const promise = kickoffTxHashResolve({
      messageHashHex: '0xff',
      network: 'mainnet',
      internalAbortSignal: internal.signal,
      callerSignal: caller.signal,
    })
    caller.abort()
    await expect(promise).resolves.toEqual({ txHash: null, throttled: false })
  })

  it('aborts when internal signal aborts', async () => {
    dnsMocks.resolveTxHashFromMessageHash.mockImplementation(
      async (_h: string, _n: string, opts: { signal?: AbortSignal }) => {
        await new Promise<void>((resolve) => {
          opts.signal?.addEventListener('abort', () => resolve(), { once: true })
        })
        return { txHash: null, throttled: false }
      },
    )
    const internal = new AbortController()
    const promise = kickoffTxHashResolve({
      messageHashHex: '0xff',
      network: 'mainnet',
      internalAbortSignal: internal.signal,
    })
    internal.abort()
    await expect(promise).resolves.toEqual({ txHash: null, throttled: false })
  })

  it('returns {null,false} when resolveTxHashFromMessageHash throws (best-effort)', async () => {
    dnsMocks.resolveTxHashFromMessageHash.mockRejectedValueOnce(new Error('boom'))
    const internal = new AbortController()
    const out = await kickoffTxHashResolve({
      messageHashHex: '0xff',
      network: 'mainnet',
      internalAbortSignal: internal.signal,
    })
    expect(out).toEqual({ txHash: null, throttled: false })
  })
})

describe('awaitTxHashWithGrace', () => {
  it('returns the resolution when promise resolves before grace', async () => {
    const promise = Promise.resolve({ txHash: '0xabc', throttled: false })
    const out = await awaitTxHashWithGrace(promise, 5_000)
    expect(out).toEqual({ txHash: '0xabc', throttled: false })
  })

  it('preserves throttled=true from a settled resolution', async () => {
    const out = await awaitTxHashWithGrace(Promise.resolve({ txHash: null, throttled: true }), 5_000)
    expect(out).toEqual({ txHash: null, throttled: true })
  })

  it('returns {null,false} when promise still pending after grace cutoff', async () => {
    const promise = new Promise<{ txHash: string | null; throttled: boolean }>(() => {
      /* never resolves */
    })
    const out = await awaitTxHashWithGrace(promise, 50)
    expect(out).toEqual({ txHash: null, throttled: false })
  })

  it('defaults to TX_HASH_GRACE_MS (15s) when grace not specified (#117)', async () => {
    // The default was raised 3s → 15s so dns_tx_hash populates more often
    // when Toncenter lags TONAPI. Assert the constant + that an
    // already-settled promise returns immediately (no real 15s wait here).
    expect(TX_HASH_GRACE_MS).toBe(15_000)
    const out = await awaitTxHashWithGrace(Promise.resolve({ txHash: '0xabc', throttled: false }))
    expect(out).toEqual({ txHash: '0xabc', throttled: false })
  })
})

describe('buildVerifyingEvent', () => {
  it('returns the F3 verifying phase shape', () => {
    const ev = buildVerifyingEvent('done')
    expect(ev.phase).toBe('verifying')
    expect(ev.message).toBe('done')
    expect(ev.data).toEqual({
      verifier: 'tonapi',
      gateway_propagation_lag_minutes: 'usually 0-5',
    })
  })
})

describe('buildAwaitingSignatureTonConnect', () => {
  it('returns tonconnect-variant shape with future ISO expires_at', () => {
    const before = Date.now()
    const ev = buildAwaitingSignatureTonConnect('msg', 'tonconnect://url')
    expect(ev.phase).toBe('awaiting_signature')
    expect(ev.message).toBe('msg')
    const data = ev.data as {
      signing_mode: string
      signing_url: string
      expires_at_iso: string
    }
    expect(data.signing_mode).toBe('tonconnect')
    expect(data.signing_url).toBe('tonconnect://url')
    const expires = new Date(data.expires_at_iso).getTime()
    expect(expires).toBeGreaterThanOrEqual(before + 5 * 60 * 1000 - 1_000)
    expect(expires).toBeLessThanOrEqual(before + 5 * 60 * 1000 + 1_000)
  })
})

describe('buildAwaitingSignatureAgentic', () => {
  it('returns agentic-variant shape with signing_url null + wallet_label', () => {
    const ev = buildAwaitingSignatureAgentic('msg', 'main-mainnet')
    const data = ev.data as {
      signing_mode: string
      signing_url: null
      wallet_label: string
    }
    expect(ev.phase).toBe('awaiting_signature')
    expect(data.signing_mode).toBe('agentic')
    expect(data.signing_url).toBeNull()
    expect(data.wallet_label).toBe('main-mainnet')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cross-validation: helper outputs MUST satisfy DeployEventSchema strict
// parse. Catches drift between helper builders and the F2 schema.
// ─────────────────────────────────────────────────────────────────────────────

import { DeployEventSchema } from '../src/sdk/schemas'

describe('event-builder × DeployEventSchema strict round-trip', () => {
  it('buildVerifyingEvent output passes schema', () => {
    const ev = buildVerifyingEvent('done verifying')
    expect(() => DeployEventSchema.parse(ev)).not.toThrow()
  })

  it('buildAwaitingSignatureTonConnect output passes schema', () => {
    const ev = buildAwaitingSignatureTonConnect('open wallet', 'tonconnect://x')
    expect(() => DeployEventSchema.parse(ev)).not.toThrow()
  })

  it('buildAwaitingSignatureAgentic output passes schema', () => {
    const ev = buildAwaitingSignatureAgentic('signing locally', 'wallet-label')
    expect(() => DeployEventSchema.parse(ev)).not.toThrow()
  })

  it('buildAwaitingSignatureTonConnect rejected by agentic-data shape', () => {
    // Sanity: if we accidentally fed agentic data through the tonconnect
    // builder (or vice versa), the schema discriminator catches it.
    // We can't easily build a malformed event via the typed helper, but
    // can verify the discriminated union doesn't accept the wrong mode
    // in the same data slot.
    const tonconnectShape = {
      phase: 'awaiting_signature' as const,
      message: 'x',
      data: {
        signing_mode: 'agentic' as const,
        signing_url: 'should-be-null',
        wallet_label: 'x',
      },
    }
    expect(() => DeployEventSchema.parse(tonconnectShape)).toThrow()
  })
})
