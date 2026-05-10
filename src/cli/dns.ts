import chalk from 'chalk'
import type { Address, Cell } from '@ton/core'
import { createSpinnerFactory } from '../utils/spinner'
import {
  buildChangeDnsRecordBody,
  buildChangeDnsSiteRecordBody,
  getDomainNftAddress,
  pollDnsRecord,
  pollDnsSiteRecord,
} from '../dns'
import { FSStorage } from '../wallet/FSStorage'
import { TonConnectProvider } from '../wallet/TonConnectProvider'
import { createWalletUI } from '../wallet/ui'
import { TONCONNECT_MANIFEST_URL, getTonConnectStoragePath } from '../wallet/constants'

// 0.02 TON per DNS update message. Reduced from 0.05 TON in v0.6.2 after
// observing the live tx burn for change_dns_record (8419 gas + storage
// fees ≈ 0.0015 TON total — recorded on the masashi-ono0611.ton tier-3.1
// soak). 0.02 keeps a >10× compute-fee buffer, matches Tonkeeper's own UI
// default for DNS edits, and shrinks the per-call "stuck in NFT balance"
// excess from ~0.048 TON to ~0.018 TON. When --site-adnl is set we bundle
// two messages, so the wallet sees `2 * 0.02 = 0.04 TON` total.
const DNS_UPDATE_AMOUNT_NANO = 20_000_000n

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

  // Build message payloads. Always write the storage record. When
  // --site-adnl is set, also write the site (dns_adnl_address) record in
  // the same TonConnect tx so the user signs once.
  const storagePayload = buildChangeDnsRecordBody(bagId)
  const messages: Array<{ address: Address; amount: bigint; payload: Cell }> = [
    { address: nftAddress, amount: DNS_UPDATE_AMOUNT_NANO, payload: storagePayload },
  ]
  if (opts.siteAdnl) {
    const sitePayload = buildChangeDnsSiteRecordBody(opts.siteAdnl, 0)
    messages.push({ address: nftAddress, amount: DNS_UPDATE_AMOUNT_NANO, payload: sitePayload })
  }

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

  // In JSON mode we stop here: the wallet has sent the tx, the deploy JSON
  // already emitted to stdout, and polling would only add noise. Humans
  // see the propagation poller, CI parses the deploy JSON.
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
}
