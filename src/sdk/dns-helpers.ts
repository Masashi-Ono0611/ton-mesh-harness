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
import { resolveTxHashFromMessageHash } from './resolve-tx'
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
}): Promise<string | null> {
  const combiner = new AbortController()
  args.internalAbortSignal.addEventListener('abort', () => combiner.abort(), { once: true })
  args.callerSignal?.addEventListener('abort', () => combiner.abort(), { once: true })
  return resolveTxHashFromMessageHash(args.messageHashHex, args.network, {
    toncenter_api_key: args.toncenterApiKey,
    timeout_ms: 90_000,
    signal: combiner.signal,
  }).catch(() => null)
}

/**
 * After TONAPI confirms DNS propagation, give the tx-hash resolver
 * a short grace period. Returns whatever it has at the cutoff (real
 * hash, or null if Toncenter is still lagging beyond the grace).
 */
export function awaitTxHashWithGrace(
  resolvePromise: Promise<string | null>,
  graceMs = 3_000,
): Promise<string | null> {
  return Promise.race([
    resolvePromise,
    new Promise<null>((r) => setTimeout(() => r(null), graceMs)),
  ])
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
