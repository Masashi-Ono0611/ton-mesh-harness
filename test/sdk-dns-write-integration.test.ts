/**
 * Integration harness for the `writeDnsRecordAgentic` generator.
 *
 * Unlike sdk-dns-helpers.test.ts (which tests each helper in isolation) and
 * sdk-deploy-inner-cleanup.test.ts (which STUBS the generator to test deploy()'s
 * cleanup cascade), this drives the REAL generator end-to-end — only the I/O
 * leaves are mocked (TONAPI propagation poll, agentic broadcast, Toncenter
 * tx-hash resolve, on-chain `dnsresolve`). That exercises the actual
 * orchestration wiring the deep-check shipped:
 *   - #117  the TONAPI-confirmed happy path emits dns_confirmed with the
 *           resolved tx hash (NOT a false null from a too-short grace).
 *   - #119  when TONAPI's cache lags, an on-chain storage-record match
 *           confirms via fallback; a non-match rethrows (the Codex-P1 the
 *           reverted naive fix violated); a `site_adnl` deploy rethrows
 *           WITHOUT consulting the storage-only verifier (Codex-P2 gate).
 *   - #120  a throttled tx-hash resolve threads `tx_resolve_throttled: true`
 *           through to the return value (so the caller can hint an API key).
 *
 * Mock boundary = the leaf modules the generator + its shared helpers import.
 * The generator (src/sdk/dns.ts) and the confirmation pipeline
 * (src/sdk/dns-helpers.ts) run for real.
 */
import { Address } from '@ton/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DeployEvent } from '../src/sdk/schemas'

const mocks = vi.hoisted(() => ({
  loadAgenticConfig: vi.fn(),
  agenticSignAndSend: vi.fn(),
  getDomainNftAddress: vi.fn(),
  pollDnsRecord: vi.fn(),
  pollDnsSiteRecord: vi.fn(),
  resolveTxHashFromMessageHash: vi.fn(),
  storageRecordMatchesOnChain: vi.fn(),
  // TonConnect path (writeDnsRecord)
  tcConnect: vi.fn(),
  tcSend: vi.fn(),
  tcDispose: vi.fn(),
}))

// Keep the rest of agentic-config real (types / getAgenticConfigPath are
// imported elsewhere in the graph); only stub the filesystem loader.
vi.mock('../src/sdk/agentic-config', async (orig) => ({
  ...(await orig<typeof import('../src/sdk/agentic-config')>()),
  loadAgenticConfig: mocks.loadAgenticConfig,
}))

vi.mock('../src/sdk/agentic-sign', () => ({
  agenticSignAndSend: mocks.agenticSignAndSend,
}))

// TONAPI propagation boundary. Build helpers are pure → return a minimal
// Cell-like stub (the agentic path never inspects the payload).
vi.mock('../src/dns', () => ({
  getDomainNftAddress: mocks.getDomainNftAddress,
  pollDnsRecord: mocks.pollDnsRecord,
  pollDnsSiteRecord: mocks.pollDnsSiteRecord,
  buildChangeDnsRecordBody: () => ({ toBoc: () => Buffer.alloc(0) }),
  buildChangeDnsSiteRecordBody: () => ({ toBoc: () => Buffer.alloc(0) }),
}))

// Toncenter tx-hash resolve. Wholesale-mocked (not spread): the real
// resolve-tx pulls @ton/walletkit, whose ESM dir-import breaks under the test
// resolver. `normalizedExternalInHashHex` returns a fixed hex so the TonConnect
// path's tx-hash resolve kicks off (the agentic path never calls it).
vi.mock('../src/sdk/resolve-tx', () => ({
  resolveTxHashFromMessageHash: mocks.resolveTxHashFromMessageHash,
  normalizedExternalInHashHex: () => 'deadbeef',
}))

// On-chain dnsresolve get-method (#119 authoritative confirm).
vi.mock('../src/sdk/dns-onchain', () => ({
  storageRecordMatchesOnChain: mocks.storageRecordMatchesOnChain,
}))

// TonConnect provider + its filesystem storage/manifest deps — so the
// TonConnect path runs without a real wallet bridge. connect() resolves
// without invoking the URL callback → the generator takes the
// restored-session branch (no QR race timing in the test).
vi.mock('../src/wallet/TonConnectProvider', () => ({
  TonConnectProvider: class {
    connect = mocks.tcConnect
    sendTransactionMulti = mocks.tcSend
    dispose = mocks.tcDispose
  },
}))
vi.mock('../src/wallet/FSStorage', () => ({ FSStorage: class {} }))
vi.mock('../src/wallet/constants', () => ({
  TONCONNECT_MANIFEST_URL: 'https://example.test/manifest.json',
  getTonConnectStoragePath: () => '/tmp/tc-storage',
}))

import {
  writeDnsRecord,
  writeDnsRecordAgentic,
  type DnsWriteAgenticOptions,
  type DnsWriteOptions,
} from '../src/sdk/dns'
import { SdkError } from '../src/sdk/deploy'

const NFT = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000')
const BAG = '4a0130acfe6c658eac2d8cf3451251c2a037c05d528ae96d62b81347a73dd258'
const ADNL = 'a'.repeat(64)
const MSG_HASH = '0xfeed0000000000000000000000000000000000000000000000000000000000ff'

const SELECTION = {
  wallet: {
    id: 'w1',
    name: 'main',
    type: 'standard',
    wallet_version: 'v5r1',
    network: 'mainnet',
    address: 'EQowner0000000000000000000000000000000000000000000000000000',
    private_key: 'deadbeef',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  toncenter_api_key: 'TEST_KEY',
  config_path: '/tmp/config.json',
}

/** Drive the generator to completion, collecting events + the return value. */
async function runGen(
  gen: AsyncGenerator<DeployEvent, unknown, void>,
): Promise<{ events: DeployEvent[]; result: unknown }> {
  const events: DeployEvent[] = []
  for (;;) {
    const { value, done } = await gen.next()
    if (done) return { events, result: value }
    events.push(value as DeployEvent)
  }
}

function phases(events: DeployEvent[]): string[] {
  return events.map((e) => e.phase)
}

function eventOf(events: DeployEvent[], phase: string): DeployEvent | undefined {
  return events.find((e) => e.phase === phase)
}

const OPTS = (over: Partial<DnsWriteAgenticOptions> = {}): DnsWriteAgenticOptions => ({
  domain: 'masashi-ono0611.ton',
  bag_id: BAG,
  testnet: false,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.loadAgenticConfig.mockReturnValue(SELECTION)
  mocks.getDomainNftAddress.mockResolvedValue(NFT)
  mocks.agenticSignAndSend.mockResolvedValue({
    message_hash: MSG_HASH,
    from_address: SELECTION.wallet.address,
  })
  // Default: tx hash resolves cleanly. Overridden per scenario.
  mocks.resolveTxHashFromMessageHash.mockResolvedValue({ txHash: '0xtxhash', throttled: false })
  // TonConnect path defaults: connect() resolves WITHOUT calling the URL
  // callback → restored-session branch; the wallet returns a BOC.
  mocks.tcConnect.mockResolvedValue(undefined)
  mocks.tcSend.mockResolvedValue({ boc: 'fakeboc' })
  mocks.tcDispose.mockReturnValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

describe('writeDnsRecordAgentic — integration (#117/#119/#120)', () => {
  it('scenario 1 — TONAPI confirms: emits the F3 phases in order with the resolved tx hash, no on-chain fallback', async () => {
    mocks.pollDnsRecord.mockResolvedValue(true)

    const { events, result } = await runGen(writeDnsRecordAgentic(OPTS()))

    // F3 ordering: awaiting_signature → dns_signing → dns_confirmed → verifying.
    expect(phases(events)).toEqual([
      'awaiting_signature',
      'dns_signing',
      'dns_confirmed',
      'verifying',
    ])

    const signing = eventOf(events, 'dns_signing')!
    expect((signing.data as { message_hash: string }).message_hash).toBe(MSG_HASH)

    const confirmed = eventOf(events, 'dns_confirmed')!
    // Happy path message names the bag, NOT the on-chain fallback wording.
    expect(confirmed.message).toContain('resolves to bag')
    expect(confirmed.message).not.toContain('on-chain')
    expect((confirmed.data as { tx_hash: string | null }).tx_hash).toBe('0xtxhash')

    const verifying = eventOf(events, 'verifying')!
    expect(verifying.message).toContain('TONAPI')
    expect(verifying.message).not.toContain('dnsresolve')

    expect(result).toEqual({
      message_hash: MSG_HASH,
      from_address: SELECTION.wallet.address,
      tx_hash: '0xtxhash',
      tx_resolve_throttled: false,
    })

    // On the happy path the on-chain verifier is NEVER consulted.
    expect(mocks.storageRecordMatchesOnChain).not.toHaveBeenCalled()

    // The broadcast got the storage-only batch (1 message).
    expect(mocks.agenticSignAndSend).toHaveBeenCalledTimes(1)
    const sendArg = mocks.agenticSignAndSend.mock.calls[0][0] as { messages: unknown[] }
    expect(sendArg.messages).toHaveLength(1)
  })

  it('scenario 2 — TONAPI lags but storage record is on-chain: confirms via fallback (#119)', async () => {
    mocks.pollDnsRecord.mockResolvedValue(false) // TONAPI never propagates
    mocks.storageRecordMatchesOnChain.mockResolvedValue(true) // but it IS on-chain

    const { events, result } = await runGen(writeDnsRecordAgentic(OPTS()))

    expect(phases(events)).toEqual([
      'awaiting_signature',
      'dns_signing',
      'dns_confirmed',
      'verifying',
    ])

    const confirmed = eventOf(events, 'dns_confirmed')!
    expect(confirmed.message).toContain('confirmed on-chain')
    expect(confirmed.message).toContain('TONAPI propagation still lagging')
    // Even on the fallback the resolved tx hash still surfaces.
    expect((confirmed.data as { tx_hash: string | null }).tx_hash).toBe('0xtxhash')

    const verifying = eventOf(events, 'verifying')!
    expect(verifying.message).toContain('dnsresolve')

    expect((result as { tx_resolve_throttled: boolean }).tx_resolve_throttled).toBe(false)

    // The verifier was consulted with the deployed bag.
    expect(mocks.storageRecordMatchesOnChain).toHaveBeenCalledTimes(1)
    const verifyArg = mocks.storageRecordMatchesOnChain.mock.calls[0][0] as { expectedBag: string }
    expect(verifyArg.expectedBag).toBe(BAG)
  })

  it('scenario 2b — fallback AND a throttled resolver: viaChainFallback wording with tx_resolve_throttled:true', async () => {
    // Exercises the catch-branch of confirmDnsWriteOrThrow, which re-awaits the
    // resolve promise — a distinct path from the happy branch. The throttle flag
    // must survive the on-chain fallback (so the caller still hints an API key).
    mocks.pollDnsRecord.mockResolvedValue(false)
    mocks.storageRecordMatchesOnChain.mockResolvedValue(true)
    mocks.resolveTxHashFromMessageHash.mockResolvedValue({ txHash: null, throttled: true })

    const { events, result } = await runGen(writeDnsRecordAgentic(OPTS()))

    expect(eventOf(events, 'dns_confirmed')!.message).toContain('confirmed on-chain')
    expect(result).toMatchObject({ tx_hash: null, tx_resolve_throttled: true })
  })

  it('scenario 3 — TONAPI lags AND the record is not on-chain: rethrows ERR_DNS_TX_TIMEOUT, no dns_confirmed (#119 Codex-P1)', async () => {
    mocks.pollDnsRecord.mockResolvedValue(false)
    mocks.storageRecordMatchesOnChain.mockResolvedValue(false) // genuinely not landed

    const gen = writeDnsRecordAgentic(OPTS())
    const seen: string[] = []
    let caught: unknown
    try {
      for (;;) {
        const { value, done } = await gen.next()
        if (done) break
        seen.push((value as DeployEvent).phase)
      }
    } catch (err) {
      caught = err
    }
    // Assert OUTSIDE the try so an unexpected success fails with this exact
    // message, not a caught-then-re-asserted AssertionError (agy round-2).
    if (!caught) expect.fail('expected ERR_DNS_TX_TIMEOUT')

    expect(caught).toBeInstanceOf(SdkError)
    expect((caught as SdkError).code).toBe('ERR_DNS_TX_TIMEOUT')
    expect((caught as SdkError).severity).toBe('recoverable')
    // It must NOT have emitted dns_confirmed — a resolved tx hash alone never confirms.
    expect(seen).toEqual(['awaiting_signature', 'dns_signing'])
    expect(seen).not.toContain('dns_confirmed')
    expect(mocks.storageRecordMatchesOnChain).toHaveBeenCalledTimes(1)
  })

  it('scenario 4 — throttled tx-hash resolve threads tx_resolve_throttled:true (#120)', async () => {
    mocks.pollDnsRecord.mockResolvedValue(true)
    mocks.resolveTxHashFromMessageHash.mockResolvedValue({ txHash: null, throttled: true })

    const { events, result } = await runGen(writeDnsRecordAgentic(OPTS()))

    const confirmed = eventOf(events, 'dns_confirmed')!
    // tx_hash is null (resolver was rate-limited, not that the tx is missing)…
    expect((confirmed.data as { tx_hash: string | null }).tx_hash).toBeNull()
    // …and the throttle flag is surfaced so the caller can hint an API key.
    expect((result as { tx_resolve_throttled: boolean }).tx_resolve_throttled).toBe(true)
    expect((result as { tx_hash: string | null }).tx_hash).toBeNull()
  })

  it('scenario 5 — a site_adnl deploy that lags rethrows WITHOUT a storage-only on-chain confirm (#119 Codex-P2 gate)', async () => {
    // Storage propagates, but the site (ADNL) record times out.
    mocks.pollDnsRecord.mockResolvedValue(true)
    mocks.pollDnsSiteRecord.mockResolvedValue(false)
    // Even if storage IS on-chain, the verifier must be short-circuited for a
    // site deploy (no de-risked site-record parser) → the timeout rethrows.
    mocks.storageRecordMatchesOnChain.mockResolvedValue(true)

    await expect(runGen(writeDnsRecordAgentic(OPTS({ site_adnl: ADNL })))).rejects.toMatchObject({
      code: 'ERR_DNS_TX_TIMEOUT',
    })

    // The storage-only verifier must NOT have been consulted for a site deploy.
    expect(mocks.storageRecordMatchesOnChain).not.toHaveBeenCalled()
    // And the broadcast carried the 2-message (storage + site) batch.
    const sendArg = mocks.agenticSignAndSend.mock.calls[0][0] as { messages: unknown[] }
    expect(sendArg.messages).toHaveLength(2)
  })

  it('scenario 6 — a fatal config error (no wallet) propagates before any broadcast', async () => {
    mocks.loadAgenticConfig.mockImplementation(() => {
      throw new SdkError('ERR_NO_WALLET', 'no wallet', { severity: 'fatal' })
    })

    await expect(runGen(writeDnsRecordAgentic(OPTS()))).rejects.toMatchObject({
      code: 'ERR_NO_WALLET',
    })
    // Nothing was signed/sent — the failure is pre-broadcast.
    expect(mocks.agenticSignAndSend).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TonConnect path (writeDnsRecord). The confirmation pipeline
// (confirmDnsWriteOrThrow / verifyDnsWriteOnChain) is hand-duplicated across
// both call sites in dns.ts, so these lock the second site against drift from
// the agentic one — same #119/#120 behaviour, plus the path-specific
// bridge-dispose-in-finally (the SSE-leak fix).
// ─────────────────────────────────────────────────────────────────────────────

const TC_OPTS = (over: Partial<DnsWriteOptions> = {}): DnsWriteOptions => ({
  domain: 'masashi-ono0611.ton',
  bag_id: BAG,
  testnet: false,
  ...over,
})

describe('writeDnsRecord (TonConnect) — integration (#117/#119/#120)', () => {
  it('TC-1 — TONAPI confirms: F3 phases in order, resolved tx hash, BOC surfaced, bridge disposed', async () => {
    mocks.pollDnsRecord.mockResolvedValue(true)

    const { events, result } = await runGen(writeDnsRecord(TC_OPTS()))

    expect(phases(events)).toEqual([
      'awaiting_signature',
      'dns_signing',
      'dns_confirmed',
      'verifying',
    ])

    // dns_signing carries the signed message BOC (NOT the on-chain tx hash).
    const signing = eventOf(events, 'dns_signing')!
    expect((signing.data as { message_boc: string | null }).message_boc).toBe('fakeboc')

    const confirmed = eventOf(events, 'dns_confirmed')!
    expect(confirmed.message).toContain('resolves to bag')
    expect(confirmed.message).not.toContain('on-chain')
    expect((confirmed.data as { tx_hash: string | null }).tx_hash).toBe('0xtxhash')

    expect(result).toEqual({
      message_boc: 'fakeboc',
      tx_hash: '0xtxhash',
      tx_resolve_throttled: false,
    })

    expect(mocks.storageRecordMatchesOnChain).not.toHaveBeenCalled()
    // finally{} must dispose the TonConnect bridge so the SSE socket can't
    // keep the event loop alive (the v0.6.3 leak fix replicated in the SDK).
    expect(mocks.tcDispose).toHaveBeenCalledTimes(1)
  })

  it('TC-2 — TONAPI lags but storage record is on-chain: confirms via fallback, still disposes (#119)', async () => {
    mocks.pollDnsRecord.mockResolvedValue(false)
    mocks.storageRecordMatchesOnChain.mockResolvedValue(true)

    const { events } = await runGen(writeDnsRecord(TC_OPTS()))

    const confirmed = eventOf(events, 'dns_confirmed')!
    expect(confirmed.message).toContain('confirmed on-chain')
    const verifying = eventOf(events, 'verifying')!
    expect(verifying.message).toContain('dnsresolve')

    expect(mocks.storageRecordMatchesOnChain).toHaveBeenCalledTimes(1)
    const verifyArg = mocks.storageRecordMatchesOnChain.mock.calls[0][0] as { expectedBag: string }
    expect(verifyArg.expectedBag).toBe(BAG)
    expect(mocks.tcDispose).toHaveBeenCalledTimes(1)
  })

  it('TC-3 — throttled tx-hash resolve threads tx_resolve_throttled:true (#120)', async () => {
    mocks.pollDnsRecord.mockResolvedValue(true)
    mocks.resolveTxHashFromMessageHash.mockResolvedValue({ txHash: null, throttled: true })

    const { result } = await runGen(writeDnsRecord(TC_OPTS()))

    expect(result).toMatchObject({ tx_hash: null, tx_resolve_throttled: true })
    // Bridge dispose must run on the throttled success path too (agy review).
    expect(mocks.tcDispose).toHaveBeenCalledTimes(1)
  })

  it('TC-4 — TONAPI lags AND not on-chain: rethrows ERR_DNS_TX_TIMEOUT, still disposes the bridge', async () => {
    mocks.pollDnsRecord.mockResolvedValue(false)
    mocks.storageRecordMatchesOnChain.mockResolvedValue(false)

    await expect(runGen(writeDnsRecord(TC_OPTS()))).rejects.toMatchObject({
      code: 'ERR_DNS_TX_TIMEOUT',
    })
    // The finally{} cleanup must run even on the error path.
    expect(mocks.tcDispose).toHaveBeenCalledTimes(1)
  })
})
