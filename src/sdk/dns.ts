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

import { FSStorage } from '../wallet/FSStorage'
import { TonConnectProvider } from '../wallet/TonConnectProvider'
import { TONCONNECT_MANIFEST_URL, getTonConnectStoragePath } from '../wallet/constants'
import { agenticSignAndSend } from './agentic-sign'
import { loadAgenticConfig } from './agentic-config'
import { normalizedExternalInHashHex } from './resolve-tx'
import { networkFromTestnetFlag } from './endpoints'
import {
  awaitTxHashWithGrace,
  buildAwaitingSignatureAgentic,
  buildAwaitingSignatureTonConnect,
  buildDnsMessageBatch,
  buildVerifyingEvent,
  kickoffTxHashResolve,
  pollDnsConfirmationOrThrow,
  resolveDomainNftOrThrow,
} from './dns-helpers'
import { makeAbortChecker, safeAbort } from './abort'
import { SdkError } from './deploy'
import type { DeployEvent } from './schemas'

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
  /**
   * Real on-chain transaction hash, resolved via Toncenter v3's
   * `transactionsByMessage` lookup (computed from the BOC cell hash).
   * `null` if Toncenter's index hadn't caught up by the time the DNS
   * poll succeeded — `message_boc` is still the indexable identifier.
   */
  tx_hash: string | null
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
  const checkAborted = makeAbortChecker(control.signal, 'DNS write cancelled.')
  const network = networkFromTestnetFlag(opts.testnet)

  const nftAddress = await resolveDomainNftOrThrow(
    opts.domain,
    !!opts.testnet,
    'Verify the domain is owned by the signing wallet and that TONAPI is reachable. ' +
      'Doctor: `npx ton-sovereign-deploy doctor`.',
  )

  checkAborted()

  const messages = buildDnsMessageBatch(nftAddress, opts.bag_id, opts.site_adnl)

  // ─── TonConnect setup ───────────────────────────────────────────────
  const storage = new FSStorage(getTonConnectStoragePath())
  const ui = headlessWalletUI(opts.connector_name ?? 'Tonkeeper')
  const wallet = new TonConnectProvider(
    storage,
    ui,
    network,
    TONCONNECT_MANIFEST_URL,
  )

  // Hoisted so `finally` can abort an in-flight Toncenter poll on
  // generator exit (success, throw, or consumer break-early).
  const txResolveAbort = new AbortController()

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
      yield buildAwaitingSignatureTonConnect(
        `open wallet to approve ${messages.length} DNS update message(s)`,
        urlOrConnected.url,
      )
      // Now actually wait for the wallet pairing to complete.
      await connectPromise
    } else {
      yield buildAwaitingSignatureTonConnect(
        `re-using paired wallet for ${messages.length} DNS update message(s)`,
        'tonconnect://restored-session',
      )
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

    // ─── Resolve real tx hash in parallel with DNS poll (S2.7) ───────
    // TonConnect returns the full signed external-in message BOC. Per
    // TEP-467 (and Toncenter's `hash_norm` indexing), we MUST normalize
    // before hashing — the raw cell hash does NOT match Toncenter's
    // index. `normalizedExternalInHashHex` zeros src + import_fee and
    // re-hashes (Codex S2.7 review MAJOR 1 fix).
    let txHashResolvePromise: Promise<string | null> = Promise.resolve(null)
    if (messageBoc) {
      const bocHashHex = normalizedExternalInHashHex(messageBoc)
      if (bocHashHex) {
        txHashResolvePromise = kickoffTxHashResolve({
          messageHashHex: `0x${bocHashHex}`,
          network,
          internalAbortSignal: txResolveAbort.signal,
          callerSignal: control.signal,
        })
      }
    }

    await pollDnsConfirmationOrThrow({
      domain: opts.domain,
      bagId: opts.bag_id,
      siteAdnl: opts.site_adnl,
      testnet: !!opts.testnet,
      checkAborted,
      timeoutHint: 'The wallet sent the tx; chain may still be settling, or TONAPI is lagging.',
    })

    const txHash = await awaitTxHashWithGrace(txHashResolvePromise)

    yield {
      phase: 'dns_confirmed',
      message: `${opts.domain} resolves to bag ${opts.bag_id.slice(0, 12)}…`,
      data: {
        domain: opts.domain,
        bag_id: opts.bag_id,
        ...(opts.site_adnl ? { site_adnl: opts.site_adnl } : {}),
        message_boc: messageBoc,
        tx_hash: txHash,
      },
    }

    yield buildVerifyingEvent(
      'DNS record propagated via TONAPI; downstream gateway resolution may still be settling',
    )

    return { message_boc: messageBoc, tx_hash: txHash }
  } finally {
    // Cancel an in-flight Toncenter resolve poll if the generator
    // exits early (consumer break-early on for-await, propagation
    // timeout, etc.). The .catch(() => null) wrap upstream prevents
    // the abort from surfacing as an unhandled rejection.
    safeAbort(txResolveAbort)
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

// ─────────────────────────────────────────────────────────────────────────────
// Agentic path — autonomous signing via `~/.config/ton/config.json`
// ─────────────────────────────────────────────────────────────────────────────

export interface DnsWriteAgenticOptions {
  domain: string
  bag_id: string
  site_adnl?: string | null
  testnet?: boolean
  /** Optional override for the config file location. */
  config_path?: string
  /** Optional wallet selector (id, name, or address). */
  wallet_label?: string
}

export interface DnsWriteAgenticControl {
  signal?: AbortSignal
}

export interface DnsWriteAgenticResult {
  /** Normalized message hash (`0x<hex>`) returned by Toncenter. */
  message_hash: string
  /** Wallet address that sent the batch (user-friendly). */
  from_address: string
  /**
   * Real on-chain transaction hash (`0x<hex>`), resolved via Toncenter's
   * `transactionsByMessage` lookup. `null` if Toncenter's index hadn't
   * caught up to the broadcast by the time the DNS poll succeeded —
   * the message_hash is still the indexable identifier explorers use
   * and is surfaced in `next_actions`.
   */
  tx_hash: string | null
}

/**
 * Drive the agentic-wallet-signed `.ton` DNS record write. No human in
 * the loop — `awaiting_signature` is emitted informationally (so the
 * F3 phase contract stays consistent across paths) and resolves in
 * milliseconds because the signing key is read from disk.
 *
 * F4 cancellation: cancellation BEFORE `dns_signing` is safe
 * (`may_have_published: false`); cancellation AFTER `dns_signing`
 * implies the broadcast already left this process, so the caller
 * decorates with `may_have_published: true` (same as the TonConnect
 * path's post-awaiting_signature semantics).
 */
export async function* writeDnsRecordAgentic(
  opts: DnsWriteAgenticOptions,
  control: DnsWriteAgenticControl = {},
): AsyncGenerator<DeployEvent, DnsWriteAgenticResult, void> {
  const network = networkFromTestnetFlag(opts.testnet)
  const checkAborted = makeAbortChecker(control.signal, 'Agentic DNS write cancelled.')

  // Hoisted abort controller for the in-parallel Toncenter resolve.
  // Aborted in `finally` so an early exit cancels the resolver.
  const txResolveAbort = new AbortController()

  checkAborted()
  const selection = loadAgenticConfig({
    config_path: opts.config_path,
    wallet_label: opts.wallet_label,
    network,
  })

  try {
    const nftAddress = await resolveDomainNftOrThrow(
      opts.domain,
      !!opts.testnet,
      `Verify the domain is owned by ${selection.wallet.address} and that TONAPI is reachable.`,
    )
    checkAborted()

    const messages = buildDnsMessageBatch(nftAddress, opts.bag_id, opts.site_adnl)

    // ─── awaiting_signature: informational, near-instant for agentic ─────
    // The phase is kept for F3-contract parity with the TonConnect path.
    // `signing_url` is null per AwaitingSignatureDataSchema's agentic
    // variant — there's no QR / external app to open.
    const walletLabel = selection.wallet.name ?? selection.wallet.id
    // wallet_version exists on standard wallets only; agentic (NFT-delegated)
    // uses the @ton/mcp AgenticWallet contract version.
    const walletKindHint =
      selection.wallet.type === 'standard'
        ? selection.wallet.wallet_version
        : 'agentic-nft'
    yield buildAwaitingSignatureAgentic(
      `signing locally with ${walletLabel} (${walletKindHint})`,
      walletLabel,
    )

    // ─── F4 cancellation window ──────────────────────────────────────────
    // For agentic, unlike TonConnect, there's no human approval in between.
    // If the caller cancels between awaiting_signature and the broadcast,
    // no BOC has been sent yet — `may_have_published` must remain false.
    // Once `agenticSignAndSend` returns, the BOC IS at Toncenter and
    // may_have_published flips to true (via dnsBroadcastEnqueued in
    // deploy.ts upon seeing the dns_signing event below).
    checkAborted()

    const sent = await agenticSignAndSend({
      wallet: selection.wallet,
      toncenter_api_key: selection.toncenter_api_key,
      messages,
      signal: control.signal,
    })

    yield {
      phase: 'dns_signing',
      message: `tx submitted via Toncenter (${sent.message_hash}); awaiting confirmation`,
      data: {
        message_boc: null,
        message_hash: sent.message_hash,
        from_address: sent.from_address,
      },
    }

    // ─── Tx-hash resolve in parallel with DNS propagation poll ──────────
    const txHashResolvePromise = kickoffTxHashResolve({
      messageHashHex: sent.message_hash,
      network,
      internalAbortSignal: txResolveAbort.signal,
      callerSignal: control.signal,
      toncenterApiKey: selection.toncenter_api_key,
    })

    // Post-broadcast: even if the caller aborts, the BOC has hit
    // Toncenter; `may_have_published: true` is honest. checkAborted
    // here only short-circuits the long TONAPI poll.
    checkAborted()

    await pollDnsConfirmationOrThrow({
      domain: opts.domain,
      bagId: opts.bag_id,
      siteAdnl: opts.site_adnl,
      testnet: !!opts.testnet,
      checkAborted,
      timeoutHint: `Toncenter accepted the BOC (message_hash: ${sent.message_hash}); chain may still be settling.`,
    })

    const txHash = await awaitTxHashWithGrace(txHashResolvePromise)

    yield {
      phase: 'dns_confirmed',
      message: `${opts.domain} resolves to bag ${opts.bag_id.slice(0, 12)}…`,
      data: {
        domain: opts.domain,
        bag_id: opts.bag_id,
        ...(opts.site_adnl ? { site_adnl: opts.site_adnl } : {}),
        message_hash: sent.message_hash,
        tx_hash: txHash,
      },
    }

    yield buildVerifyingEvent('DNS record propagated via TONAPI')

    return {
      message_hash: sent.message_hash,
      from_address: sent.from_address,
      tx_hash: txHash,
    }
  } finally {
    // Cancel an in-flight Toncenter resolve poll if the generator
    // exits early. The .catch(() => null) wrap upstream prevents this
    // from surfacing as an unhandled rejection.
    safeAbort(txResolveAbort)
  }
}
