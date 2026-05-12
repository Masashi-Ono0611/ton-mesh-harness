/**
 * TonConnectProvider boundary tests — dispose() forwarding, error
 * swallowing, and the round-7/8 console.debug silence + reference
 * counting that prevents @tonconnect/sdk from leaking signed BOCs
 * to stderr. We mock @tonconnect/sdk so no real bridge is hit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const pauseSpy = vi.fn()

vi.mock('@tonconnect/sdk', () => {
  // Minimal shape — only what TonConnectProvider's constructor +
  // dispose actually touch.
  class FakeTonConnect {
    constructor(opts: { storage: unknown; manifestUrl: string }) {
      void opts
    }
    pauseConnection() { pauseSpy() }
  }
  return { default: FakeTonConnect, CHAIN: { MAINNET: '-239', TESTNET: '-3' } }
})

const makeWallet = async () => {
  const { TonConnectProvider } = await import('../../src/wallet/TonConnectProvider')
  const fakeStorage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() }
  const fakeUi = {
    choose: vi.fn(), input: vi.fn(), write: vi.fn(),
    setActionPrompt: vi.fn(), clearActionPrompt: vi.fn(),
  }
  return new TonConnectProvider(fakeStorage as any, fakeUi as any, 'mainnet', 'https://example.com/manifest.json')
}

describe('TonConnectProvider.dispose()', () => {
  beforeEach(() => { pauseSpy.mockReset() })

  it('forwards to connector.pauseConnection()', async () => {
    const wallet = await makeWallet()
    wallet.dispose()
    expect(pauseSpy).toHaveBeenCalledTimes(1)
  })

  it('swallows errors so a finally-block call never throws', async () => {
    pauseSpy.mockImplementationOnce(() => { throw new Error('bridge teardown panicked') })
    const wallet = await makeWallet()
    expect(() => wallet.dispose()).not.toThrow()
  })

  // Codex r7 BLOCKER regression — @tonconnect/sdk v3.4.1 calls
  // console.debug with unsigned payload + signed BOC. The provider
  // swaps console.debug for a no-op around every SDK call.
  it('silences console.debug during pauseConnection() and restores after', async () => {
    const originalDebug = console.debug
    let isOriginalInside = true
    pauseSpy.mockImplementationOnce(() => {
      isOriginalInside = console.debug === originalDebug
    })
    const wallet = await makeWallet()
    wallet.dispose()
    expect(isOriginalInside).toBe(false)
    expect(console.debug).toBe(originalDebug)
  })

  // Codex r8 BLOCKER regression — per-call save/restore raced when
  // SDK calls overlapped (dispose() while sendTransactionMulti()
  // awaiting). Reference-counted depth keeps the no-op active until
  // the outermost scope exits.
  it('reference-counted silence: inner leave does NOT restore while outer is in scope', async () => {
    const mod = await import('../../src/wallet/TonConnectProvider')
    const originalDebug = console.debug

    mod._enterQuiet_FOR_TEST()                          // depth 0→1
    expect(console.debug).not.toBe(originalDebug)
    mod._enterQuiet_FOR_TEST()                          // depth 1→2
    mod._leaveQuiet_FOR_TEST()                          // depth 2→1
    expect(console.debug).not.toBe(originalDebug)       // outer still active
    mod._leaveQuiet_FOR_TEST()                          // depth 1→0
    expect(console.debug).toBe(originalDebug)
  })

  it('defensive: unmatched leaveQuiet is a no-op', async () => {
    const mod = await import('../../src/wallet/TonConnectProvider')
    const originalDebug = console.debug
    mod._leaveQuiet_FOR_TEST()
    expect(console.debug).toBe(originalDebug)
  })

  it('TONCONNECT_DEBUG=1 escape hatch keeps the original console.debug active', async () => {
    const originalDebug = console.debug
    let isOriginalInside = false
    process.env.TONCONNECT_DEBUG = '1'
    try {
      pauseSpy.mockImplementationOnce(() => {
        isOriginalInside = console.debug === originalDebug
      })
      const wallet = await makeWallet()
      wallet.dispose()
      expect(isOriginalInside).toBe(true)
    } finally {
      delete process.env.TONCONNECT_DEBUG
    }
  })
})
