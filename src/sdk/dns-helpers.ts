/**
 * Shared helpers for `writeDnsRecord` (TonConnect) and
 * `writeDnsRecordAgentic`. Both paths converged on the same post-
 * broadcast pipeline:
 *
 *   resolve NFT address → build message batch → broadcast (path-specific)
 *   → kick off Toncenter tx-hash resolve in parallel → poll TONAPI for
 *   record propagation → await tx-hash with grace → yield dns_confirmed
 *   + verifying.
 *
 * Only the broadcast step + the awaiting_signature event differ by path
 * (TonConnect: QR/connector dance; agentic: filesystem-key sign+send).
 * Everything else was duplicated 2× pre-refactor. This module is the
 * dedup boundary.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { Address, type Cell } from '@ton/core'
import {
  buildChangeDnsRecordBody,
  buildChangeDnsSiteRecordBody,
  getDomainNftAddress,
  pollDnsRecord,
  pollDnsSiteRecord,
} from '../dns'
import { resolveTxHashFromMessageHash, type TxHashResolution } from './resolve-tx'
import { SdkError } from './deploy'
import type { AgenticNetwork } from './agentic-config'
import type { DeployEvent } from './schemas'

/**
 * 0.02 TON per DNS update message. v0.6.2 tuned. See cli/dns.ts for
 * the field-test rationale (compute fee ~0.0015 TON; 10× buffer).
 */
export const DNS_UPDATE_AMOUNT_NANO = 20_000_000n

// ─────────────────────────────────────────────────────────────────────────────
// NFT lookup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps `getDomainNftAddress` and re-throws TONAPI failures as
 * `ERR_NO_DOMAIN`. `ownershipFixHint` is appended to the fix_hint so
 * each path can point at its own wallet source (TonConnect: "signing
 * wallet"; agentic: "wallet at ${address}").
 */
export async function resolveDomainNftOrThrow(
  domain: string,
  testnet: boolean,
  ownershipFixHint: string,
): Promise<Address> {
  try {
    return await getDomainNftAddress(domain, testnet)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_NO_DOMAIN', `Could not resolve NFT for ${domain}: ${msg}`, {
      severity: 'fatal',
      fixHint: ownershipFixHint,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Message batch builder
// ─────────────────────────────────────────────────────────────────────────────

export interface DnsMessage {
  address: Address
  amount: bigint
  payload: Cell
}

/**
 * Build the `change_dns_record` op batch:
 *   - always: `storage` record → bag id
 *   - optional: `site` (ADNL) record → ADNL hex
 */
export function buildDnsMessageBatch(
  nftAddress: Address,
  bagId: string,
  siteAdnl: string | null | undefined,
): DnsMessage[] {
  const messages: DnsMessage[] = [
    {
      address: nftAddress,
      amount: DNS_UPDATE_AMOUNT_NANO,
      payload: buildChangeDnsRecordBody(bagId),
    },
  ]
  if (siteAdnl) {
    messages.push({
      address: nftAddress,
      amount: DNS_UPDATE_AMOUNT_NANO,
      payload: buildChangeDnsSiteRecordBody(siteAdnl, 0),
    })
  }
  return messages
}

// ─────────────────────────────────────────────────────────────────────────────
// TONAPI propagation poll
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll TONAPI for storage-record propagation; optionally also poll the
 * site (ADNL) record. Throws `ERR_DNS_TX_TIMEOUT` if either times out.
 *
 * `checkAborted` is called between polls so caller-side aborts
 * short-circuit the long TONAPI wait.
 *
 * `timeoutHint` is appended to the timeout error so each path can
 * include a path-specific identifier (e.g. agentic includes the
 * Toncenter message hash).
 */
export async function pollDnsConfirmationOrThrow(args: {
  domain: string
  bagId: string
  siteAdnl: string | null | undefined
  testnet: boolean
  /** Optional — called between polls to short-circuit on caller abort. */
  checkAborted?: () => void
  /** Optional — when omitted, the inner poller emits its own spinner. */
  silent?: boolean
  timeoutHint: string
}): Promise<void> {
  const silent = args.silent ?? true
  const noopCheck = args.checkAborted ?? (() => {})
  const confirmedStorage = await pollDnsRecord(
    args.domain,
    args.bagId,
    300_000,
    10_000,
    args.testnet,
    { silent },
  )
  noopCheck()

  let confirmedSite = true
  if (args.siteAdnl) {
    confirmedSite = await pollDnsSiteRecord(
      args.domain,
      args.siteAdnl,
      180_000,
      10_000,
      args.testnet,
      { silent },
    )
    noopCheck()
  }

  if (!confirmedStorage || !confirmedSite) {
    throw new SdkError(
      'ERR_DNS_TX_TIMEOUT',
      `DNS record for ${args.domain} did not propagate via TONAPI within window. ${args.timeoutHint}`,
      { severity: 'recoverable' },
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tx-hash resolve (parallel with TONAPI polling)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a best-effort Toncenter `transactionsByMessage` lookup in the
 * background. Returns a promise that resolves to the tx hash
 * (`0x<hex>`) when Toncenter has indexed, or `null` on timeout / error.
 *
 * Signal is chained from BOTH the caller's signal AND the internal
 * abort controller so early generator exit cancels the resolve cleanly.
 * The internal abort controller is what `finally` aborts to clean up
 * after success / early consumer break.
 *
 * Caller MUST pass the internal `txResolveAbort.signal` so the helper
 * can wire the chain. Returns the promise wrapped in `.catch(() => null)`
 * so unhandled rejection is impossible.
 */
export function kickoffTxHashResolve(args: {
  messageHashHex: string
  network: AgenticNetwork
  internalAbortSignal: AbortSignal
  callerSignal?: AbortSignal
  toncenterApiKey?: string
}): Promise<TxHashResolution> {
  const combiner = new AbortController()
  args.internalAbortSignal.addEventListener('abort', () => combiner.abort(), { once: true })
  args.callerSignal?.addEventListener('abort', () => combiner.abort(), { once: true })
  return resolveTxHashFromMessageHash(args.messageHashHex, args.network, {
    toncenter_api_key: args.toncenterApiKey,
    timeout_ms: 90_000,
    signal: combiner.signal,
  }).catch(() => ({ txHash: null, throttled: false }))
}

/**
 * Default grace the deploy waits for the parallel Toncenter tx-hash
 * resolver AFTER TONAPI confirms DNS propagation. Raised from 3s → 15s
 * (#117): when TONAPI propagates the storage record BEFORE Toncenter
 * indexes the tx — the inverse of the order `resolve-tx.ts` once assumed —
 * a 3s grace expired and left `dns_tx_hash` null on fully-successful
 * deploys. 15s lets Toncenter catch up in the common lagging case while
 * only ever adding latency to that case (the happy path returns early the
 * moment the resolver settles). It cannot eliminate the race, so the
 * tx-hash field stays best-effort / nullable by contract.
 */
export const TX_HASH_GRACE_MS = 15_000

/**
 * After TONAPI confirms DNS propagation, give the tx-hash resolver a grace
 * period. Returns whatever it has at the cutoff (real hash, or null if
 * Toncenter is still lagging beyond the grace).
 */
export function awaitTxHashWithGrace(
  resolvePromise: Promise<TxHashResolution>,
  graceMs = TX_HASH_GRACE_MS,
): Promise<TxHashResolution> {
  let timer: ReturnType<typeof setTimeout> | undefined
  // On the grace cutoff the resolver is still pending (Toncenter lagging, not
  // erroring) → throttled:false. A settled throttle result wins the race.
  const grace = new Promise<TxHashResolution>((r) => {
    timer = setTimeout(() => r({ txHash: null, throttled: false }), graceMs)
  })
  // clearTimeout when the resolver wins so the (now 15s) fallback timer
  // does NOT keep the Node event loop alive on the happy path (Codex P2).
  return Promise.race([resolvePromise, grace]).finally(() => clearTimeout(timer))
}

/**
 * Confirm a DNS write, preferring TONAPI propagation but falling back to an
 * AUTHORITATIVE on-chain check. `pollDnsConfirmationOrThrow` throws
 * `ERR_DNS_TX_TIMEOUT` when TONAPI's (flaky, cache-lagged) `/dns/resolve`
 * doesn't reflect the record within its window — yet the write may have landed.
 *
 * On that timeout we ask `verifyOnChain()`, which reads the NFT's `storage`
 * record directly via the `dnsresolve` get-method (`resolveStorageRecordOnChain`)
 * and returns true iff it equals the deployed bag. This proves the
 * `change_dns_record` ACTION succeeded — unlike trusting the resolved wallet tx
 * hash, which only proves the wallet's transaction was indexed (a non-owner
 * wallet's tx still indexes while the DNS never changes; #119 Codex-P1). Only a
 * timeout with NO on-chain confirmation surfaces the recoverable error.
 *
 * @throws the original `ERR_DNS_TX_TIMEOUT` when TONAPI lagged AND the on-chain
 *   record does not (yet) match; rethrows any other error unchanged.
 */
export async function confirmDnsWriteOrThrow(args: {
  poll: () => Promise<void>
  txHashResolvePromise: Promise<TxHashResolution>
  verifyOnChain: () => Promise<boolean>
}): Promise<{ txHash: string | null; throttled: boolean; viaChainFallback: boolean }> {
  try {
    await args.poll()
    const { txHash, throttled } = await awaitTxHashWithGrace(args.txHashResolvePromise)
    return { txHash, throttled, viaChainFallback: false }
  } catch (err) {
    if (!(err instanceof SdkError) || err.code !== 'ERR_DNS_TX_TIMEOUT') throw err
    // TONAPI propagation poll timed out — is the record on-chain anyway? The
    // verifier is best-effort: a throw inside it must NOT mask the recoverable
    // ERR_DNS_TX_TIMEOUT, so treat any verifier error as "not confirmed" (agy
    // review). The shipped verifier already never throws, but the helper is
    // generic — keep it robust to any callback.
    const landed = await args.verifyOnChain().catch(() => false)
    if (!landed) throw err
    const { txHash, throttled } = await awaitTxHashWithGrace(args.txHashResolvePromise)
    return { txHash, throttled, viaChainFallback: true }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase event builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the F3 `verifying` event. The data shape is identical for both
 * paths (verifier = TONAPI for both); only the human-readable `message`
 * differs slightly by path, so we expose it as a param.
 */
export function buildVerifyingEvent(message: string): DeployEvent {
  return {
    phase: 'verifying',
    message,
    data: {
      verifier: 'tonapi',
      gateway_propagation_lag_minutes: 'usually 0-5',
    },
  }
}

/**
 * Standard 5-minute future ISO timestamp for the
 * `awaiting_signature.data.expires_at_iso` field (TonConnect variant).
 * Defines how long the consumer should expect the wallet to wait for
 * approval before the request becomes stale. Not chain-enforced —
 * informational for the agent/UI.
 */
function signingExpiresAtIso(): string {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString()
}

/**
 * Build the F3 `awaiting_signature` event for the TonConnect path.
 * `signing_url` is either the live tonkeeper://... deeplink (fresh
 * session) or a sentinel for a restored session. Per
 * `AwaitingSignatureDataSchema.tonconnect`.
 */
export function buildAwaitingSignatureTonConnect(
  message: string,
  signingUrl: string,
): DeployEvent {
  return {
    phase: 'awaiting_signature',
    message,
    data: {
      signing_mode: 'tonconnect',
      signing_url: signingUrl,
      expires_at_iso: signingExpiresAtIso(),
    },
  }
}

/**
 * Build the F3 `awaiting_signature` event for the agentic path. Per
 * `AwaitingSignatureDataSchema.agentic` — `signing_url` is null
 * (no QR / external app), `wallet_label` is informational for the
 * agent's logs.
 */
export function buildAwaitingSignatureAgentic(
  message: string,
  walletLabel: string,
): DeployEvent {
  return {
    phase: 'awaiting_signature',
    message,
    data: {
      signing_mode: 'agentic',
      signing_url: null,
      wallet_label: walletLabel,
    },
  }
}
