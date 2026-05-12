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
