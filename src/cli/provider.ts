import chalk from 'chalk'
import { Cell } from '@ton/core'
import { createSpinnerFactory } from '../utils/spinner'
import {
  fetchProviders,
  selectCheapestProvider,
  getBagSizeBytes,
  generateContractMessage,
  type Provider,
} from '../provider'
import { getNetworkConfig } from '../network'
import { httpsGet } from '../utils/http'
import { FSStorage } from '../wallet/FSStorage'
import { TonConnectProvider } from '../wallet/TonConnectProvider'
import { createWalletUI } from '../wallet/ui'
import { TONCONNECT_MANIFEST_URL, getTonConnectStoragePath } from '../wallet/constants'
import type { DaemonHandle } from '../daemon'

interface ProviderContractOptions {
  bagId: string
  providerArg: string | true   // address string or true (= auto)
  daemon: DaemonHandle
  testnet?: boolean
  jsonOutput?: boolean
  ciMode?: boolean
  spanSeconds?: number         // contract span in seconds (uint32); defaults to provider.ts DEFAULT_SPAN_SECONDS
}

export async function runProviderContract(opts: ProviderContractOptions): Promise<void> {
  const isCI = process.env.CI === 'true' || opts.ciMode === true
  const interactive = !isCI && !opts.jsonOutput
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

  // 3. Generate contract message (self-built BOC; bypasses daemon CLI uint8 cap)
  const msgSpinner = createSpinner.start('Generating provider contract message...')
  let contractMsg
  try {
    contractMsg = generateContractMessage(
      opts.bagId,
      sizeBytes,
      provider,
      opts.daemon,
      opts.spanSeconds,
    )
    const spanSeconds = Math.round(contractMsg.spanDays * 86400)
    msgSpinner.succeed(
      `Contract: ${spanSeconds}s (${contractMsg.spanDays.toFixed(4)} days) @ ` +
      `${contractMsg.rateTonPerGbYear.toFixed(2)} TON/GB/year`
    )
  } catch (err) {
    msgSpinner.fail()
    throw err
  }

  // 4. Connect a wallet via TonConnect SDK and send the transaction.
  //    Persistent session at ~/.ton-sovereign/tonconnect.json — re-runs reuse it.
  const amountTon = (Number(contractMsg.amountNano) / 1e9).toFixed(4)
  const spanSeconds = Math.round(contractMsg.spanDays * 86400)

  console.log()
  console.log(chalk.bold('💸 Storage Payment — Sign to Contract'))
  console.log(chalk.dim(`  Amount: ${amountTon} TON`))
  console.log(chalk.dim(`  Duration: ${spanSeconds} seconds (~${contractMsg.spanDays.toFixed(4)} days)`))
  console.log(chalk.dim(`  Provider: ${provider.address}`))
  console.log()

  const storage = new FSStorage(getTonConnectStoragePath())
  const ui = createWalletUI({ interactive })
  const wallet = new TonConnectProvider(storage, ui, 'mainnet', TONCONNECT_MANIFEST_URL)

  try {
    await wallet.connect()
  } catch (err) {
    console.log(chalk.red('  ✗ Wallet connection failed.'))
    throw err
  }

  const payloadCell = Cell.fromBoc(Buffer.from(contractMsg.bocBase64, 'base64'))[0]
  try {
    await wallet.sendTransaction(
      contractMsg.providerAddress,
      contractMsg.amountNano,
      payloadCell,
    )
  } catch (err) {
    console.log(chalk.red('  ✗ Transaction signing failed or was rejected.'))
    throw err
  }

  // 5. Optional: poll TONAPI to surface "contract active" once the provider has
  //    accepted and deployed the storage contract. This is no longer the
  //    sign-completion gate (the wallet's response above is) — purely
  //    confirmation. Default 5 min; increase if testing real-world propagation.
  console.log()
  console.log(chalk.dim('  Polling TONAPI for provider activation...'))
  const confirmed = await pollProviderContract(opts.bagId, provider.address, opts.testnet)
  console.log()
  if (confirmed) {
    console.log(chalk.green(`  ✅ Provider contract active! Your site is hosted 24/7.`))
    console.log(chalk.dim(`     Duration: ${spanSeconds} seconds`))
  } else {
    console.log(chalk.yellow('  ⚠ Provider contract not yet confirmed via TONAPI.'))
    console.log(chalk.dim('    The wallet sent the transaction; the provider may still be fetching the bag.'))
    console.log(chalk.dim(`    Re-check later: curl https://tonapi.io/v2/storage/bag/${opts.bagId}`))
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
