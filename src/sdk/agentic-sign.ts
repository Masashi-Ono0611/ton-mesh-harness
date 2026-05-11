/**
 * Agentic signing — builds a `WalletAdapter` from a `StoredStandardWallet`
 * via `@ton/walletkit`'s `Signer` + version-appropriate adapter, signs a
 * batch of messages, and broadcasts via Toncenter.
 *
 * The result is the normalized message hash (`0x<hex>`) returned by
 * `ApiClientToncenter.sendBoc`, suitable as `dns_tx_hash` (it indexes the
 * external-in message; explorers resolve to the on-chain tx within seconds).
 *
 * Scope: standard wallets only (v5r1, v4r2). NFT-delegated agentic signing
 * is rejected upstream in `agentic-config.ts`.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import type { Address, Cell } from '@ton/core'
import {
  Signer,
  WalletV4R2Adapter,
  WalletV5R1Adapter,
  type WalletAdapter,
  type WalletSigner,
} from '@ton/walletkit'
import { SdkError } from './deploy'
import type { StoredStandardWallet } from './agentic-config'
import { buildToncenterClient, getWalletkitNetwork } from './walletkit-network'

// ─────────────────────────────────────────────────────────────────────────────
// Private-key normalization
//
// @ton/mcp accepts 32-byte (64 hex) seed OR 64-byte (128 hex) "combined
// keypair" (private + public) as `private_key`. The signing seed is the
// first 32 bytes either way — see `parsePrivateKeyInput` in
// @ton/mcp's src/utils/private-key.ts.
// ─────────────────────────────────────────────────────────────────────────────

function parsePrivateKeySeed(privateKey: string): Buffer {
  const stripped = privateKey.replace(/^0x/i, '').trim()
  if (!/^[0-9a-fA-F]+$/.test(stripped)) {
    throw new SdkError('ERR_NO_WALLET', 'Invalid private_key: expected hex-encoded value', {
      severity: 'fatal',
    })
  }
  if (stripped.length !== 64 && stripped.length !== 128) {
    throw new SdkError(
      'ERR_NO_WALLET',
      `Invalid private_key length: expected 64 or 128 hex chars, got ${stripped.length}.`,
      {
        severity: 'fatal',
      },
    )
  }
  const buf = Buffer.from(stripped, 'hex')
  return buf.length === 64 ? buf.subarray(0, 32) : buf
}

async function buildSigner(wallet: StoredStandardWallet): Promise<WalletSigner> {
  try {
    if (wallet.private_key) {
      const seed = parsePrivateKeySeed(wallet.private_key)
      return await Signer.fromPrivateKey(seed)
    }
    if (wallet.mnemonic) {
      const words = wallet.mnemonic.trim().split(/\s+/)
      return await Signer.fromMnemonic(words, { type: 'ton' })
    }
    // agentic-config.ts already enforces one-of; this is belt-and-braces.
    throw new SdkError('ERR_NO_WALLET', 'Standard wallet has no mnemonic or private_key', {
      severity: 'fatal',
    })
  } catch (err) {
    if (err instanceof SdkError) throw err
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_NO_WALLET', `Failed to derive signer: ${msg}`, {
      severity: 'fatal',
      fixHint: `Re-create the wallet via \`@ton/mcp@alpha\` — the stored credential may be corrupt.`,
    })
  }
}

async function buildAdapter(
  wallet: StoredStandardWallet,
  toncenterApiKey: string | undefined,
): Promise<WalletAdapter> {
  const signer = await buildSigner(wallet)
  const network = getWalletkitNetwork(wallet.network)
  const client = buildToncenterClient(wallet.network, toncenterApiKey)

  if (wallet.wallet_version === 'v4r2') {
    return WalletV4R2Adapter.create(signer, { client, network })
  }
  // default → v5r1
  return WalletV5R1Adapter.create(signer, { client, network })
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API: sign+send a batch of internal messages
// ─────────────────────────────────────────────────────────────────────────────

export interface AgenticSignSendInput {
  wallet: StoredStandardWallet
  toncenter_api_key: string | undefined
  messages: Array<{ address: Address; amount: bigint; payload: Cell }>
  /**
   * AbortSignal for the cancel-before-broadcast race window. Checked
   * after adapter construction and after signing, immediately before
   * `sendBoc`. Once `sendBoc` is invoked the broadcast is no longer
   * cancellable from our side.
   */
  signal?: AbortSignal
}

// NOTE on send mode: walletkit's WalletV5R1Adapter / WalletV4R2Adapter
// internally hardcode `sendMode: PAY_GAS_SEPARATELY + IGNORE_ERRORS` (=3)
// for transfers. Passing `mode` in the request is ignored. We omit it.

export interface AgenticSignSendResult {
  /** Normalized message hash returned by Toncenter (`0x<hex>`). */
  message_hash: string
  /** Wallet address that sent the batch (user-friendly form). */
  from_address: string
}

/**
 * Build adapter → sign → broadcast. The returned `message_hash` is the
 * normalized external-in hash that explorers / TONAPI resolve to the
 * actual tx within ~10s. We surface it as `dns_tx_hash`.
 */
export async function agenticSignAndSend(
  input: AgenticSignSendInput,
): Promise<AgenticSignSendResult> {
  const checkAborted = () => {
    if (input.signal?.aborted) {
      throw new SdkError('ERR_CANCELLED', 'Agentic sign+send cancelled.', {
        severity: 'recoverable',
      })
    }
  }

  checkAborted()
  const adapter = await buildAdapter(input.wallet, input.toncenter_api_key)
  checkAborted()

  const fromAddress = adapter.getAddress({ testnet: input.wallet.network === 'testnet' })
  const validUntil = Math.floor(Date.now() / 1000) + 5 * 60 // 5 min window

  let signedBoc: string
  try {
    // The walletkit `TransactionRequest`/`TransactionRequestMessage` use
    // branded `Base64String` / `TokenAmount` types. Cast the input via
    // `as never` to satisfy the brand without re-implementing it — the
    // shape is structurally correct.
    signedBoc = await adapter.getSignedSendTransaction({
      validUntil,
      fromAddress,
      messages: input.messages.map((m) => ({
        address: m.address.toString(),
        amount: m.amount.toString(),
        payload: m.payload.toBoc().toString('base64'),
      })) as never,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_INTERNAL', `Agentic sign failed: ${msg}`, {
      severity: 'fatal',
      fixHint:
        `Verify the wallet is deployed on-chain (run \`@ton/mcp@alpha\` get_balance to fund + deploy).`,
    })
  }

  // ─── Last cancel window before broadcast ─────────────────────────────────
  // Once we call `sendBoc`, the BOC is in flight at Toncenter and the
  // broadcast cannot be un-published. Checking here closes the race the
  // first review flagged.
  checkAborted()

  let messageHash: string
  try {
    messageHash = await adapter.getClient().sendBoc(signedBoc as never)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError(
      'ERR_DNS_TX_TIMEOUT',
      `Toncenter rejected the signed BOC: ${msg}`,
      {
        severity: 'recoverable',
        fixHint:
          `Common causes: insufficient balance on the wallet (need at least ~0.05 TON for 1-2 DNS writes), ` +
          `network congestion, or a Toncenter rate limit. Retry after funding/waiting.`,
      },
    )
  }

  return { message_hash: messageHash, from_address: fromAddress }
}
