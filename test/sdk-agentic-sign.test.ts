import { Address, beginCell } from '@ton/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mocked unit tests for agentic-sign.ts. We avoid touching the network
 * by intercepting `@ton/walletkit`'s Signer / Adapter / ApiClient at
 * import time. This catches BLOCKER-2-class wiring regressions:
 *   - wallet_version routing (v5r1 vs v4r2)
 *   - mnemonic vs private_key signer factory
 *   - request shape passed to getSignedSendTransaction
 *   - error mapping (sign failure → ERR_INTERNAL,
 *                    sendBoc failure → ERR_DNS_TX_TIMEOUT)
 */

const mocks = vi.hoisted(() => ({
  signerFromMnemonicMock: vi.fn(),
  signerFromPrivateKeyMock: vi.fn(),
  v5CreateMock: vi.fn(),
  v4CreateMock: vi.fn(),
  agenticCreateMock: vi.fn(),
  apiClientCtorMock: vi.fn(),
}))

vi.mock('@ton/walletkit', () => ({
  Signer: {
    fromMnemonic: mocks.signerFromMnemonicMock,
    fromPrivateKey: mocks.signerFromPrivateKeyMock,
  },
  WalletV5R1Adapter: { create: mocks.v5CreateMock },
  WalletV4R2Adapter: { create: mocks.v4CreateMock },
  ApiClientToncenter: mocks.apiClientCtorMock,
  Network: {
    mainnet: () => ({ chainId: '-239' }),
    testnet: () => ({ chainId: '-3' }),
  },
  SendModeFlag: { PAY_GAS_SEPARATELY: 1, IGNORE_ERRORS: 2 },
}))

vi.mock('@ton/mcp', () => ({
  AgenticWalletAdapter: { create: mocks.agenticCreateMock },
}))

const {
  signerFromMnemonicMock,
  signerFromPrivateKeyMock,
  v5CreateMock,
  v4CreateMock,
  agenticCreateMock,
  apiClientCtorMock,
} = mocks

let getSignedSendTransactionMock = vi.fn()
let sendBocMock = vi.fn()
let getAddressMock = vi.fn()

import { agenticSignAndSend } from '../src/sdk/agentic-sign'
import type {
  StoredNftAgenticWallet,
  StoredStandardWallet,
} from '../src/sdk/agentic-config'
import { SdkError } from '../src/sdk/deploy'

const ISO = '2026-05-11T00:00:00Z'

function makeWallet(overrides: Partial<StoredStandardWallet> = {}): StoredStandardWallet {
  return {
    id: 'w1',
    name: 'Test',
    type: 'standard',
    wallet_version: 'v5r1',
    network: 'mainnet',
    address: 'UQAAA',
    mnemonic: 'word '.repeat(24).trim(),
    created_at: ISO,
    updated_at: ISO,
    ...overrides,
  } as StoredStandardWallet
}

function nftAddr(): Address {
  // Synthetic address — bypass checksum by using raw form.
  return Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000')
}

function dummyPayload() {
  return beginCell().storeUint(0, 32).endCell()
}

describe('agenticSignAndSend (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default happy-path adapter
    getSignedSendTransactionMock = vi.fn().mockResolvedValue('SIGNED_BOC_B64')
    sendBocMock = vi.fn().mockResolvedValue('0xdeadbeef')
    getAddressMock = vi.fn().mockReturnValue('UQfrom_user_friendly')

    const adapter = {
      getSignedSendTransaction: getSignedSendTransactionMock,
      getClient: () => ({ sendBoc: sendBocMock }),
      getAddress: getAddressMock,
    }

    v5CreateMock.mockResolvedValue(adapter)
    v4CreateMock.mockResolvedValue(adapter)
    agenticCreateMock.mockResolvedValue(adapter)
    signerFromMnemonicMock.mockResolvedValue({ publicKey: 'pk_mnemonic' })
    signerFromPrivateKeyMock.mockResolvedValue({ publicKey: 'pk_pk' })
    apiClientCtorMock.mockImplementation((cfg: unknown) => ({ cfg }))
  })

  afterEach(() => vi.restoreAllMocks())

  it('routes mnemonic-bearing standard wallet → Signer.fromMnemonic + V5 adapter', async () => {
    const wallet = makeWallet()
    await agenticSignAndSend({
      wallet,
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    expect(signerFromMnemonicMock).toHaveBeenCalled()
    expect(signerFromPrivateKeyMock).not.toHaveBeenCalled()
    expect(v5CreateMock).toHaveBeenCalled()
    expect(v4CreateMock).not.toHaveBeenCalled()
  })

  it('routes private_key wallet → Signer.fromPrivateKey + V4 adapter (32-byte seed)', async () => {
    const wallet = makeWallet({
      wallet_version: 'v4r2',
      mnemonic: undefined,
      private_key: 'ab'.repeat(32),
    })
    await agenticSignAndSend({
      wallet,
      toncenter_api_key: 'KEY',
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    expect(signerFromPrivateKeyMock).toHaveBeenCalled()
    expect(signerFromMnemonicMock).not.toHaveBeenCalled()
    expect(v4CreateMock).toHaveBeenCalled()
    expect(v5CreateMock).not.toHaveBeenCalled()
  })

  it('extracts first 32 bytes from 64-byte combined keypair (private_key length 128 hex)', async () => {
    const wallet = makeWallet({
      mnemonic: undefined,
      private_key: '11'.repeat(32) + '22'.repeat(32), // 128 hex chars total
    })
    await agenticSignAndSend({
      wallet,
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    const arg = signerFromPrivateKeyMock.mock.calls[0][0] as Buffer
    expect(arg).toBeInstanceOf(Buffer)
    expect(arg.length).toBe(32)
    expect(arg.toString('hex')).toBe('11'.repeat(32))
  })

  it('throws ERR_NO_WALLET on invalid private_key hex', async () => {
    const wallet = makeWallet({
      mnemonic: undefined,
      private_key: 'zz_not_hex_zz',
    })
    await expect(
      agenticSignAndSend({
        wallet,
        toncenter_api_key: undefined,
        messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
      }),
    ).rejects.toThrowError(SdkError)
  })

  it('builds the request with validUntil ≤ 5min and base64-encoded payload', async () => {
    const before = Math.floor(Date.now() / 1000)
    await agenticSignAndSend({
      wallet: makeWallet(),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    const request = getSignedSendTransactionMock.mock.calls[0][0] as {
      validUntil: number
      fromAddress: string
      messages: Array<{ address: string; amount: string; payload: string }>
    }
    expect(request.validUntil).toBeGreaterThanOrEqual(before + 5 * 60 - 1)
    expect(request.validUntil).toBeLessThanOrEqual(before + 5 * 60 + 2)
    expect(request.messages[0].address).toMatch(/^EQ|^UQ/)
    expect(request.messages[0].amount).toBe('20000000')
    // Base64-encoded BOC must be valid base64
    expect(request.messages[0].payload).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  it('returns message_hash + from_address from sendBoc / getAddress', async () => {
    sendBocMock.mockResolvedValueOnce('0xabc123')
    getAddressMock.mockReturnValueOnce('UQfromabc')
    const out = await agenticSignAndSend({
      wallet: makeWallet(),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    expect(out.message_hash).toBe('0xabc123')
    expect(out.from_address).toBe('UQfromabc')
  })

  it('sign failure → ERR_INTERNAL', async () => {
    getSignedSendTransactionMock.mockRejectedValueOnce(new Error('bad seqno'))
    await expect(
      agenticSignAndSend({
        wallet: makeWallet(),
        toncenter_api_key: undefined,
        messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
      }),
    ).rejects.toThrow(/Agentic sign failed/)
  })

  it('sendBoc failure → ERR_DNS_TX_TIMEOUT', async () => {
    sendBocMock.mockRejectedValueOnce(new Error('429 too many requests'))
    try {
      await agenticSignAndSend({
        wallet: makeWallet(),
        toncenter_api_key: undefined,
        messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(SdkError)
      expect((e as SdkError).code).toBe('ERR_DNS_TX_TIMEOUT')
    }
  })

  it('passes toncenter_api_key through to ApiClientToncenter', async () => {
    await agenticSignAndSend({
      wallet: makeWallet(),
      toncenter_api_key: 'MY-KEY',
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    expect(apiClientCtorMock).toHaveBeenCalled()
    const cfg = apiClientCtorMock.mock.calls[0][0] as {
      apiKey: string | undefined
      endpoint: string
    }
    expect(cfg.apiKey).toBe('MY-KEY')
    expect(cfg.endpoint).toBe('https://toncenter.com')
  })

  it('uses testnet endpoint for testnet wallet', async () => {
    await agenticSignAndSend({
      wallet: makeWallet({ network: 'testnet' }),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    const cfg = apiClientCtorMock.mock.calls[0][0] as { endpoint: string }
    expect(cfg.endpoint).toBe('https://testnet.toncenter.com')
  })

  it('honours pre-aborted signal → ERR_CANCELLED + no broadcast', async () => {
    const controller = new AbortController()
    controller.abort()
    try {
      await agenticSignAndSend({
        wallet: makeWallet(),
        toncenter_api_key: undefined,
        messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
        signal: controller.signal,
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(SdkError)
      expect((e as SdkError).code).toBe('ERR_CANCELLED')
    }
    // sendBoc must NOT have been called.
    expect(sendBocMock).not.toHaveBeenCalled()
  })

  it('honours abort racing between sign and sendBoc', async () => {
    const controller = new AbortController()
    // Sign succeeds normally, then we trip the signal BEFORE sendBoc.
    getSignedSendTransactionMock.mockImplementation(async () => {
      controller.abort()
      return 'SIGNED_BOC_B64'
    })
    try {
      await agenticSignAndSend({
        wallet: makeWallet(),
        toncenter_api_key: undefined,
        messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
        signal: controller.signal,
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(SdkError)
      expect((e as SdkError).code).toBe('ERR_CANCELLED')
    }
    expect(sendBocMock).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NFT-delegated agentic path (v0.8.x) — operator key + @ton/mcp adapter
// ─────────────────────────────────────────────────────────────────────────────

function makeAgenticWallet(
  overrides: Partial<StoredNftAgenticWallet> = {},
): StoredNftAgenticWallet {
  return {
    id: 'a1',
    name: 'NftWallet',
    type: 'agentic',
    network: 'mainnet',
    address: 'UQAgentic',
    owner_address: 'UQOwner',
    operator_private_key: 'ab'.repeat(32),
    collection_address: 'EQCollection',
    wallet_nft_index: '42',
    created_at: ISO,
    updated_at: ISO,
    ...overrides,
  } as StoredNftAgenticWallet
}

describe('agenticSignAndSend (NFT-delegated path, mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSignedSendTransactionMock = vi.fn().mockResolvedValue('SIGNED_BOC_B64')
    sendBocMock = vi.fn().mockResolvedValue('0xnftdeadbeef')
    getAddressMock = vi.fn().mockReturnValue('UQAgentic')
    const adapter = {
      getSignedSendTransaction: getSignedSendTransactionMock,
      getClient: () => ({ sendBoc: sendBocMock }),
      getAddress: getAddressMock,
    }
    v5CreateMock.mockResolvedValue(adapter)
    v4CreateMock.mockResolvedValue(adapter)
    agenticCreateMock.mockResolvedValue(adapter)
    signerFromPrivateKeyMock.mockResolvedValue({ publicKey: 'pk_operator' })
    apiClientCtorMock.mockImplementation((cfg: unknown) => ({ cfg }))
  })

  it('routes type=agentic → AgenticWalletAdapter.create (not V5/V4)', async () => {
    await agenticSignAndSend({
      wallet: makeAgenticWallet(),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    expect(agenticCreateMock).toHaveBeenCalledTimes(1)
    expect(v5CreateMock).not.toHaveBeenCalled()
    expect(v4CreateMock).not.toHaveBeenCalled()
  })

  it('signs with operator_private_key (not mnemonic)', async () => {
    await agenticSignAndSend({
      wallet: makeAgenticWallet(),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    expect(signerFromPrivateKeyMock).toHaveBeenCalled()
    expect(signerFromMnemonicMock).not.toHaveBeenCalled()
  })

  it('passes walletAddress + walletNftIndex + collectionAddress to the adapter', async () => {
    await agenticSignAndSend({
      wallet: makeAgenticWallet(),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    const [, opts] = agenticCreateMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.walletAddress).toBe('UQAgentic')
    expect(opts.walletNftIndex).toBe(42n)
    expect(opts.collectionAddress).toBe('EQCollection')
  })

  it('omits walletNftIndex when not set in config', async () => {
    await agenticSignAndSend({
      wallet: makeAgenticWallet({ wallet_nft_index: undefined }),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    const [, opts] = agenticCreateMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.walletNftIndex).toBeUndefined()
  })

  it('rejects when operator_private_key is missing', async () => {
    await expect(
      agenticSignAndSend({
        wallet: makeAgenticWallet({ operator_private_key: undefined }),
        toncenter_api_key: undefined,
        messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
      }),
    ).rejects.toThrowError(SdkError)
  })

  it('returns message_hash from sendBoc + agentic NFT address as from_address', async () => {
    const result = await agenticSignAndSend({
      wallet: makeAgenticWallet(),
      toncenter_api_key: undefined,
      messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
    })
    expect(result.message_hash).toBe('0xnftdeadbeef')
    expect(result.from_address).toBe('UQAgentic')
  })

  it('honours pre-aborted signal (no broadcast)', async () => {
    const controller = new AbortController()
    controller.abort()
    try {
      await agenticSignAndSend({
        wallet: makeAgenticWallet(),
        toncenter_api_key: undefined,
        messages: [{ address: nftAddr(), amount: 20_000_000n, payload: dummyPayload() }],
        signal: controller.signal,
      })
      expect.fail('should throw')
    } catch (e) {
      expect((e as SdkError).code).toBe('ERR_CANCELLED')
    }
    expect(sendBocMock).not.toHaveBeenCalled()
  })
})
