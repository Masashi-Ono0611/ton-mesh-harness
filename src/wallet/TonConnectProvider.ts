// Adapted from @ton/blueprint
// Copyright (c) 2025 Ton Tech, MIT License
// Original: https://github.com/ton-org/blueprint/blob/main/src/network/send/TonConnectProvider.ts
//
// Adaptations:
// - WalletUI here is a tiny subset of Blueprint's UIProvider (choose / write / set/clearActionPrompt)
// - typed return for sendTransaction (uses @tonconnect/sdk's SendTransactionResponse)
// - manifestUrl is required (no default), forcing each consumer to declare its own

import qrcode from 'qrcode-terminal'
import TonConnect, { CHAIN, type IStorage, type WalletInfo, type WalletInfoRemote, type SendTransactionResponse } from '@tonconnect/sdk'
import { Address, beginCell, Cell, type StateInit, storeStateInit } from '@ton/core'

import type { SendProvider } from './SendProvider'
import type { Storage } from './Storage'
import type { WalletUI } from './ui'

class TonConnectStorage implements IStorage {
  constructor(private readonly inner: Storage) {}
  async setItem(key: string, value: string): Promise<void> {
    return await this.inner.setItem(key, value)
  }
  async getItem(key: string): Promise<string | null> {
    return await this.inner.getItem(key)
  }
  async removeItem(key: string): Promise<void> {
    return await this.inner.removeItem(key)
  }
}

function isRemote(walletInfo: WalletInfo): walletInfo is WalletInfoRemote {
  return 'universalLink' in walletInfo && 'bridgeUrl' in walletInfo
}

export type WalletNetwork = 'mainnet' | 'testnet'

export class TonConnectProvider implements SendProvider {
  private readonly connector: TonConnect
  private readonly ui: WalletUI
  private readonly network: WalletNetwork

  constructor(
    storage: Storage,
    ui: WalletUI,
    network: WalletNetwork,
    manifestUrl: string,
  ) {
    this.connector = new TonConnect({
      storage: new TonConnectStorage(storage),
      manifestUrl,
    })
    this.ui = ui
    this.network = network
  }

  /**
   * @param onConnectUrl — optional callback fired with the freshly-generated
   * TonConnect connect URL just before we await the wallet pairing. Used by
   * the SDK's `deploy()` generator to emit `awaiting_signature` with
   * `signing_url` set. CLI callers can ignore — the URL is also printed via
   * the QR code in `connectWallet()`.
   */
  async connect(onConnectUrl?: (url: string) => void): Promise<void> {
    await this.connectWallet(onConnectUrl)
    const formatted = Address.parse(this.connector.wallet!.account.address).toString({
      testOnly: this.network === 'testnet',
      bounceable: false,
    })
    this.ui.write(`Connected to wallet at address: ${formatted}\n`)
  }

  address(): Address | undefined {
    if (!this.connector.wallet) return undefined
    return Address.parse(this.connector.wallet.account.address)
  }

  /**
   * Stop the @tonconnect/sdk bridge HTTP listener (server-sent events) so
   * the Node event loop drains and the CLI can exit after a `--no-watch`
   * deploy. We pause rather than disconnect so the on-disk session stays
   * paired — `connect()` next run finds it via `restoreConnection()`.
   * Caller responsibility: invoke from a `finally` block after the last
   * sendTransaction[Multi] call.
   */
  dispose(): void {
    try {
      this.connector.pauseConnection()
    } catch { /* best-effort cleanup */ }
  }

  private async connectWallet(onConnectUrl?: (url: string) => void): Promise<void> {
    const wallets = (await this.connector.getWallets()).filter(isRemote)

    await this.connector.restoreConnection()
    if (this.connector.wallet) return

    const wallet = await this.ui.choose('Choose your wallet', wallets, (w) => w.name)
    this.ui.setActionPrompt('Connecting to wallet...')

    const url = this.connector.connect({
      universalLink: wallet.universalLink,
      bridgeUrl: wallet.bridgeUrl,
    }) as string

    // Fire the SDK-side hook first so `awaiting_signature` lands before the
    // QR/url payload pollutes the agent's stdout. The CLI's ui.write path
    // also runs — agent runtimes consume the structured event, humans
    // consume the QR.
    if (onConnectUrl) {
      try {
        onConnectUrl(url)
      } catch {
        /* swallow — hook errors must never break a real wallet flow */
      }
    }

    this.ui.write('\n')
    qrcode.generate(url, { small: true }, (qr) => this.ui.write(qr))
    this.ui.write('\n' + url + '\n\n')
    this.ui.setActionPrompt('Scan the QR code in your wallet or open the link...')

    return new Promise<void>((resolve, reject) => {
      this.connector.onStatusChange((w) => {
        if (w) resolve()
        else reject(new Error('Wallet is not connected'))
      }, reject)
    })
  }

  async sendTransaction(
    address: Address,
    amount: bigint,
    payload?: Cell,
    stateInit?: StateInit,
  ): Promise<SendTransactionResponse> {
    return this.sendTransactionMulti([{ address, amount, payload, stateInit }])
  }

  /**
   * Send a TonConnect transaction with multiple messages bundled into a single
   * sign request. Tonkeeper supports up to 4 messages per tx (TonConnect spec
   * §sendTransaction). Used by --domain when both a `storage` and `site` DNS
   * record are written in one user-prompt.
   */
  async sendTransactionMulti(
    messages: Array<{ address: Address; amount: bigint; payload?: Cell; stateInit?: StateInit }>,
  ): Promise<SendTransactionResponse> {
    if (messages.length < 1) {
      throw new Error('sendTransactionMulti: at least one message required')
    }
    if (messages.length > 4) {
      throw new Error(`sendTransactionMulti: TonConnect spec caps messages at 4 (got ${messages.length})`)
    }

    this.ui.setActionPrompt('Sending transaction. Approve in your wallet...')

    // TonConnect spec: validUntil is Unix epoch SECONDS, not ms. Blueprint's
    // original code passed Date.now() + 5*60*1000 (ms) which produced a
    // ~50,000-year-future timestamp — effectively a never-expiring signing
    // request. We pin to 5 minutes from now in seconds.
    const validUntil = Math.floor(Date.now() / 1000) + 5 * 60

    // Pin the chain explicitly so the wallet refuses if it is connected to a
    // different network — protects against signing a mainnet payment with a
    // testnet wallet and vice versa.
    const network = this.network === 'mainnet' ? CHAIN.MAINNET : CHAIN.TESTNET

    const result = await this.connector.sendTransaction({
      validUntil,
      network,
      messages: messages.map((m) => ({
        address: m.address.toString(),
        amount: m.amount.toString(),
        payload: m.payload?.toBoc().toString('base64'),
        stateInit: m.stateInit
          ? beginCell().storeWritable(storeStateInit(m.stateInit)).endCell().toBoc().toString('base64')
          : undefined,
      })),
    })

    this.ui.clearActionPrompt()
    this.ui.write('Sent transaction\n')
    return result
  }
}
