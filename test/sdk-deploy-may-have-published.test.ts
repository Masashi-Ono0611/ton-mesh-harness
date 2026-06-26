/**
 * deploy()'s F4 `may_have_published` honesty field (#146).
 *
 * On a DNS-phase cancellation deploy() reports whether the BOC may already have
 * left this process, via a PATH-AWARE split:
 *   may_have_published = wallet.kind === 'tonconnect'
 *     ? dnsAwaitingSignatureSeen   // QR shown → user may have approved on phone
 *     : dnsBroadcastEnqueued       // agentic: only true once dns_signing fired
 * No existing test asserts this ternary's non-trivial output — the only abort
 * tests fire at env_check (trivially false) or never read the field — so
 * inverting the ternary or breaking either flag would leave the suite green
 * while a consumer mis-reports whether an on-chain spend may have occurred.
 *
 * We drive the REAL deploy() with controllable inner DNS-write generators that
 * yield the chosen phases and then throw ERR_CANCELLED (what the real
 * generator's pre/post-broadcast guard does), and assert error.data.may_have_published.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ensureTonutilsBinaryMock = vi.fn()
const startTonutilsDaemonMock = vi.fn()
const tonutilsCreateMock = vi.fn()
const tonutilsDetailsMock = vi.fn()
// Per-test toggle: should the inner generator reach dns_signing before cancelling?
const inner = vi.hoisted(() => ({ emitDnsSigning: false }))

vi.mock('../src/daemon/tonutils-installer', () => ({
  ensureTonutilsBinary: ensureTonutilsBinaryMock,
  getTonutilsPaths: () => ({ binDir: '/tmp', daemon: '/tmp/tonutils', versionFile: '/tmp/.v' }),
}))

vi.mock('../src/daemon/tonutils-process', () => ({
  startTonutilsDaemon: startTonutilsDaemonMock,
  tonutilsCreate: tonutilsCreateMock,
  tonutilsDetails: tonutilsDetailsMock,
  ensureTonutilsNetworkConfig: vi.fn().mockResolvedValue(undefined),
}))

// Controllable inner generators. Both yield awaiting_signature, optionally
// dns_signing, then throw a REAL SdkError ERR_CANCELLED (so deploy()'s
// `err instanceof SdkError` cancellation branch computes may_have_published).
vi.mock('../src/sdk/dns', async () => {
  const { SdkError } = await import('../src/sdk/deploy')
  const cancel = (): never => {
    throw new SdkError('ERR_CANCELLED', 'cancelled mid-DNS', { severity: 'fatal' })
  }
  return {
    writeDnsRecord: async function* writeDnsRecord() {
      yield { phase: 'awaiting_signature', message: 'show qr', data: { signing_mode: 'tonconnect', signing_url: 'tonconnect://test' } }
      if (inner.emitDnsSigning) yield { phase: 'dns_signing', message: 'submitted', data: { message_boc: 'boc' } }
      cancel()
    },
    writeDnsRecordAgentic: async function* writeDnsRecordAgentic() {
      yield { phase: 'awaiting_signature', message: 'sign', data: { signing_mode: 'agentic', signing_url: null } }
      if (inner.emitDnsSigning) yield { phase: 'dns_signing', message: 'submitted', data: { message_boc: null, message_hash: '0xabc', from_address: 'EQfrom' } }
      cancel()
    },
  }
})

beforeEach(() => {
  inner.emitDnsSigning = false
  ensureTonutilsBinaryMock.mockReset().mockImplementation(() => {})
  startTonutilsDaemonMock.mockReset().mockResolvedValue({
    apiUrl: 'http://127.0.0.1:7777',
    dbDir: '/tmp/fake-db',
    process: { kill: vi.fn(), exitCode: null, once: vi.fn(), pid: 99999 } as unknown,
    kill: vi.fn(),
  })
  tonutilsCreateMock.mockReset().mockResolvedValue({ bag_id: 'abc123', merkle_hash: 'def' })
  tonutilsDetailsMock.mockReset().mockResolvedValue({ size: 1024, file_count: 1 })
})

afterEach(() => vi.restoreAllMocks())

async function deployUntilCancel(wallet?: { kind: 'agentic' | 'tonconnect'; connector?: string }) {
  const { deploy } = await import('../src/sdk/deploy')
  let caught: unknown
  try {
    for await (const _ev of deploy({
      source_dir: '/tmp/site',
      domain: 'test.ton',
      ...(wallet ? { wallet } : {}),
    })) {
      /* drain */
    }
  } catch (err) {
    caught = err
  }
  return caught as { code?: string; data?: { may_have_published?: boolean } }
}

describe("deploy() may_have_published path-aware split (#146)", () => {
  it('tonconnect: cancel after awaiting_signature (QR shown) → may_have_published true', async () => {
    inner.emitDnsSigning = false
    const err = await deployUntilCancel() // default wallet = tonconnect
    expect(err.code).toBe('ERR_CANCELLED')
    expect(err.data?.may_have_published).toBe(true)
  })

  it('agentic: cancel BEFORE dns_signing → may_have_published false (no BOC left the process)', async () => {
    inner.emitDnsSigning = false
    const err = await deployUntilCancel({ kind: 'agentic' })
    expect(err.code).toBe('ERR_CANCELLED')
    expect(err.data?.may_have_published).toBe(false)
  })

  it('agentic: cancel AFTER dns_signing → may_have_published true (BOC reached Toncenter)', async () => {
    inner.emitDnsSigning = true
    const err = await deployUntilCancel({ kind: 'agentic' })
    expect(err.code).toBe('ERR_CANCELLED')
    expect(err.data?.may_have_published).toBe(true)
  })
})
