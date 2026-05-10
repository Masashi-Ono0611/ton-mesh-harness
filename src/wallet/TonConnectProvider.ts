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

  async connect(): Promise<void> {
    await this.connectWallet()
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

  private async connectWallet(): Promise<void> {
    const wallets = (await this.connector.getWallets()).filter(isRemote)

    await this.connector.restoreConnection()
    if (this.connector.wallet) return

    const wallet = await this.ui.choose('Choose your wallet', wallets, (w) => w.name)
    this.ui.setActionPrompt('Connecting to wallet...')

    const url = this.connector.connect({
      universalLink: wallet.universalLink,
      bridgeUrl: wallet.bridgeUrl,
    }) as string

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
      messages: [
        {
          address: address.toString(),
          amount: amount.toString(),
          payload: payload?.toBoc().toString('base64'),
          stateInit: stateInit
            ? beginCell().storeWritable(storeStateInit(stateInit)).endCell().toBoc().toString('base64')
            : undefined,
        },
      ],
    })

    this.ui.clearActionPrompt()
    this.ui.write('Sent transaction\n')
    return result
  }
}
