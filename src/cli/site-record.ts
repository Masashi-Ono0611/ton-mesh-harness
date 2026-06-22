import chalk from 'chalk'
import { siteRecord } from '../sdk/site-record'

export interface SiteRecordOptions {
  testnet?: boolean
  jsonOutput?: boolean
}

/**
 * `site-record <domain> <adnl-hex>` — print a Tonkeeper sign link that sets
 * ONLY the `site` (dns_adnl_address) record for a `.ton` domain.
 *
 * Thin renderer over the SDK's `siteRecord()` (the shared implementation the
 * MCP `mesh_site_record` tool also uses). Unlike `--site-adnl` on the
 * deploy path (which bundles a `storage` write and re-uploads a bag), this
 * touches nothing but the site record: no bag, no daemon, no TonConnect. The
 * user opens the printed deeplink in Tonkeeper and approves once.
 */
export async function runSiteRecord(
  domain: string,
  adnlHex: string,
  opts: SiteRecordOptions = {},
): Promise<void> {
  const result = await siteRecord({ domain, site_adnl: adnlHex, testnet: !!opts.testnet })

  if (opts.jsonOutput) {
    process.stdout.write(JSON.stringify(result) + '\n')
    return
  }

  console.log()
  console.log(chalk.bold('🔗 Site record (storage left untouched)'))
  console.log(chalk.dim(`  Domain: ${result.domain}`))
  console.log(chalk.dim(`  NFT:    ${result.nft_address}`))
  console.log(chalk.dim(`  site:   ${result.site_adnl} (dns_adnl_address)`))
  console.log(chalk.dim(`  Amount: ${(Number(result.amount_nano) / 1e9).toFixed(4)} TON (gas)`))
  console.log()
  console.log(chalk.bold('  Open in Tonkeeper to sign (one tap — no TonConnect, no daemon):'))
  console.log('  ' + chalk.cyan(result.tonkeeper_deeplink))
  console.log()
  console.log(
    chalk.dim('  This writes ONLY the `site` record — the `storage` (bag) record is left as-is.'),
  )
}
