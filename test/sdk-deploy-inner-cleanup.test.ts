/**
 * Codex r3 BLOCKER regression gate: src/sdk/deploy.ts manually drives
 * an inner DNS-write generator and MUST call inner.return() in a
 * finally block when the outer consumer breaks the for-await or an
 * error throws mid-iteration. Without it, the inner's own finally
 * (TonConnect bridge dispose, AbortController unsubscribe, in-flight
 * Toncenter polls) never runs.
 *
 * This test mocks the deploy() dependencies deep enough to reach the
 * inner-iteration block + verifies the inner generator's finally
 * actually fires when the consumer aborts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ────────────────────────────────────────────────────────────────────
// Mocks for everything deploy() touches before the DNS phase.
// ────────────────────────────────────────────────────────────────────

const ensureTonutilsBinaryMock = vi.fn()
const startTonutilsDaemonMock = vi.fn()
const tonutilsCreateMock = vi.fn()
const tonutilsDetailsMock = vi.fn()
const innerFinallyFired = { value: false }
const innerReturnCalled = { value: false }

vi.mock('../src/daemon/tonutils-installer', () => ({
  ensureTonutilsBinary: ensureTonutilsBinaryMock,
  getTonutilsPaths: () => ({ binDir: '/tmp', daemon: '/tmp/tonutils', versionFile: '/tmp/.v' }),
}))

vi.mock('../src/daemon/tonutils-process', () => ({
  startTonutilsDaemon: startTonutilsDaemonMock,
  tonutilsCreate: tonutilsCreateMock,
  tonutilsDetails: tonutilsDetailsMock,
}))

// Mock the dynamically-imported ./dns module — return a controllable
// async generator that mirrors real writeDnsRecord's abort handling
// (observes control.signal, throws on abort) so the regression test
// exercises both abort and consumer-break paths.
vi.mock('../src/sdk/dns', () => ({
  writeDnsRecord: async function* writeDnsRecord(
    _input: unknown,
    control: { signal?: AbortSignal },
  ) {
    try {
      yield { phase: 'awaiting_signature', message: 'show qr', data: { signing_mode: 'tonconnect', signing_url: 'tonconnect://test' } }
      // Wait until the signal aborts OR a long timeout. Real
      // writeDnsRecord observes the signal at every event boundary;
      // this mock does the same so the abort-path test can reach
      // the inner finally.
      await new Promise<void>((_resolve, reject) => {
        const checkOrWait = (): void => {
          if (control.signal?.aborted) reject(new Error('aborted'))
          else setTimeout(checkOrWait, 25)
        }
        if (control.signal) control.signal.addEventListener('abort', () => reject(new Error('aborted')))
        checkOrWait()
      })
    } finally {
      innerFinallyFired.value = true
    }
    return { message_boc: null, message_hash: 'fake', tx_hash: 'fake' }
  },
  writeDnsRecordAgentic: async function* writeDnsRecordAgentic() { /* unused */ },
}))

// ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  innerFinallyFired.value = false
  innerReturnCalled.value = false
  ensureTonutilsBinaryMock.mockReset()
  startTonutilsDaemonMock.mockReset()
  tonutilsCreateMock.mockReset()
  tonutilsDetailsMock.mockReset()

  ensureTonutilsBinaryMock.mockImplementation(() => {})
  startTonutilsDaemonMock.mockResolvedValue({
    apiUrl: 'http://127.0.0.1:7777',
    dbDir: '/tmp/fake-db',
    process: { kill: vi.fn(), exitCode: null, once: vi.fn(), pid: 99999 } as unknown,
    kill: vi.fn(),
  })
  tonutilsCreateMock.mockResolvedValue({ bag_id: 'abc123', merkle_hash: 'def' })
  tonutilsDetailsMock.mockResolvedValue({ size: 1024, file_count: 1 })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('deploy() inner-generator cleanup (Codex r3 regression gate)', () => {
  it('inner DNS generator finally runs when consumer aborts mid-stream', async () => {
    const { deploy } = await import('../src/sdk/deploy')
    const controller = new AbortController()

    const gen = deploy(
      { source_dir: '/tmp/site', domain: 'test.ton' },
      { signal: controller.signal },
    )

    // Drain phases until we see awaiting_signature (proves we reached
    // the inner-iteration block).
    let sawAwaitingSignature = false
    let abortError: unknown
    try {
      for await (const ev of gen) {
        if (ev.phase === 'awaiting_signature') {
          sawAwaitingSignature = true
          controller.abort()
        }
      }
    } catch (err) {
      abortError = err
    }

    expect(sawAwaitingSignature).toBe(true)
    // Critical: inner generator's `finally` ran → cleanup cascaded.
    expect(innerFinallyFired.value).toBe(true)
    // The abort surfaced as ERR_CANCELLED through deploy()'s normal
    // path — also confirms the cleanup didn't swallow the error.
    expect(abortError).toBeDefined()
  })

  it('inner DNS generator finally runs when outer for-await is broken (no abort)', async () => {
    const { deploy } = await import('../src/sdk/deploy')
    const gen = deploy({ source_dir: '/tmp/site', domain: 'test.ton' })

    // for-await + break — this is the path that USED to leak the
    // inner's finally. The outer.return() call from the for-await
    // break must cascade as inner.return().
    for await (const ev of gen) {
      if (ev.phase === 'awaiting_signature') {
        break
      }
    }

    // Give the cascade a microtask to settle.
    await new Promise((r) => setTimeout(r, 50))
    expect(innerFinallyFired.value).toBe(true)
  })
})
