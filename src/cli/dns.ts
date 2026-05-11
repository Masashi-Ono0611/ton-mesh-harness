import chalk from 'chalk'
import type { Address } from '@ton/core'
import { createSpinnerFactory } from '../utils/spinner'
import {
  getDomainNftAddress,
  pollDnsRecord,
  pollDnsSiteRecord,
} from '../dns'
import { FSStorage } from '../wallet/FSStorage'
import { TonConnectProvider } from '../wallet/TonConnectProvider'
import { createWalletUI } from '../wallet/ui'
import { TONCONNECT_MANIFEST_URL, getTonConnectStoragePath } from '../wallet/constants'
import { buildDnsMessageBatch, DNS_UPDATE_AMOUNT_NANO } from '../sdk/dns-helpers'

interface DnsRegistrationOptions {
  testnet?: boolean
  jsonOutput?: boolean
  ciMode?: boolean
  walletName?: string  // preferred wallet (case-insensitive substring); default "Tonkeeper"
  siteAdnl?: string    // v0.6 B5: 64-hex ADNL → publish as `site` (dns_adnl_address)
}

export async function runDnsRegistration(
  domain: string,
  bagId: string,
  testnet = false,
  opts: DnsRegistrationOptions = {},
): Promise<void> {
  const isCI = process.env.CI === 'true' || opts.ciMode === true
  const jsonMode = !!opts.jsonOutput
  const interactive = !isCI && !jsonMode
  const createSpinner = createSpinnerFactory({ silent: jsonMode, plain: isCI })

  // In JSON mode the deploy step has already emitted the result JSON; any
  // additional human-readable progress here would corrupt the parseable
  // stdout for callers piping into `jq`. Suppress everything except the
  // wallet-driven sign step (which has its own TTY-only QR/picker UI).
  const log = jsonMode ? () => {} : console.log

  log()
  log(chalk.bold('🔗 DNS Registration'))
  log()

  const lookupSpinner = createSpinner.start(`Looking up ${domain}...`)
  let nftAddress: Address
  try {
    nftAddress = await getDomainNftAddress(domain, testnet)
    lookupSpinner.succeed(`Found NFT: ${nftAddress.toString()}`)
  } catch (err) {
    lookupSpinner.fail()
    throw err
  }

  // Build message payloads via the shared SDK helper. Always writes the
  // storage record; if --site-adnl is set, also bundles the site
  // (dns_adnl_address) record into the same wallet sign request.
  const messages = buildDnsMessageBatch(nftAddress, bagId, opts.siteAdnl)

  log(chalk.bold('📱 Sign DNS Registration'))
  log(chalk.dim(`  Domain:   ${domain}`))
  log(chalk.dim(`  NFT:      ${nftAddress.toString()}`))
  log(chalk.dim(`  storage:  ${bagId}`))
  if (opts.siteAdnl) {
    log(chalk.dim(`  site:     ${opts.siteAdnl} (dns_adnl_address)`))
  }
  const totalNano = DNS_UPDATE_AMOUNT_NANO * BigInt(messages.length)
  log(chalk.dim(`  Amount:   ${(Number(totalNano) / 1e9).toFixed(4)} TON (gas, ${messages.length} message${messages.length === 1 ? '' : 's'})`))
  log()

  const storage = new FSStorage(getTonConnectStoragePath())
  const ui = createWalletUI({
    interactive,
    preferByName: opts.walletName ?? 'Tonkeeper',
  })
  const wallet = new TonConnectProvider(
    storage,
    ui,
    testnet ? 'testnet' : 'mainnet',
    TONCONNECT_MANIFEST_URL,
  )

  try {
    try {
      await wallet.connect()
    } catch (err) {
      log(chalk.red('  ✗ Wallet connection failed.'))
      throw err
    }

    try {
      await wallet.sendTransactionMulti(messages)
    } catch (err) {
      log(chalk.red('  ✗ Transaction signing failed or was rejected.'))
      throw err
    }

    // In JSON mode we stop here: the wallet has sent the tx, the deploy
    // JSON already emitted to stdout, and polling would only add noise.
    // Humans see the propagation poller, CI parses the deploy JSON.
    if (jsonMode) return

    log()
    log(chalk.dim('  Polling TONAPI for DNS record propagation...'))
    const confirmedStorage = await pollDnsRecord(domain, bagId, 300_000, 10_000, testnet)

    let confirmedSite = true
    if (opts.siteAdnl) {
      confirmedSite = await pollDnsSiteRecord(domain, opts.siteAdnl, 180_000, 10_000, testnet)
    }

    log()
    if (confirmedStorage && confirmedSite) {
      log(chalk.green(`  ✅ ${domain} now points to your site!`))
      log(chalk.dim(`     https://${domain} (via TON DNS resolvers / TON Browser)`))
    } else {
      log(chalk.yellow(`  ⚠ ${domain} DNS update not fully confirmed via TONAPI.`))
      log(chalk.dim('    The wallet sent the transaction; the chain may still be settling, '))
      log(chalk.dim('    or TONAPI is lagging (especially for `sites` records).'))
    }
  } finally {
    // v0.6.3: pause the bridge listener so a `--no-watch` deploy actually
    // exits. Without this, Node's event loop is kept alive by the SSE
    // connection and the CLI hangs after printing the success message.
    wallet.dispose()
  }
}
