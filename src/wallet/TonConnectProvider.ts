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
import { signRequestValidUntilSeconds } from './constants'

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

/**
 * `@tonconnect/sdk` v3.4.1 calls `console.debug('[TON_CONNECT_SDK]', ...)`
 * inside its bridge transport at request/response boundaries
 * (`node_modules/@tonconnect/sdk/lib/cjs/index.cjs:511, :1272, :1397, :1874, :1885`).
 * The arguments include the UNSIGNED PAYLOAD on send and the WALLET-SIGNED
 * BOC on receive. `console.debug` writes to stderr in Node — which means:
 *   1. CLI users reading stderr see signed wallet messages.
 *   2. MCP clients that capture stderr for diagnostics persist signed BOCs
 *      and pre-sign payloads to disk.
 * Codex pre-GA review round 7 caught this as a BLOCKER.
 *
 * Defence: swap `console.debug` for a no-op around every TonConnect SDK
 * API call (connect / sendTransaction / dispose / getWallets / restore).
 * Opt-in escape hatch via `TONCONNECT_DEBUG=1` for developers who actually
 * want the SDK's debug output (e.g. wallet integration debugging — they
 * already accept the leak in that mode).
 */
const noopDebug = (): void => { /* silenced for security — see header */ }

// Reference-counted silence. Codex pre-GA review round 8 caught a
// concurrency hole in the round-7 fix: a per-call save/restore would
// race if two TonConnect SDK calls overlap (e.g. dispose() while
// sendTransactionMulti() is awaiting a wallet response — the inner's
// finally restores console.debug to its captured value (which is
// already noop), reopening the leak for the outer call). The shared
// counter + module-level saved-original closes this: ANY caller in
// scope keeps the no-op active.
//
// Reentry safe: the entry that sees depth 0→1 captures the *real*
// original; subsequent overlapping entries just bump the count.
let quietDebugDepth = 0
let quietDebugSaved: typeof console.debug | null = null

// Exported for the concurrent-safety regression test. The real
// overlap shape (connect() async-await + dispose() sync mid-flight)
// is hard to mock without a full TonConnect bridge — testing the
// ref-counting helpers directly is the cheapest way to lock in the
// round-8 BLOCKER fix.
/** @internal */
export function _enterQuiet_FOR_TEST(): void { enterQuiet() }
/** @internal */
export function _leaveQuiet_FOR_TEST(): void { leaveQuiet() }

function enterQuiet(): void {
  if (process.env.TONCONNECT_DEBUG === '1') return
  if (quietDebugDepth === 0) {
    quietDebugSaved = console.debug
    console.debug = noopDebug
  }
  quietDebugDepth++
}

function leaveQuiet(): void {
  if (process.env.TONCONNECT_DEBUG === '1') return
  if (quietDebugDepth === 0) return // defensive: paired leave without entry
  quietDebugDepth--
  if (quietDebugDepth === 0 && quietDebugSaved !== null) {
    console.debug = quietDebugSaved
    quietDebugSaved = null
  }
}

async function withQuietTonConnect<T>(fn: () => Promise<T>): Promise<T> {
  enterQuiet()
  try {
    return await fn()
  } finally {
    leaveQuiet()
  }
}

function withQuietTonConnectSync<T>(fn: () => T): T {
  enterQuiet()
  try {
    return fn()
  } finally {
    leaveQuiet()
  }
}

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
      // Disable telemetry. Default 'telemetry' mode emits a
      // transaction-signed event including `signed_boc` to
      // `https://analytics.ton.org/events`. Codex pre-GA review round 7
      // MAJOR. The 'analytics' option is honoured by @tonconnect/sdk's
      // initAnalytics (lib/cjs/index.cjs:5846) — 'off' is a hard skip
      // before AnalyticsManager is constructed.
      analytics: { mode: 'off' },
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
    await withQuietTonConnect(() => this.connectWallet(onConnectUrl))
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
      withQuietTonConnectSync(() => this.connector.pauseConnection())
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
    // request. We use the shared signRequestValidUntilSeconds() helper
    // (5-minute window) so agentic + tonconnect paths converge.
    const validUntil = signRequestValidUntilSeconds()

    // Pin the chain explicitly so the wallet refuses if it is connected to a
    // different network — protects against signing a mainnet payment with a
    // testnet wallet and vice versa.
    const network = this.network === 'mainnet' ? CHAIN.MAINNET : CHAIN.TESTNET

    const result = await withQuietTonConnect(() =>
      this.connector.sendTransaction({
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
      }),
    )

    this.ui.clearActionPrompt()
    this.ui.write('Sent transaction\n')
    return result
  }
}
