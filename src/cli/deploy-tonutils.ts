// Tonutils-storage backend deploy path (v0.6 default).
// Counterpart of deploy.ts for the xssnick / Go daemon. The TON Core C++
// path stays in deploy.ts for users who pass --daemon-backend=ton-core.

import path from 'path'
import chalk from 'chalk'
import type { CliOptions } from '../types/cli'
import { createSpinnerFactory } from '../utils/spinner'
import { detectBuildDir } from '../detect'
import { ensureTonutilsBinary } from '../daemon/tonutils-installer'
import {
  startTonutilsDaemon,
  tonutilsCreate,
  tonutilsDetails,
  type TonutilsHandle,
} from '../daemon/tonutils-process'
import { buildUrls, printResult, exportAsJson, type DeployResult } from '../output'

export interface TonutilsDeployReturn {
  result: DeployResult
  daemon: TonutilsHandle  // kept alive when watch mode follows; caller must kill if not
}

export async function runDeployTonutils(
  opts: CliOptions,
  buildDirArg?: string,
): Promise<TonutilsDeployReturn | undefined> {
  let daemon: TonutilsHandle | undefined

  const cleanup = () => { if (daemon) daemon.kill() }
  process.on('SIGINT',  () => { cleanup(); process.exit(130) })
  process.on('SIGTERM', () => { cleanup(); process.exit(143) })
  process.on('uncaughtException', (err) => {
    cleanup()
    console.error(chalk.red('\nUnexpected error:'), err.message)
    process.exit(1)
  })

  const isCI = opts.ciMode || process.env.CI === 'true'
  const createSpinner = createSpinnerFactory({ silent: !!opts.jsonOutput, plain: isCI })

  // tonutils-storage uses mainnet network config out of the box. Pretending
  // testnet works on this backend would silently send to mainnet — refuse
  // up front so the user picks a supported combination.
  if (opts.testnet) {
    throw new Error(
      `--testnet is not supported on the tonutils-storage backend in v0.6. ` +
      `Use --daemon-backend=ton-core for testnet, or drop --testnet for mainnet self-host.`,
    )
  }

  try {
    const buildDir = detectBuildDir(process.cwd(), buildDirArg)
    const description = opts.desc ?? path.basename(buildDir)

    if (!opts.jsonOutput) {
      console.log()
      console.log(chalk.bold('🚀 TON Sovereign Deploy'))
      console.log(chalk.dim('  Backend:   tonutils-storage (xssnick / Go) — v0.6 default'))
      console.log(chalk.dim(`  Build dir: ${buildDir}`))
      if (opts.domain) console.log(chalk.dim(`  Domain:    ${opts.domain}`))
      console.log()
    }

    const setupSpinner = createSpinner.start('Checking tonutils-storage…')
    ensureTonutilsBinary({ silent: !!opts.jsonOutput })
    setupSpinner.succeed('tonutils-storage ready')

    const daemonSpinner = createSpinner.start('Starting tonutils-storage…')
    daemon = await startTonutilsDaemon()
    daemonSpinner.succeed(`tonutils-storage started at ${daemon.apiUrl}`)

    const uploadSpinner = createSpinner.start('Creating bag in TON Storage…')
    const created = await tonutilsCreate(daemon, { path: buildDir, description })
    const bagId = created.bag_id
    uploadSpinner.succeed(`Bag created: ${bagId}`)

    // Verify the daemon registered the bag and fetch metadata for display.
    const details = await tonutilsDetails(daemon, bagId)
    if (!opts.jsonOutput) {
      console.log(chalk.dim(`  Size:      ${details.size} bytes`))
      console.log(chalk.dim(`  Files:     ${details.files_count}`))
    }

    const result: DeployResult = { bagId, ...buildUrls(bagId) }

    if (opts.jsonOutput) {
      console.log(exportAsJson(result))
    } else {
      printResult(result)
    }

    return { result, daemon }
  } catch (err: unknown) {
    cleanup()
    const message = err instanceof Error ? err.message : String(err)
    if (opts.jsonOutput) {
      console.log(JSON.stringify({ error: message }, null, 2))
    } else {
      console.error(chalk.red('\nError:'), message)
    }
    process.exit(1)
  }
}
