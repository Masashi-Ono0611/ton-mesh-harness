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
})
