/**
 * `sovereign_site_record` SDK — build a Tonkeeper sign link that sets ONLY
 * the `site` (dns_adnl_address) record for a `.ton` domain.
 *
 * Unlike `deploy()` with a site ADNL (which bundles a `storage` write and
 * re-uploads a bag), this touches nothing but the site record: it resolves
 * the domain NFT, builds the `change_dns_record` body, and returns a
 * Tonkeeper transfer deeplink. No bag, no daemon, no TonConnect — the caller
 * opens the deeplink in Tonkeeper and approves once.
 *
 * This is the programmatic twin of the `site-record` CLI subcommand; both
 * render the same `SiteRecordResult`.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { buildChangeDnsSiteRecordBody } from '../dns'
import { buildTonkeeperTransferDeeplink, toBase64Url } from '../deeplink'
import { DNS_UPDATE_AMOUNT_NANO, resolveDomainNftOrThrow } from './dns-helpers'
import {
  SiteRecordOptionsSchema,
  SiteRecordResultSchema,
  type SiteRecordOptions,
  type SiteRecordResult,
} from './schemas'
import { SdkError } from './deploy'

/**
 * Build the site-record deeplink for a domain + ADNL identity.
 *
 * Throws `SdkError(ERR_INVALID_INPUT)` for malformed input (bad domain /
 * non-hex ADNL) and `SdkError(ERR_NO_DOMAIN)` when the domain NFT can't be
 * resolved via TONAPI. Does NOT broadcast anything — the returned deeplink
 * is what actually writes the record, once a wallet signs it.
 */
export async function siteRecord(rawInput: unknown): Promise<SiteRecordResult> {
  let opts: SiteRecordOptions
  try {
    opts = SiteRecordOptionsSchema.parse(rawInput)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_INVALID_INPUT', `Invalid sovereign_site_record input: ${msg}`, {
      severity: 'fatal',
    })
  }

  const nft = await resolveDomainNftOrThrow(
    opts.domain,
    opts.testnet,
    'Verify the domain is owned by the signing wallet and that TONAPI is reachable.',
  )
  const body = buildChangeDnsSiteRecordBody(opts.site_adnl, 0)
  const cleanDomain = opts.domain.endsWith('.ton') ? opts.domain : `${opts.domain}.ton`

  const result: SiteRecordResult = {
    domain: cleanDomain,
    nft_address: nft.toString({ testOnly: opts.testnet }),
    record: 'site',
    site_adnl: opts.site_adnl,
    amount_nano: DNS_UPDATE_AMOUNT_NANO.toString(),
    body_boc_base64url: toBase64Url(body.toBoc()),
    tonkeeper_deeplink: buildTonkeeperTransferDeeplink({
      to: nft,
      amountNano: DNS_UPDATE_AMOUNT_NANO,
      body,
      testnet: opts.testnet,
    }),
  }

  // Validate before returning (catches future schema drift on the producer
  // side — same pattern as status() / deploy()'s output).
  return SiteRecordResultSchema.parse(result)
}
