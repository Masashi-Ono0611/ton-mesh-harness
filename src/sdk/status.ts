/**
 * `sovereign_status` SDK — one-shot snapshot of a bag's network state.
 *
 * Where `verifyBagOnNetwork` polls until accessible-or-timeout, `status()`
 * is a single TONAPI query plus an optional DNS-record read. Designed for
 * the post-deploy "is my bag propagated?" question agents ask.
 *
 * Spec: docs/v0.8/mcp-core-requirements.md §F2 (deferred sovereign_status,
 * landed in rc6).
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { extractStorageBagId, getDomainNftAddress } from '../dns'
import { getNetworkConfig } from '../network'
import { httpsGet } from '../utils/http'
import {
  StatusOptionsSchema,
  StatusResultSchema,
  type StatusOptions,
  type StatusResult,
} from './schemas'
import { SdkError } from './deploy'

interface TonApiBagResponse {
  status?: string
  size?: number
  file_count?: number
}

interface TonApiDnsResolveResponse {
  storage?: string | { bag_id?: string }
  sites?: string[]
}

/**
 * Two-shot probe — TONAPI returns 5xx during load spikes and one-shot
 * `bag_accessible: false` would mislead callers. A single retry after
 * a 1 s pause covers transient failures without blowing the "snapshot"
 * semantic out to a real poll loop (that's what `verifyBagOnNetwork`
 * is for). If both attempts fail, the result still absorbs into
 * `bag_accessible: false` rather than throwing — see status.ts header.
 */
async function probeBag(
  bagId: string,
  testnet: boolean,
): Promise<{
  accessible: boolean
  size: number | null
  files: number | null
  /** Reason the probe absorbed into accessible=false. null on success. */
  unavailable_reason: 'not_found' | 'network_error' | null
  /** Last error message from a thrown probe (network_error case). */
  last_error: string | null
}> {
  // TONAPI v2 storage-bag endpoint. The working route (mainnet-proven via
  // src/verify.ts since v0.3) is `/v2/storage/bag/{id}` — singular, NOT
  // `/v2/blockchain/storage/bags/...`. Drift between these two paths
  // landed in this module's first commit (caught by codex self-review
  // before any consumer hit it).
  const url = `${getNetworkConfig(testnet).tonapiUrl}/v2/storage/bag/${encodeURIComponent(bagId)}`
  let lastError: string | null = null
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const data = await httpsGet<TonApiBagResponse>(url, { timeout: 10_000 })
      if (data.status === 'not_found') {
        return {
          accessible: false,
          size: null,
          files: null,
          unavailable_reason: 'not_found',
          last_error: null,
        }
      }
      return {
        accessible: true,
        size: typeof data.size === 'number' ? data.size : null,
        files: typeof data.file_count === 'number' ? data.file_count : null,
        unavailable_reason: null,
        last_error: null,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt === 2) break
      await new Promise((r) => setTimeout(r, 1_000))
    }
  }
  return {
    accessible: false,
    size: null,
    files: null,
    unavailable_reason: 'network_error',
    last_error: lastError,
  }
}

async function probeDomain(
  domain: string,
  testnet: boolean,
): Promise<{
  nftAddress: string | null
  resolvedBagId: string | null
}> {
  let nftAddress: string | null = null
  try {
    const addr = await getDomainNftAddress(domain, testnet)
    nftAddress = addr.toString()
  } catch {
    nftAddress = null
  }
  const cleanDomain = domain.endsWith('.ton') ? domain : `${domain}.ton`
  const resolveUrl = `${getNetworkConfig(testnet).tonapiUrl}/v2/dns/${encodeURIComponent(
    cleanDomain,
  )}/resolve`
  let resolvedBagId: string | null = null
  try {
    const data = await httpsGet<TonApiDnsResolveResponse>(resolveUrl, { timeout: 10_000 })
    resolvedBagId = extractStorageBagId(data)
  } catch {
    resolvedBagId = null
  }
  return { nftAddress, resolvedBagId }
}

/**
 * Single-shot status snapshot.
 *
 * Throws `SdkError(ERR_INVALID_INPUT)` for malformed input (bag_id empty,
 * domain not a string). Network failures are absorbed — they surface as
 * `bag_accessible: false` (TONAPI 404 / timeout / DNS error etc.) rather
 * than thrown errors, because "is it propagated?" with no answer is
 * meaningfully different from "the SDK crashed."
 */
export async function status(rawInput: unknown): Promise<StatusResult> {
  let opts: StatusOptions
  try {
    opts = StatusOptionsSchema.parse(rawInput)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_INVALID_INPUT', `Invalid sovereign_status input: ${msg}`, {
      severity: 'fatal',
    })
  }

  const bag = await probeBag(opts.bag_id, opts.testnet)

  let domainBag: StatusResult['domain'] = null
  if (opts.domain) {
    const dom = await probeDomain(opts.domain, opts.testnet)
    const bagIdLc = opts.bag_id.toLowerCase()
    const resolvedLc = dom.resolvedBagId?.toLowerCase() ?? null
    domainBag = {
      name: opts.domain,
      nft_address: dom.nftAddress,
      resolved_bag_id: resolvedLc,
      matches: resolvedLc === bagIdLc,
    }
  }

  const result: StatusResult = {
    bag_id: opts.bag_id,
    bag_accessible: bag.accessible,
    bag_size_bytes: bag.size,
    bag_file_count: bag.files,
    bag_unavailable_reason: bag.unavailable_reason,
    domain: domainBag,
  }

  // Validate before returning (catches future schema drift on the
  // producer side — same pattern as deploy()'s output).
  return StatusResultSchema.parse(result)
}
