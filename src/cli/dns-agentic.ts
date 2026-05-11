/**
 * CLI adapter over `writeDnsRecordAgentic` from the SDK. Consumes the
 * generator's phase events, prints terminal-friendly progress, and
 * routes the result into the existing CLI output style (matching the
 * TonConnect runDnsRegistration UX as closely as the agentic-no-human
 * flow allows — no QR / approval prompt; signing happens locally).
 *
 * Used when the user passes `--wallet-mode agentic`. Reads the wallet
 * key from `~/.config/ton/config.json` via the SDK's strict loader.
 *
 * NO direct `@ton/walletkit` import here — all signing wiring lives
 * behind the SDK's `writeDnsRecordAgentic` boundary.
 */

import chalk from 'chalk'
import { resolveCliOutputMode } from './output-mode'
import { writeDnsRecordAgentic } from '../sdk/dns'
import { SdkError } from '../sdk/deploy'
import { tonviewerTxUrl } from '../sdk/endpoints'

export interface DnsRegistrationAgenticOptions {
  testnet?: boolean
  jsonOutput?: boolean
  ciMode?: boolean
  /** Wallet selector (id / name / address). Falls back to active_wallet_id. */
  walletLabel?: string
  /** Override config path. Default: `~/.config/ton/config.json`. */
  configPath?: string
  /** v0.6 B5 ADNL site record (64-hex). */
  siteAdnl?: string
}

export async function runDnsRegistrationAgentic(
  domain: string,
  bagId: string,
  testnet = false,
  opts: DnsRegistrationAgenticOptions = {},
): Promise<void> {
  const { createSpinner, log } = resolveCliOutputMode(opts)

  log()
  log(chalk.bold('🤖 DNS Registration (agentic — autonomous signing)'))
  log()

  log(chalk.dim(`  Domain:        ${domain}`))
  log(chalk.dim(`  storage:       ${bagId}`))
  if (opts.siteAdnl) {
    log(chalk.dim(`  site (ADNL):   ${opts.siteAdnl}`))
  }
  log(chalk.dim(`  Wallet source: ${opts.configPath ?? '~/.config/ton/config.json'}`))
  if (opts.walletLabel) {
    log(chalk.dim(`  Selector:      ${opts.walletLabel}`))
  } else {
    log(chalk.dim(`  Selector:      <active_wallet_id>`))
  }
  log()

  // Use a fresh spinner per phase — the Spinner interface only exposes
  // succeed/fail, so we close + restart between phases rather than
  // mutating .text (which only exists on the underlying ora instance).
  let currentSpinner = createSpinner.start('Loading wallet from agentic config...')

  try {
    const inner = writeDnsRecordAgentic({
      domain,
      bag_id: bagId,
      site_adnl: opts.siteAdnl ?? null,
      testnet,
      config_path: opts.configPath,
      wallet_label: opts.walletLabel,
    })

    while (true) {
      const step = await inner.next()
      if (step.done) {
        const result = step.value
        if (result?.tx_hash) {
          log(chalk.dim(`  Tx hash:       ${result.tx_hash}`))
          log(chalk.dim(`  Explorer:      ${tonviewerTxUrl(result.tx_hash, !!testnet)}`))
        } else if (result?.message_hash) {
          log(chalk.dim(`  Message hash:  ${result.message_hash}`))
          log(chalk.dim(`  (Tx hash resolve timed out — tonviewer typically indexes within ~10s)`))
        }
        break
      }
      const ev = step.value
      switch (ev.phase) {
        case 'awaiting_signature': {
          const wl =
            (ev.data as { wallet_label?: string | null } | undefined)?.wallet_label ?? '<wallet>'
          currentSpinner.succeed(`Loaded wallet: ${wl}`)
          currentSpinner = createSpinner.start('Signing locally + broadcasting via Toncenter...')
          break
        }
        case 'dns_signing': {
          const hash =
            (ev.data as { message_hash?: string } | undefined)?.message_hash ?? '<pending>'
          currentSpinner.succeed(`Broadcast accepted by Toncenter (${hash})`)
          currentSpinner = createSpinner.start(
            'Waiting for DNS record to propagate via TONAPI...',
          )
          break
        }
        case 'dns_confirmed': {
          currentSpinner.succeed('DNS record propagated on-chain')
          currentSpinner = createSpinner.start('Verifying...')
          break
        }
        case 'verifying': {
          currentSpinner.succeed('Verification complete')
          // Don't start a new spinner — next step is `done`.
          currentSpinner = createSpinner.start('')
          break
        }
        default:
          break
      }
    }
  } catch (err) {
    currentSpinner.fail()
    if (err instanceof SdkError) {
      log(chalk.red(`✖ ${err.code}: ${err.message}`))
      if (err.fixHint) log(chalk.dim(`  Fix: ${err.fixHint}`))
    }
    throw err
  }

  log()
  log(chalk.green(`✓ ${domain} now resolves to bag ${bagId.slice(0, 12)}…`))
  log()
}
