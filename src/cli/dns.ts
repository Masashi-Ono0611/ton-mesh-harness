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

// 0.05 TON gas for each DNS update message — matches the legacy hand-rolled
// deeplink amount. When --site-adnl is set we bundle two messages into a
// single sign request, so the wallet sees `2 * 0.05 = 0.10 TON` total.
const DNS_UPDATE_AMOUNT_NANO = 50_000_000n

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
  const interactive = !isCI && !opts.jsonOutput
  const createSpinner = createSpinnerFactory({ silent: !!opts.jsonOutput, plain: isCI })

  console.log()
  console.log(chalk.bold('🔗 DNS Registration'))
  console.log()

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

  console.log(chalk.bold('📱 Sign DNS Registration'))
  console.log(chalk.dim(`  Domain:   ${domain}`))
  console.log(chalk.dim(`  NFT:      ${nftAddress.toString()}`))
  console.log(chalk.dim(`  storage:  ${bagId}`))
  if (opts.siteAdnl) {
    console.log(chalk.dim(`  site:     ${opts.siteAdnl} (dns_adnl_address)`))
  }
  const totalNano = DNS_UPDATE_AMOUNT_NANO * BigInt(messages.length)
  console.log(chalk.dim(`  Amount:   ${(Number(totalNano) / 1e9).toFixed(4)} TON (gas, ${messages.length} message${messages.length === 1 ? '' : 's'})`))
  console.log()

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
    console.log(chalk.red('  ✗ Wallet connection failed.'))
    throw err
  }

  try {
    await wallet.sendTransactionMulti(messages)
  } catch (err) {
    console.log(chalk.red('  ✗ Transaction signing failed or was rejected.'))
    throw err
  }

  console.log()
  console.log(chalk.dim('  Polling TONAPI for DNS record propagation...'))
  const confirmedStorage = await pollDnsRecord(domain, bagId, 300_000, 10_000, testnet)

  let confirmedSite = true
  if (opts.siteAdnl) {
    confirmedSite = await pollDnsSiteRecord(domain, opts.siteAdnl, 180_000, 10_000, testnet)
  }

  console.log()
  if (confirmedStorage && confirmedSite) {
    console.log(chalk.green(`  ✅ ${domain} now points to your site!`))
    console.log(chalk.dim(`     https://${domain} (via TON DNS resolvers / TON Browser)`))
  } else {
    console.log(chalk.yellow(`  ⚠ ${domain} DNS update not fully confirmed via TONAPI.`))
    console.log(chalk.dim('    The wallet sent the transaction; the chain may still be settling, '))
    console.log(chalk.dim('    or TONAPI is lagging (especially for `sites` records).'))
  }
}
