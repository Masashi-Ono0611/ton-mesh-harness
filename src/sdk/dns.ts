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

/** Outcome the caller surfaces to the user / consumer. */
export interface DnsWriteResult {
  /**
   * The signed message BOC returned by TonConnect. NOT the on-chain tx
   * hash — that requires a follow-up TONAPI lookup. Surface as
   * `message_boc` in `next_actions`, not as `dns_tx_hash`.
   */
  message_boc: string | null
}

/**
 * Headless UI shim for the TonConnectProvider — the SDK does not write to
 * stdout. Choices auto-select by `preferByName` (matching the connector_name
 * the caller passed). Errors are SdkError-typed so callers can branch.
 */
function headlessWalletUI(preferByName: string): import('../wallet/ui').WalletUI {
  const wanted = preferByName.trim().toLowerCase()
  return {
    async choose<T>(_message: string, options: T[], display: (t: T) => string): Promise<T> {
      if (options.length === 0) {
        throw new SdkError('ERR_INVALID_INPUT', 'No TonConnect-compatible wallets available.', {
          severity: 'fatal',
        })
      }
      if (wanted) {
        const match = options.findIndex((o) => display(o).toLowerCase().includes(wanted))
        if (match >= 0) return options[match]
        const names = options.map(display).join(', ')
        throw new SdkError(
          'ERR_INVALID_INPUT',
          `No TonConnect wallet matches "${preferByName}". Available: ${names}.`,
          {
            severity: 'fatal',
            fixHint: `Pass wallet.connector as a substring of one of: ${names}.`,
          },
        )
      }
      return options[0]
    },
    async input(message: string): Promise<string> {
      throw new SdkError('ERR_INTERNAL', `Headless UI cannot prompt for "${message}"`, {
        severity: 'fatal',
      })
    },
    write(_message: string): void {
      /* swallow — SDK does not write to stdout */
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
 * Drive the TonConnect-mediated `.ton` DNS record write. Yields F3 event
 * phases in order:
 *   awaiting_signature (with signing_url) → dns_signing (after wallet
 *   returns the signed message) → dns_confirmed (after TONAPI polling
 *   sees the record) → verifying (TONAPI bag accessibility probe).
 *
 * The caller (deploy()) tracks `phase_at_cancel` / `bag_id` for F4
 * cancellation accuracy; this generator throws bare ERR_CANCELLED on
 * abort and the caller decorates with F4 `data`. `wallet.dispose()`
 * always runs via finally so the TonConnect bridge listener never leaks.
 */
export async function* writeDnsRecord(
  opts: DnsWriteOptions,
  control: DnsWriteControl = {},
): AsyncGenerator<DeployEvent, DnsWriteResult, void> {
  const checkAborted = () => {
    if (control.signal?.aborted) {
      throw new SdkError('ERR_CANCELLED', 'DNS write cancelled.', { severity: 'recoverable' })
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

  // ─── TonConnect setup ───────────────────────────────────────────────
  const storage = new FSStorage(getTonConnectStoragePath())
  const ui = headlessWalletUI(opts.connector_name ?? 'Tonkeeper')
  const wallet = new TonConnectProvider(
    storage,
    ui,
    opts.testnet ? 'testnet' : 'mainnet',
    TONCONNECT_MANIFEST_URL,
  )

  try {
    // ─── Connect: capture URL via hook, yield awaiting_signature ─────
    let urlResolve: (url: string) => void = () => {}
    const urlPromise = new Promise<string>((res) => {
      urlResolve = res
    })

    // wallet.connect either calls onConnectUrl (fresh session) or returns
    // immediately (restored session). We race the URL promise against the
    // completion promise so we always emit a sensible awaiting_signature.
    const connectPromise = wallet.connect((url) => urlResolve(url)).catch((err) => {
      // Rewrap headless-UI SdkErrors (already typed) and wallet-side
      // errors. Connection-time failures map to ERR_DNS_SIGN_REJECTED
      // EXCEPT input-class errors (no matching connector), which are
      // ERR_INVALID_INPUT via the headlessWalletUI throws.
      if (err instanceof SdkError) throw err
      throw new SdkError(
        'ERR_DNS_SIGN_REJECTED',
        `Wallet connection failed: ${err instanceof Error ? err.message : String(err)}`,
        { severity: 'fatal' },
      )
    })

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
      // Now actually wait for the wallet pairing to complete.
      await connectPromise
    } else {
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

    // ─── Send tx — phase STAYS awaiting_signature through the wallet ──
    // prompt + approval. Only AFTER sendTransactionMulti returns do we
    // yield dns_signing (= "tx submitted to chain"). Codex S2.5 review:
    // the prior ordering yielded dns_signing while the wallet UI was
    // still open, misleading consumers about the actual progress state.
    let txResult
    try {
      txResult = await wallet.sendTransactionMulti(messages)
    } catch (err) {
      if (err instanceof SdkError) throw err
      throw new SdkError(
        'ERR_DNS_SIGN_REJECTED',
        `Wallet rejected DNS write: ${err instanceof Error ? err.message : String(err)}`,
        { severity: 'fatal' },
      )
    }
    const messageBoc = (txResult as { boc?: string }).boc ?? null

    checkAborted()

    yield {
      phase: 'dns_signing',
      message: 'tx submitted; awaiting on-chain confirmation',
      data: { message_boc: messageBoc },
    }

    // ─── Poll TONAPI for record propagation ──────────────────────────
    const confirmedStorage = await pollDnsRecord(
      opts.domain,
      opts.bag_id,
      300_000,
      10_000,
      !!opts.testnet,
      { silent: true },
    )
    checkAborted()

    let confirmedSite = true
    if (opts.site_adnl) {
      confirmedSite = await pollDnsSiteRecord(
        opts.domain,
        opts.site_adnl,
        180_000,
        10_000,
        !!opts.testnet,
        { silent: true },
      )
      checkAborted()
    }

    if (!confirmedStorage || !confirmedSite) {
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
      data: {
        domain: opts.domain,
        bag_id: opts.bag_id,
        ...(opts.site_adnl ? { site_adnl: opts.site_adnl } : {}),
        message_boc: messageBoc,
      },
    }

    // ─── F3 verifying phase ─────────────────────────────────────────
    // The spec requires emitting `verifying` after `dns_confirmed`. We
    // don't run a separate gateway-fetch probe in rc2 — the TONAPI
    // pollers above ARE the verification. Yield the phase informationally
    // with a status note so downstream consumers can branch.
    yield {
      phase: 'verifying',
      message: 'DNS record propagated via TONAPI; downstream gateway resolution may still be settling',
      data: {
        verifier: 'tonapi',
        gateway_propagation_lag_minutes: 'usually 0-5',
      },
    }

    return { message_boc: messageBoc }
  } finally {
    // Always release the TonConnect bridge listener so Node's event loop
    // can drain. Without this, the SSE connection keeps the process
    // alive (the v0.6.3 fix the CLI's runDnsRegistration already had —
    // we replicate it here for symmetry).
    try {
      wallet.dispose()
    } catch {
      /* best-effort */
    }
  }
}
