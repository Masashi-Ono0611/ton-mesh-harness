import chalk from 'chalk'
import { createSpinnerFactory } from '../utils/spinner'
import { getDomainNftAddress, buildChangeDnsRecordBody, pollDnsRecord } from '../dns'
import { FSStorage } from '../wallet/FSStorage'
import { TonConnectProvider } from '../wallet/TonConnectProvider'
import { createWalletUI } from '../wallet/ui'
import { TONCONNECT_MANIFEST_URL, getTonConnectStoragePath } from '../wallet/constants'

// 0.05 TON gas for the DNS update message — matches the legacy hand-rolled
// deeplink amount we used to embed in the request payload.
const DNS_UPDATE_AMOUNT_NANO = 50_000_000n

interface DnsRegistrationOptions {
  testnet?: boolean
  jsonOutput?: boolean
  ciMode?: boolean
  walletName?: string  // preferred wallet (case-insensitive substring); default "Tonkeeper"
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
  let nftAddress
  try {
    nftAddress = await getDomainNftAddress(domain, testnet)
    lookupSpinner.succeed(`Found NFT: ${nftAddress.toString()}`)
  } catch (err) {
    lookupSpinner.fail()
    throw err
  }

  // Build the change_dns_record message body in TS, then sign it via TonConnect.
  const payload = buildChangeDnsRecordBody(bagId)

  console.log(chalk.bold('📱 Sign DNS Registration'))
  console.log(chalk.dim(`  Domain:  ${domain}`))
  console.log(chalk.dim(`  NFT:     ${nftAddress.toString()}`))
  console.log(chalk.dim(`  Bag ID:  ${bagId}`))
  console.log(chalk.dim(`  Amount:  ${(Number(DNS_UPDATE_AMOUNT_NANO) / 1e9).toFixed(4)} TON (gas)`))
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
    await wallet.sendTransaction(nftAddress, DNS_UPDATE_AMOUNT_NANO, payload)
  } catch (err) {
    console.log(chalk.red('  ✗ Transaction signing failed or was rejected.'))
    throw err
  }

  console.log()
  console.log(chalk.dim('  Polling TONAPI for DNS record propagation...'))
  const confirmed = await pollDnsRecord(domain, bagId, 300_000, 10_000, testnet)

  console.log()
  if (confirmed) {
    console.log(chalk.green(`  ✅ ${domain} now points to your site!`))
    console.log(chalk.dim(`     https://${domain} (via TON DNS resolvers)`))
  } else {
    console.log(chalk.yellow(`  ⚠ ${domain} DNS update not yet confirmed.`))
    console.log(chalk.dim('    The wallet sent the transaction; the chain may still be settling.'))
  }
}
