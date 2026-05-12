import { describe, it, expect, vi, beforeEach } from 'vitest'

// We mock @tonconnect/sdk so the test never touches a real bridge — we just
// need to verify our dispose() forwards to connector.pauseConnection() and
// swallows errors so a follow-up cleanup never throws inside a `finally`.

const pauseSpy = vi.fn()

vi.mock('@tonconnect/sdk', () => {
  // Minimal shape — only what TonConnectProvider's constructor + dispose use.
  class FakeTonConnect {
    storage: unknown
    manifestUrl: string
    constructor(opts: { storage: unknown; manifestUrl: string }) {
      this.storage = opts.storage
      this.manifestUrl = opts.manifestUrl
    }
    pauseConnection() { pauseSpy() }
  }
  return {
    default: FakeTonConnect,
    CHAIN: { MAINNET: '-239', TESTNET: '-3' },
  }
})

describe('TonConnectProvider.dispose()', () => {
  beforeEach(() => { pauseSpy.mockReset() })

  it('forwards to connector.pauseConnection()', async () => {
    const { TonConnectProvider } = await import('../../src/wallet/TonConnectProvider')
    const fakeStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() }
    const fakeUi = {
      choose: vi.fn(),
      input: vi.fn(),
      write: vi.fn(),
      setActionPrompt: vi.fn(),
      clearActionPrompt: vi.fn(),
    }
    const wallet = new TonConnectProvider(fakeStorage as any, fakeUi as any, 'mainnet', 'https://example.com/manifest.json')
    wallet.dispose()
    expect(pauseSpy).toHaveBeenCalledTimes(1)
  })

  it('swallows errors so a finally-block call never throws', async () => {
    pauseSpy.mockImplementationOnce(() => { throw new Error('bridge teardown panicked') })
    const { TonConnectProvider } = await import('../../src/wallet/TonConnectProvider')
    const fakeStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() }
    const fakeUi = {
      choose: vi.fn(),
      input: vi.fn(),
      write: vi.fn(),
      setActionPrompt: vi.fn(),
      clearActionPrompt: vi.fn(),
    }
    const wallet = new TonConnectProvider(fakeStorage as any, fakeUi as any, 'mainnet', 'https://example.com/manifest.json')
    expect(() => wallet.dispose()).not.toThrow()
  })

  // Codex pre-GA review round 7 BLOCKER regression gate.
  // @tonconnect/sdk v3.4.1 calls console.debug at request/response
  // boundaries with the unsigned payload and signed BOC visible.
  // TonConnectProvider must silence console.debug for the duration
  // of every SDK call to prevent the leak; this test confirms the
  // silence-and-restore pattern works around dispose().
  it('silences console.debug during pauseConnection() and restores after', async () => {
    const originalDebug = console.debug
    let inSdkSeen = false
    pauseSpy.mockImplementationOnce(() => {
      // Simulate @tonconnect/sdk's internal logDebug — under the
      // unsilenced path this would print to stderr.
      console.debug('[TON_CONNECT_SDK]', 'fake-sensitive-payload')
      inSdkSeen = console.debug === originalDebug
    })
    const { TonConnectProvider } = await import('../../src/wallet/TonConnectProvider')
    const wallet = new TonConnectProvider(
      { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() } as any,
      { choose: vi.fn(), input: vi.fn(), write: vi.fn(), setActionPrompt: vi.fn(), clearActionPrompt: vi.fn() } as any,
      'mainnet',
      'https://example.com/manifest.json',
    )
    wallet.dispose()
    // Inside the SDK call, console.debug must NOT have been the original.
    expect(inSdkSeen).toBe(false)
    // After dispose returns, console.debug must be restored.
    expect(console.debug).toBe(originalDebug)
  })

  // Codex pre-GA review round 8 BLOCKER regression gate.
  // The round-7 fix saved/restored console.debug per call. If two
  // TonConnect SDK calls overlapped (e.g. dispose() while
  // sendTransactionMulti() awaiting), the inner's restore would
  // expose the still-active outer to console.debug leaks.
  // The round-8 fix is reference counted — any in-scope caller keeps
  // the no-op active. Test by driving the internal enter/leave helpers
  // directly, since simulating the real connect-await + sync-dispose
  // overlap requires a full TonConnect bridge.
  it('reference-counted silence: nested enter+leave keeps noop until depth returns to 0', async () => {
    const mod = await import('../../src/wallet/TonConnectProvider')
    const originalDebug = console.debug

    // Simulate overlap shape:
    //   1. Outer enters (depth 0→1) — installs noop
    //   2. Inner enters (depth 1→2) — noop unchanged
    //   3. Inner leaves (depth 2→1) — noop STILL active (the bug
    //      under the round-7 fix: inner's restore would put back
    //      the captured-noop, breaking the outer's expected silence
    //      when its own restore later swaps to that captured-noop).
    //   4. Outer leaves (depth 1→0) — restore original

    mod._enterQuiet_FOR_TEST()
    expect(console.debug).not.toBe(originalDebug)
    mod._enterQuiet_FOR_TEST()
    expect(console.debug).not.toBe(originalDebug)
    mod._leaveQuiet_FOR_TEST()
    // Critical assertion: inner-leave must NOT restore — outer is
    // still in scope.
    expect(console.debug).not.toBe(originalDebug)
    mod._leaveQuiet_FOR_TEST()
    // Final leave: original restored.
    expect(console.debug).toBe(originalDebug)
  })

  it('defensive: leaveQuiet without matching enter is a no-op (won\'t corrupt console.debug)', async () => {
    const mod = await import('../../src/wallet/TonConnectProvider')
    const originalDebug = console.debug
    // Unmatched leave — should NOT panic and SHOULD NOT mutate
    // console.debug. Codex round-8 fix protects via depth === 0
    // early return.
    mod._leaveQuiet_FOR_TEST()
    expect(console.debug).toBe(originalDebug)
  })

  it('TONCONNECT_DEBUG=1 escape hatch lets developers re-enable SDK debug logging', async () => {
    const originalDebug = console.debug
    let inSdkSeen = false
    process.env.TONCONNECT_DEBUG = '1'
    try {
      pauseSpy.mockImplementationOnce(() => {
        inSdkSeen = console.debug === originalDebug
      })
      const { TonConnectProvider } = await import('../../src/wallet/TonConnectProvider')
      const wallet = new TonConnectProvider(
        { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() } as any,
        { choose: vi.fn(), input: vi.fn(), write: vi.fn(), setActionPrompt: vi.fn(), clearActionPrompt: vi.fn() } as any,
        'mainnet',
        'https://example.com/manifest.json',
      )
      wallet.dispose()
      // Escape hatch active → original console.debug stays in scope.
      expect(inSdkSeen).toBe(true)
    } finally {
      delete process.env.TONCONNECT_DEBUG
    }
  })
})
