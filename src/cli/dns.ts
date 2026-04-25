import chalk from 'chalk'
import { createSpinnerFactory } from '../utils/spinner'
import { getDomainNftAddress, buildTonConnectDeeplink, displayTonConnectQr, pollDnsRecord } from '../dns'

export async function runDnsRegistration(domain: string, bagId: string, testnet = false): Promise<void> {
  const isCI = process.env.CI === 'true'
  const createSpinner = createSpinnerFactory(isCI)

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

  const deeplink = buildTonConnectDeeplink(nftAddress, bagId)
  displayTonConnectQr(deeplink, domain)

  console.log(chalk.dim('  Waiting for you to sign the transaction...'))
  console.log(chalk.dim('  (Press Ctrl+C to skip DNS registration)'))
  console.log()

  await pollDnsRecord(domain, bagId, 300_000, 10_000, testnet)

  console.log()
  console.log(chalk.green(`  ✅ ${domain} now points to your site!`))
  console.log(chalk.dim(`     https://${domain} (via TON DNS resolvers)`))
}
