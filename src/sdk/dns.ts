/**
 * SDK DNS-write integration. Pulls the substance of `cli/dns.ts` into the
 * SDK so `deploy()` can emit `awaiting_signature → dns_signing →
 * dns_confirmed → verifying` and the MCP server's `sovereign_deploy`
 * tool can complete a `domain`-bearing deploy without the CLI.
 *
 * Spec: docs/v0.8/mcp-core-requirements.md §F3 (event ordering),
 * §F4 (cancellation), §F5 (ERR_DNS_*).
 *
 * NO `console.*` ANYWHERE IN THIS FILE — lint-enforced.
 */

import { Address, type Cell } from '@ton/core'
import {
  buildChangeDnsRecordBody,
  buildChangeDnsSiteRecordBody,
  getDomainNftAddress,
  pollDnsRecord,
  pollDnsSiteRecord,
} from '../dns'
import { FSStorage } from '../wallet/FSStorage'
import { TonConnectProvider } from '../wallet/TonConnectProvider'
import { TONCONNECT_MANIFEST_URL, getTonConnectStoragePath } from '../wallet/constants'
import { SdkError } from './deploy'
import type { DeployEvent } from './schemas'

// 0.02 TON per DNS update message. v0.6.2 tuned. See cli/dns.ts for
// the field-test rationale (compute fee ~0.0015 TON; 10× buffer).
const DNS_UPDATE_AMOUNT_NANO = 20_000_000n

export interface DnsWriteOptions {
  /** `.ton` domain (e.g. `"myprotocol.ton"`). */
  domain: string
  /** Bag id to publish in the `storage` DNS record. */
  bag_id: string
  /** Optional 64-hex ADNL to publish as the `site` DNS record. */
  site_adnl?: string | null
  /** Default false → mainnet. */
  testnet?: boolean
  /**
   * `Tonkeeper`, `MyTonWallet`, etc. — substring match against the
   * TonConnect manifest's wallet list. Defaults to `Tonkeeper`.
   */
  connector_name?: string
}

export interface DnsWriteControl {
  signal?: AbortSignal
}

/**
 * Headless UI shim for the TonConnectProvider — the SDK does not write to
 * stdout. Choices auto-select by `preferByName` (matching the connector_name
 * the caller passed). Errors throw rather than prompt.
 */
function headlessWalletUI(preferByName: string): import('../wallet/ui').WalletUI {
  const wanted = preferByName.trim().toLowerCase()
  return {
    async choose<T>(message: string, options: T[], display: (t: T) => string): Promise<T> {
      if (options.length === 0) throw new Error(`No options for "${message}"`)
      if (wanted) {
        const match = options.findIndex((o) => display(o).toLowerCase().includes(wanted))
        if (match >= 0) return options[match]
        const names = options.map(display).join(', ')
        throw new Error(`No wallet matches "${preferByName}" — available: ${names}`)
      }
      return options[0]
    },
    async input(message: string): Promise<string> {
      throw new Error(`Headless UI cannot prompt for "${message}"`)
    },
    write(_message: string): void {
      /* swallow — SDK doesn't write to stdout */
    },
    setActionPrompt(_message: string): void {
      /* swallow */
    },
    clearActionPrompt(): void {
      /* swallow */
    },
  }
}

/**
 * Drive the TonConnect-mediated `.ton` DNS record write. Yields the same
 * F3 event phases the SDK's `deploy()` generator embeds inline.
 *
 * The caller (deploy()) tracks `phase_at_cancel` / `bag_id` for F4
 * cancellation accuracy; this helper just bubbles SdkError out and lets
 * the caller decorate cancellations with the right phase.
 */
export async function* writeDnsRecord(
  opts: DnsWriteOptions,
  control: DnsWriteControl = {},
): AsyncGenerator<DeployEvent, { tx_hash: string | null }, void> {
  const checkAborted = () => {
    if (control.signal?.aborted) {
      throw new SdkError('ERR_CANCELLED', 'DNS write cancelled.', {
        severity: 'recoverable',
      })
    }
  }

  // ─── Resolve NFT address ─────────────────────────────────────────────
  let nftAddress: Address
  try {
    nftAddress = await getDomainNftAddress(opts.domain, !!opts.testnet)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_NO_DOMAIN', `Could not resolve NFT for ${opts.domain}: ${msg}`, {
      severity: 'fatal',
      fixHint:
        'Verify the domain is owned by the signing wallet and that TONAPI is reachable. ' +
        'Doctor: `npx ton-sovereign-deploy doctor`.',
    })
  }

  checkAborted()

  // ─── Build payloads ──────────────────────────────────────────────────
  const messages: Array<{ address: Address; amount: bigint; payload: Cell }> = [
    {
      address: nftAddress,
      amount: DNS_UPDATE_AMOUNT_NANO,
      payload: buildChangeDnsRecordBody(opts.bag_id),
    },
  ]
  if (opts.site_adnl) {
    messages.push({
      address: nftAddress,
      amount: DNS_UPDATE_AMOUNT_NANO,
      payload: buildChangeDnsSiteRecordBody(opts.site_adnl, 0),
    })
  }

  // ─── TonConnect: connect (emit awaiting_signature with signing_url) ─
  const storage = new FSStorage(getTonConnectStoragePath())
  const ui = headlessWalletUI(opts.connector_name ?? 'Tonkeeper')
  const wallet = new TonConnectProvider(
    storage,
    ui,
    opts.testnet ? 'testnet' : 'mainnet',
    TONCONNECT_MANIFEST_URL,
  )

  // We must emit awaiting_signature WITH the URL but we don't have the URL
  // until `wallet.connect()` calls our onConnectUrl hook. The trick: kick
  // off the connect first, capture the URL via the hook, yield, then
  // await the connect's resolution.
  let urlResolve: (url: string) => void = () => {}
  const urlPromise = new Promise<string>((res) => {
    urlResolve = res
  })

  // Start the connect — runs asynchronously. The hook fires synchronously
  // inside connectWallet() when the connect URL is generated.
  const connectPromise = wallet.connect((url) => urlResolve(url)).catch((err) => {
    // Rebrand connection failures so the outer caller can map them.
    throw new SdkError(
      'ERR_DNS_SIGN_REJECTED',
      `Wallet connection failed: ${err instanceof Error ? err.message : String(err)}`,
      { severity: 'fatal' },
    )
  })

  // If the wallet had a stored session, `connectWallet` returns immediately
  // without invoking onConnectUrl. We race the URL promise against the
  // connect-completed promise; whichever wins, we don't block forever.
  const urlOrConnected = await Promise.race([
    urlPromise.then((url) => ({ kind: 'url' as const, url })),
    connectPromise.then(() => ({ kind: 'connected' as const })),
  ])

  if (urlOrConnected.kind === 'url') {
    yield {
      phase: 'awaiting_signature',
      message: `open wallet to approve ${messages.length} DNS update message(s)`,
      data: {
        signing_mode: 'tonconnect',
        signing_url: urlOrConnected.url,
        expires_at_iso: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    }
    // Now wait for the actual wallet pairing.
    await connectPromise
  } else {
    // Already paired — emit awaiting_signature with a synthetic URL note
    // so consumers still see the phase (signing_url is the stored session
    // address since there's no fresh URL).
    yield {
      phase: 'awaiting_signature',
      message: `re-using paired wallet for ${messages.length} DNS update message(s)`,
      data: {
        signing_mode: 'tonconnect',
        signing_url: 'tonconnect://restored-session',
        expires_at_iso: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    }
  }

  checkAborted()

  // ─── Send tx (yield dns_signing → wait for tx hash) ──────────────────
  yield {
    phase: 'dns_signing',
    message: 'tx submitted to wallet; awaiting on-chain confirmation',
  }

  let txResult
  try {
    txResult = await wallet.sendTransactionMulti(messages)
  } catch (err) {
    wallet.dispose()
    throw new SdkError(
      'ERR_DNS_SIGN_REJECTED',
      `Wallet rejected DNS write: ${err instanceof Error ? err.message : String(err)}`,
      { severity: 'fatal' },
    )
  }

  // TonConnect's `boc` is a base64 of the signed external message — the
  // tx hash isn't directly exposed; we poll TONAPI to confirm the
  // `change_dns_record` op landed, and use the polled record as the
  // "confirmed" signal. The boc is informational.
  const txBoc = (txResult as { boc?: string }).boc ?? null

  checkAborted()

  // ─── Poll for propagation (yield dns_confirmed when done) ────────────
  // pollDnsRecord retries TONAPI lookups until the record matches the bag
  // id or the timeout fires. We give it 5 minutes for storage and 3
  // minutes for site (matches cli/dns.ts).
  const confirmedStorage = await pollDnsRecord(
    opts.domain,
    opts.bag_id,
    300_000,
    10_000,
    !!opts.testnet,
  )

  let confirmedSite = true
  if (opts.site_adnl) {
    confirmedSite = await pollDnsSiteRecord(
      opts.domain,
      opts.site_adnl,
      180_000,
      10_000,
      !!opts.testnet,
    )
  }

  if (!confirmedStorage || !confirmedSite) {
    wallet.dispose()
    throw new SdkError(
      'ERR_DNS_TX_TIMEOUT',
      `DNS record for ${opts.domain} did not propagate via TONAPI within window. ` +
        `The wallet sent the tx; chain may still be settling, or TONAPI is lagging.`,
      { severity: 'recoverable' },
    )
  }

  yield {
    phase: 'dns_confirmed',
    message: `${opts.domain} resolves to bag ${opts.bag_id.slice(0, 12)}…`,
    data: { domain: opts.domain, bag_id: opts.bag_id, ...(opts.site_adnl ? { site_adnl: opts.site_adnl } : {}) },
  }

  // ─── Dispose the TonConnect bridge listener (prevents hang) ──────────
  wallet.dispose()

  return { tx_hash: txBoc }
}
