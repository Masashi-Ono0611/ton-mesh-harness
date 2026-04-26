import chalk from 'chalk'
import { createSpinnerFactory } from '../utils/spinner'
import {
  fetchProviders,
  selectCheapestProvider,
  getBagSizeBytes,
  generateContractMessage,
  type Provider,
} from '../provider'
import { buildTonConnectDeeplink, displayTonConnectQr } from '../dns'
import { getNetworkConfig } from '../network'
import { httpsGet } from '../utils/http'
import type { DaemonHandle } from '../daemon'

interface ProviderContractOptions {
  bagId: string
  providerArg: string | true   // address string or true (= auto)
  daemon: DaemonHandle
  testnet?: boolean
  jsonOutput?: boolean
}

export async function runProviderContract(opts: ProviderContractOptions): Promise<void> {
  const isCI = process.env.CI === 'true'
  const createSpinner = createSpinnerFactory(isCI || opts.jsonOutput)

  console.log()
  console.log(chalk.bold('📦 Storage Provider Contract'))
  console.log()

  // Storage provider contracts are a mainnet-only feature.
  // Testnet "providers" listed on testnet.tonapi.io have zero overlap with
  // mainnet and their ADNL nodes are not reachable — they are test entries only.
  if (opts.testnet) {
    console.log(chalk.yellow('  ⚠ --provider is not supported on testnet.'))
    console.log(chalk.dim('    Storage provider infrastructure only runs on mainnet.'))
    console.log(chalk.dim('    Re-run without --testnet to contract with a real provider.'))
    console.log()
    return
  }

  // 1. Resolve provider
  const resolveSpinner = createSpinner.start(
    opts.providerArg === true
      ? 'Finding cheapest storage provider...'
      : `Fetching provider info...`
  )

  let provider: Provider
  try {
    if (opts.providerArg === true) {
      const providers = await fetchProviders(opts.testnet)
      provider = selectCheapestProvider(providers)
      resolveSpinner.succeed(
        `Selected provider: ${provider.address.slice(0, 20)}... ` +
        `(${provider.ratePerMbDay} nanoTON/MB/day)`
      )
    } else {
      const providers = await fetchProviders(opts.testnet)
      const found = providers.find(p => p.address === opts.providerArg)
      if (!found) {
        // Use given address with rate from TONAPI (may not be in list if paused)
        provider = {
          address: opts.providerArg,
          ratePerMbDay: 0,
          maxSpan: 86400,
        }
        resolveSpinner.warn(`Provider ${opts.providerArg.slice(0, 20)}... not in active list — proceeding anyway`)
      } else {
        provider = found
        resolveSpinner.succeed(`Provider: ${provider.address.slice(0, 20)}...`)
      }
    }
  } catch (err) {
    resolveSpinner.fail()
    throw err
  }

  // 2. Get bag size
  const sizeSpinner = createSpinner.start('Reading bag size...')
  const sizeBytes = getBagSizeBytes(opts.bagId, opts.daemon)
  const sizeMb = (sizeBytes / 1_000_000).toFixed(2)
  sizeSpinner.succeed(`Bag size: ${sizeMb} MB`)

  // 3. Generate contract message
  const msgSpinner = createSpinner.start('Generating provider contract message...')
  let contractMsg
  try {
    contractMsg = generateContractMessage(opts.bagId, sizeBytes, provider, opts.daemon)
    const spanSeconds = Math.round(contractMsg.spanDays * 86400)
    msgSpinner.succeed(
      `Contract: ${spanSeconds}s (${contractMsg.spanDays.toFixed(4)} days) @ ` +
      `${contractMsg.rateTonPerGbYear.toFixed(2)} TON/GB/year`
    )
  } catch (err) {
    msgSpinner.fail()
    throw err
  }

  // 4. Display TON Connect QR
  const amountTon = (Number(contractMsg.amountNano) / 1e9).toFixed(4)
  const deeplink = buildTonConnectDeeplink(contractMsg.providerAddress, opts.bagId, {
    amountNano: contractMsg.amountNano.toString(),
    payloadBase64: contractMsg.bocBase64,
  })

  console.log()
  console.log(chalk.bold('💸 Storage Payment — Sign to Contract'))
  console.log(chalk.dim(`  Amount: ${amountTon} TON`))
  const spanSeconds = Math.round(contractMsg.spanDays * 86400)
  console.log(chalk.dim(`  Duration: ${spanSeconds} seconds (~${contractMsg.spanDays.toFixed(4)} days)`))
  displayTonConnectQr(deeplink, provider.address)

  console.log(chalk.bold('  TON Connect URL (open on mobile or paste in Tonkeeper):'))
  console.log()
  console.log(chalk.cyan(`  ${deeplink}`))
  console.log()
  console.log(chalk.dim('  Waiting for you to sign the transaction...'))
  console.log(chalk.dim('  (Press Ctrl+C to skip provider contract)'))
  console.log()

  // 5. Poll for contract activation
  const confirmed = await pollProviderContract(opts.bagId, provider.address, opts.testnet)

  console.log()
  if (confirmed) {
    console.log(chalk.green(`  ✅ Provider contract active! Your site is hosted 24/7.`))
    console.log(chalk.dim(`     Duration: ${Math.round(contractMsg.spanDays * 86400)} seconds`))
  } else {
    console.log(chalk.yellow('  ⚠ Provider contract not yet confirmed.'))
    console.log(chalk.dim('    Sign the transaction in your wallet, then wait a few minutes.'))
  }
}

// -----------------------------------------------------------------------
// Poll TONAPI until provider contract is visible for this bag
// -----------------------------------------------------------------------

interface TonApiBagInfo {
  status?: string
  providers?: Array<{ address: string }>
}

async function pollProviderContract(
  bagId: string,
  providerAddress: string,
  testnet = false,
  timeoutMs = 300_000,
  intervalMs = 10_000,
): Promise<boolean> {
  const base = getNetworkConfig(testnet).tonapiUrl
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const data = await httpsGet<TonApiBagInfo>(
        `${base}/v2/storage/bag/${encodeURIComponent(bagId)}`,
        { timeout: 5_000 }
      )
      const providers = data.providers ?? []
      if (providers.some(p => p.address === providerAddress)) return true
    } catch { /* retry */ }
    if (Date.now() + intervalMs < deadline) await sleep(intervalMs)
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
