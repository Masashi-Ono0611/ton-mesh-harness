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

async function probeBag(
  bagId: string,
  testnet: boolean,
): Promise<{
  accessible: boolean
  size: number | null
  files: number | null
}> {
  // TONAPI v2 storage-bag endpoint. The working route (mainnet-proven via
  // src/verify.ts since v0.3) is `/v2/storage/bag/{id}` — singular, NOT
  // `/v2/blockchain/storage/bags/...`. Drift between these two paths
  // landed in this module's first commit (caught by codex self-review
  // before any consumer hit it).
  const url = `${getNetworkConfig(testnet).tonapiUrl}/v2/storage/bag/${encodeURIComponent(bagId)}`
  try {
    const data = await httpsGet<TonApiBagResponse>(url, { timeout: 10_000 })
    const accessible = data.status !== 'not_found'
    return {
      accessible,
      size: accessible && typeof data.size === 'number' ? data.size : null,
      files: accessible && typeof data.file_count === 'number' ? data.file_count : null,
    }
  } catch {
    return { accessible: false, size: null, files: null }
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
    domain: domainBag,
  }

  // Validate before returning (catches future schema drift on the
  // producer side — same pattern as deploy()'s output).
  return StatusResultSchema.parse(result)
}
