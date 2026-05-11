/**
 * Agentic signing — dispatches by `wallet.type`:
 *
 *  - `standard`: walletkit's `Signer` + `WalletV5R1Adapter`/`WalletV4R2Adapter`
 *    (direct sign — operator IS the wallet).
 *  - `agentic`:  @ton/mcp's `AgenticWalletAdapter` (operator key signs via
 *    the agentic NFT collection contract on behalf of owner_address; v0.8.x).
 *
 * Both adapters implement `WalletAdapter` so the rest of this module is
 * agnostic to the path — `buildAdapter()` returns the right adapter and
 * `getSignedSendTransaction → sendBoc` is identical.
 *
 * The result is the normalized message hash (`0x<hex>`) returned by
 * `ApiClientToncenter.sendBoc`, suitable as `dns_tx_hash` (it indexes the
 * external-in message; explorers resolve to the on-chain tx within seconds).
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
import type {
  StoredNftAgenticWallet,
  StoredSelectableWallet,
  StoredStandardWallet,
} from './agentic-config'
import { makeAbortChecker } from './abort'
import { buildToncenterClient, getWalletkitNetwork } from './walletkit-network'
import { signRequestValidUntilSeconds } from '../wallet/constants'

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

async function buildStandardSigner(wallet: StoredStandardWallet): Promise<WalletSigner> {
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

async function buildOperatorSigner(wallet: StoredNftAgenticWallet): Promise<WalletSigner> {
  if (!wallet.operator_private_key) {
    // agentic-config.ts's refine already enforces this; belt-and-braces.
    throw new SdkError(
      'ERR_NO_WALLET',
      'NFT-delegated agentic wallet has no operator_private_key',
      {
        severity: 'fatal',
        fixHint:
          'Re-import the agentic wallet via `@ton/mcp@alpha agentic_import_wallet` ' +
          'to obtain a fresh operator key, or rotate the operator key.',
      },
    )
  }
  try {
    const seed = parsePrivateKeySeed(wallet.operator_private_key)
    return await Signer.fromPrivateKey(seed)
  } catch (err) {
    if (err instanceof SdkError) throw err
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_NO_WALLET', `Failed to derive operator signer: ${msg}`, {
      severity: 'fatal',
    })
  }
}

/**
 * Lazy-load `@ton/mcp` so users on the TonConnect-only path don't pay
 * the 19 MB install cost. `@ton/mcp` is declared as an OPTIONAL peer
 * dependency — users who hit the NFT-delegated agentic path get a
 * clear error pointing at `npm install @ton/mcp@alpha`.
 */
async function loadAgenticWalletAdapter(): Promise<{
  create: (
    signer: WalletSigner,
    options: {
      client: unknown
      network: unknown
      walletAddress?: string
      walletNftIndex?: bigint
      collectionAddress?: string
    },
  ) => Promise<WalletAdapter>
}> {
  try {
    const mod = (await import('@ton/mcp')) as {
      AgenticWalletAdapter: {
        create: (
          signer: WalletSigner,
          options: {
            client: unknown
            network: unknown
            walletAddress?: string
            walletNftIndex?: bigint
            collectionAddress?: string
          },
        ) => Promise<WalletAdapter>
      }
    }
    return mod.AgenticWalletAdapter
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError(
      'ERR_NO_WALLET',
      `NFT-delegated agentic signing requires @ton/mcp (not installed): ${msg}`,
      {
        severity: 'fatal',
        fixHint:
          'Install the optional peer: `npm install @ton/mcp@alpha`. ' +
          'Alternatively, use a `type: "standard"` wallet (mnemonic / private_key) — ' +
          'no extra install needed.',
      },
    )
  }
}

async function buildAdapter(
  wallet: StoredSelectableWallet,
  toncenterApiKey: string | undefined,
): Promise<WalletAdapter> {
  const network = getWalletkitNetwork(wallet.network)
  const client = buildToncenterClient(wallet.network, toncenterApiKey)

  if (wallet.type === 'agentic') {
    // NFT-delegated path — operator key signs via the agentic collection
    // contract on behalf of owner_address. The adapter exposes the same
    // `getSignedSendTransaction` shape as the standard adapters so the
    // rest of the pipeline is unchanged.
    const AgenticWalletAdapter = await loadAgenticWalletAdapter()
    const signer = await buildOperatorSigner(wallet)
    const walletNftIndex = wallet.wallet_nft_index
      ? BigInt(wallet.wallet_nft_index)
      : undefined
    return AgenticWalletAdapter.create(signer, {
      client,
      network,
      walletAddress: wallet.address,
      walletNftIndex,
      collectionAddress: wallet.collection_address,
    })
  }

  // Standard path — direct sign via walletkit.
  const signer = await buildStandardSigner(wallet)
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
  wallet: StoredSelectableWallet
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
  const checkAborted = makeAbortChecker(input.signal, 'Agentic sign+send cancelled.')

  checkAborted()
  const adapter = await buildAdapter(input.wallet, input.toncenter_api_key)
  checkAborted()

  const fromAddress = adapter.getAddress({ testnet: input.wallet.network === 'testnet' })
  const validUntil = signRequestValidUntilSeconds()

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
