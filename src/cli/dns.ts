import chalk from 'chalk'
import { resolveCliOutputMode } from './output-mode'
import { FSStorage } from '../wallet/FSStorage'
import { TonConnectProvider } from '../wallet/TonConnectProvider'
import { createWalletUI } from '../wallet/ui'
import { TONCONNECT_MANIFEST_URL, getTonConnectStoragePath } from '../wallet/constants'
import {
  awaitTxHashWithGrace,
  buildDnsMessageBatch,
  DNS_UPDATE_AMOUNT_NANO,
  kickoffTxHashResolve,
  pollDnsConfirmationOrThrow,
  resolveDomainNftOrThrow,
} from '../sdk/dns-helpers'
import { normalizedExternalInHashHex } from '../sdk/resolve-tx'
import { networkFromTestnetFlag, tonviewerTxUrl } from '../sdk/endpoints'
import { safeAbort } from '../sdk/abort'
import { siteGatewayUrl } from '../output'

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
  // In JSON mode the deploy step has already emitted the result JSON; any
  // additional human-readable progress here would corrupt the parseable
  // stdout for callers piping into `jq`. resolveCliOutputMode wires
  // createSpinner + log accordingly.
  const { jsonMode, interactive, createSpinner, log } = resolveCliOutputMode(opts)

  log()
  log(chalk.bold('🔗 DNS Registration'))
  log()

  const lookupSpinner = createSpinner.start(`Looking up ${domain}...`)
  let nftAddress: Awaited<ReturnType<typeof resolveDomainNftOrThrow>>
  try {
    nftAddress = await resolveDomainNftOrThrow(
      domain,
      testnet,
      'Verify the domain is owned by the signing wallet and that TONAPI is reachable.',
    )
    lookupSpinner.succeed(`Found NFT: ${nftAddress.toString()}`)
  } catch (err) {
    lookupSpinner.fail()
    throw err
  }

  // Always writes the storage record; if --site-adnl is set, bundles the
  // site (dns_adnl_address) record into the same wallet sign request.
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
  const network = networkFromTestnetFlag(testnet)
  const wallet = new TonConnectProvider(
    storage,
    ui,
    network,
    TONCONNECT_MANIFEST_URL,
  )

  // Internal abort for the in-flight Toncenter resolve poll so an early
  // exit (sign-reject, jsonMode return, dispose) doesn't leave the poll
  // running.
  const txResolveAbort = new AbortController()

  try {
    try {
      await wallet.connect()
    } catch (err) {
      log(chalk.red('  ✗ Wallet connection failed.'))
      throw err
    }

    let txResult: Awaited<ReturnType<typeof wallet.sendTransactionMulti>>
    try {
      txResult = await wallet.sendTransactionMulti(messages)
    } catch (err) {
      log(chalk.red('  ✗ Transaction signing failed or was rejected.'))
      throw err
    }

    const messageBoc = (txResult as { boc?: string }).boc ?? null

    // Kick off the tx-hash resolve in parallel with the TONAPI poll
    // (or before the JSON-mode early return). Aborted in `finally`.
    let txHashResolvePromise: Promise<string | null> = Promise.resolve(null)
    if (messageBoc) {
      const bocHashHex = normalizedExternalInHashHex(messageBoc)
      if (bocHashHex) {
        txHashResolvePromise = kickoffTxHashResolve({
          messageHashHex: `0x${bocHashHex}`,
          network,
          internalAbortSignal: txResolveAbort.signal,
        })
      }
    }

    // In JSON mode we stop here: the wallet has sent the tx, the deploy
    // JSON already emitted to stdout, and polling would only add noise.
    // Humans see the propagation poller, CI parses the deploy JSON.
    if (jsonMode) return

    log()
    log(chalk.dim('  Polling TONAPI for DNS record propagation...'))
    try {
      await pollDnsConfirmationOrThrow({
        domain,
        bagId,
        siteAdnl: opts.siteAdnl,
        testnet,
        silent: false,
        timeoutHint:
          'The wallet sent the transaction; the chain may still be settling, ' +
          'or TONAPI is lagging (especially for `sites` records).',
      })
    } catch {
      // The helper throws ERR_DNS_TX_TIMEOUT; in CLI mode we surface as
      // a human-readable warning and continue (the BOC IS on chain).
      log()
      log(chalk.yellow(`  ⚠ ${domain} DNS update not fully confirmed via TONAPI.`))
      log(chalk.dim('    The wallet sent the transaction; the chain may still be settling, '))
      log(chalk.dim('    or TONAPI is lagging (especially for `sites` records).'))
      return
    }

    const txHash = await awaitTxHashWithGrace(txHashResolvePromise)

    log()
    log(chalk.green(`  ✅ ${domain} now points to your site!`))
    if (opts.siteAdnl && !testnet) {
      // A site record (dns_adnl_address) was just signed: the ton.run SITE
      // gateway resolves that ADNL over RLDP, so the site is browser-openable
      // at <domain>.ton.run once it propagates and the proxy is reachable.
      // Emitted ONLY here (after a successful site-record sign) and ONLY on
      // mainnet — ton.run is a mainnet gateway with no testnet selector, so a
      // testnet record falls through to the generic line below. Never for a
      // storage-only deploy, so we never advertise a dead link. (#70)
      log(chalk.cyan(`  🔗 Gateway URL:  ${siteGatewayUrl(domain)}`))
      log(chalk.dim('     opens once the site record propagates and your rldp-http-proxy is reachable'))
    } else {
      log(chalk.dim(`     https://${domain} (via TON DNS resolvers / TON Browser)`))
    }
    if (txHash) {
      log(chalk.dim(`     Tx:  ${txHash}`))
      log(chalk.dim(`     View: ${tonviewerTxUrl(txHash, testnet)}`))
    } else if (messageBoc) {
      log(chalk.dim('     (Tx hash resolve timed out — tonviewer typically indexes within ~10s)'))
    }
  } finally {
    safeAbort(txResolveAbort)
    // v0.6.3: pause the bridge listener so a `--no-watch` deploy actually
    // exits. Without this, Node's event loop is kept alive by the SSE
    // connection and the CLI hangs after printing the success message.
    wallet.dispose()
  }
}
