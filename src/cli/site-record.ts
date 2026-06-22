import chalk from 'chalk'
import { buildChangeDnsSiteRecordBody, getDomainNftAddress } from '../dns'
import { buildTonkeeperTransferDeeplink, toBase64Url } from '../deeplink'
import { DNS_UPDATE_AMOUNT_NANO } from '../sdk/dns-helpers'

export interface SiteRecordOptions {
  testnet?: boolean
  jsonOutput?: boolean
}

/**
 * `site-record <domain> <adnl-hex>` — produce a Tonkeeper sign link that sets
 * ONLY the `site` (dns_adnl_address) record for a `.ton` domain.
 *
 * Unlike `--site-adnl` on the deploy path (which bundles a `storage` write
 * and re-uploads a bag), this touches nothing but the site record: no bag,
 * no daemon, no TonConnect. The user opens the printed deeplink in Tonkeeper
 * and approves once. This is the standalone path used to point a domain at a
 * resident rldp-http-proxy ADNL identity.
 */
export async function runSiteRecord(
  domain: string,
  adnlHex: string,
  opts: SiteRecordOptions = {},
): Promise<void> {
  // Validate / canonicalize the ADNL hex — same shape gate as `--site-adnl`.
  const cleaned = /^0x/i.test(adnlHex) ? adnlHex.slice(2) : adnlHex
  if (!/^[0-9a-f]{64}$/i.test(cleaned)) {
    throw new Error(
      `<adnl-hex> must be a 64-character hex string (256-bit ADNL identity); got ${JSON.stringify(adnlHex)}`,
    )
  }
  const adnl = cleaned.toLowerCase()
  const testnet = !!opts.testnet

  const nft = await getDomainNftAddress(domain, testnet)
  const body = buildChangeDnsSiteRecordBody(adnl, 0)
  const amountNano = DNS_UPDATE_AMOUNT_NANO
  const deeplink = buildTonkeeperTransferDeeplink({ to: nft, amountNano, body, testnet })
  const cleanDomain = domain.endsWith('.ton') ? domain : `${domain}.ton`

  if (opts.jsonOutput) {
    process.stdout.write(
      JSON.stringify({
        domain: cleanDomain,
        nft: nft.toString({ testOnly: testnet }),
        record: 'site',
        site_adnl: adnl,
        amount_nano: amountNano.toString(),
        body_boc_base64url: toBase64Url(body.toBoc()),
        tonkeeper_deeplink: deeplink,
      }) + '\n',
    )
    return
  }

  console.log()
  console.log(chalk.bold('🔗 Site record (storage left untouched)'))
  console.log(chalk.dim(`  Domain: ${cleanDomain}`))
  console.log(chalk.dim(`  NFT:    ${nft.toString({ testOnly: testnet })}`))
  console.log(chalk.dim(`  site:   ${adnl} (dns_adnl_address)`))
  console.log(chalk.dim(`  Amount: ${(Number(amountNano) / 1e9).toFixed(4)} TON (gas)`))
  console.log()
  console.log(chalk.bold('  Open in Tonkeeper to sign (one tap — no TonConnect, no daemon):'))
  console.log('  ' + chalk.cyan(deeplink))
  console.log()
  console.log(
    chalk.dim('  This writes ONLY the `site` record — the `storage` (bag) record is left as-is.'),
  )
}
