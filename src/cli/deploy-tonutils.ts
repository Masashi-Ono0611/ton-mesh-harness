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
import { watchBuildDir } from '../watch'

export interface TonutilsDeployReturn {
  result: DeployResult
  daemon: TonutilsHandle  // kept alive when watch mode follows; caller must kill if not
  buildDir: string        // for watch-mode re-create
  description: string     // for watch-mode re-create
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

    return { result, daemon, buildDir, description }
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

// -----------------------------------------------------------------------
// Watch-mode entry point — keeps the tonutils daemon alive and re-creates
// the bag whenever buildDir changes. Bag ids are content-addressed, so a
// no-op rebuild yields the same id and the daemon treats it as idempotent.
// -----------------------------------------------------------------------

export async function runWatchModeTonutils(
  deployed: TonutilsDeployReturn,
  opts: { debounce?: string; jsonOutput?: boolean },
): Promise<void> {
  const { daemon, buildDir, description, result: initial } = deployed

  if (!opts.jsonOutput) {
    console.log()
    console.log(chalk.bold('👀 Watch mode (tonutils backend)'))
    console.log(chalk.dim(`  Build dir: ${buildDir}`))
    console.log(chalk.dim(`  Initial bag: ${initial.bagId}`))
    console.log(chalk.dim('  daemon will re-create the bag on file changes (same content ⇒ same id)'))
    console.log(chalk.dim('  Press Ctrl+C to stop'))
    console.log()
  }

  const stop = watchBuildDir({
    buildDir,
    debounceMs: parseInt(opts.debounce ?? '2000', 10),
    onChange: async () => {
      try {
        const r = await tonutilsCreate(daemon, { path: buildDir, description })
        if (r.bag_id === initial.bagId) {
          console.log(chalk.dim(`  ↻ no-op (bag id unchanged: ${r.bag_id.slice(0, 12)}…)`))
        } else {
          console.log(chalk.green(`  ↻ Re-deployed: ${r.bag_id}`))
        }
      } catch (err) {
        console.log(chalk.yellow(`  ⚠ re-deploy failed: ${err instanceof Error ? err.message : err}`))
      }
    },
  })

  const cleanup = () => {
    stop()
    daemon.kill()
  }

  process.on('SIGINT',  () => { cleanup(); process.exit(130) })
  process.on('SIGTERM', () => { cleanup(); process.exit(143) })

  // Hold the process alive until SIGINT/SIGTERM
  await new Promise<void>(() => { /* never resolves */ })
}
