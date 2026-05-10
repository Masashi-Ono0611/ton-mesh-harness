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
  walletName?: string          // preferred wallet (case-insensitive substring); default "Tonkeeper"
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

  // 1. Read bag size first — we need it to filter providers by their
  //    minimal_file_size / maximal_file_size before sign.
  const sizeSpinner = createSpinner.start('Reading bag size...')
  const sizeBytes = getBagSizeBytes(opts.bagId, opts.daemon)
  const sizeMb = (sizeBytes / 1_000_000).toFixed(2)
  sizeSpinner.succeed(`Bag size: ${sizeMb} MB (${sizeBytes} bytes)`)

  // 2. Resolve provider, scoped to those that accept this bag size.
  const resolveSpinner = createSpinner.start(
    opts.providerArg === true
      ? 'Finding cheapest storage provider for this bag size...'
      : `Fetching provider info...`
  )

  let provider: Provider
  try {
    if (opts.providerArg === true) {
      const providers = await fetchProviders(opts.testnet, { sizeBytes })
      if (providers.length === 0) {
        throw new Error(
          `No active provider accepts a ${sizeBytes}-byte bag. ` +
          `Pad your bag (most providers require ≥ 1024 bytes) or pass --provider <address> manually.`,
        )
      }
      provider = selectCheapestProvider(providers)
      resolveSpinner.succeed(
        `Selected provider: ${provider.address.slice(0, 20)}... ` +
        `(${provider.ratePerMbDay} nanoTON/MB/day, file range ${provider.minimalFileSize}–${provider.maximalFileSize} bytes)`
      )
    } else {
      const providers = await fetchProviders(opts.testnet)
      const found = providers.find(p => p.address === opts.providerArg)
      if (!found) {
        // Use given address with sentinel params (TONAPI didn't list it).
        // Zero sentinels disable the size/span guards so the user can proceed.
        provider = {
          address: opts.providerArg,
          ratePerMbDay: 0,
          maxSpan: 0,
          minimalFileSize: 0,
          maximalFileSize: 0,
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

  // Belt and suspenders: refuse to send a sign request that asks for more
  // than 1 TON. Rounds 4–5 surfaced ways for the auto-pricing to land at
  // 10+ TON when input data was off; an explicit hard cap stops bad combos
  // before they hit the user's wallet UI. The user can pass --provider
  // <addr> to a known-cheap provider if they really want larger amounts.
  const ABORT_AMOUNT_NANO = 1_000_000_000n  // 1 TON
  if (contractMsg.amountNano > ABORT_AMOUNT_NANO) {
    throw new Error(
      `Refusing to request ${amountTon} TON — exceeds the 1 TON safety cap. ` +
      `Likely cause: provider rate or bag size is anomalous (rate=` +
      `${provider.ratePerMbDay} nano/MB/day, size=${sizeBytes} bytes). ` +
      `Pass --provider <addr> to override or pad your bag.`,
    )
  }

  console.log()
  console.log(chalk.bold('💸 Storage Payment — Sign to Contract'))
  console.log(chalk.dim(`  Amount: ${amountTon} TON`))
  console.log(chalk.dim(`  Duration: ${spanSeconds} seconds (~${contractMsg.spanDays.toFixed(4)} days)`))
  console.log(chalk.dim(`  Provider: ${provider.address}`))
  console.log()

  const storage = new FSStorage(getTonConnectStoragePath())
  const ui = createWalletUI({
    interactive,
    preferByName: opts.walletName ?? 'Tonkeeper',
  })
  const wallet = new TonConnectProvider(storage, ui, 'mainnet', TONCONNECT_MANIFEST_URL)

  try {
    await wallet.connect()
  } catch (err) {
    console.log(chalk.red('  ✗ Wallet connection failed.'))
    throw err
  }

  const cells = Cell.fromBoc(Buffer.from(contractMsg.bocBase64, 'base64'))
  if (cells.length === 0) {
    throw new Error('Failed to parse contract message BOC — refusing to sign with empty payload.')
  }
  const payloadCell = cells[0]
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

  // 5. Keep daemon alive while the provider fetches our bag and deploys the
  //    contract. The CLI will continue seeding via ADNL until either:
  //      - TONAPI shows the contract active (early exit, ✅), or
  //      - 10 minutes elapse (warn and exit)
  //    The 5-min lower bound previously used here was too short for the
  //    provider to find and pull the bag; 10 min gives it room without
  //    holding the user's terminal hostage.
  console.log()
  console.log(chalk.dim('  Daemon staying alive while the provider fetches your bag...'))
  console.log(chalk.dim('  (Polling TONAPI for activation — Ctrl+C is safe once you see ✅)'))
  const confirmed = await pollProviderContract(
    opts.bagId,
    provider.address,
    opts.testnet,
    10 * 60 * 1000,
    15 * 1000,
  )
  console.log()
  if (confirmed) {
    console.log(chalk.green(`  ✅ Provider contract active! Your site is hosted 24/7.`))
    console.log(chalk.dim(`     Duration: ${spanSeconds} seconds`))
  } else {
    console.log(chalk.yellow('  ⚠ Provider contract not yet confirmed via TONAPI after 10 minutes.'))
    console.log(chalk.dim('    The wallet did sign the transaction; the provider may still be working on it.'))
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
