import chalk from 'chalk'
import type { DaemonHandle } from '../daemon'
import type { CliOptions } from '../types/cli'
import { installCleanupOnExit, resolveCliOutputMode } from './output-mode'
import { detectBuildDir } from '../detect'
import { ensureBinaries, startDaemon } from '../daemon'
import { createBag } from '../upload'
import { printResult, exportAsJson, type DeployResult } from '../output'
import { verifyBagOnNetwork } from '../verify'

export interface DeployReturn {
  result: DeployResult
  daemon?: DaemonHandle
}

export async function runDeploy(opts: CliOptions, buildDirArg?: string): Promise<DeployReturn | undefined> {
  let daemon: DaemonHandle | undefined

  const cleanup = () => {
    if (daemon) daemon.kill()
  }

  installCleanupOnExit(cleanup)
  process.on('uncaughtException', (err) => {
    cleanup()
    console.error(chalk.red('\nUnexpected error:'), err.message)
    process.exit(1)
  })

  const { createSpinner } = resolveCliOutputMode(opts)

  try {
    const buildDir = detectBuildDir(process.cwd(), buildDirArg)

    if (!opts.jsonOutput) {
      console.log()
      console.log(chalk.bold('🚀 TON Mesh Deploy'))
      if (opts.testnet) {
        console.log(chalk.yellow('  (testnet mode)'))
      }
      console.log(chalk.dim(`  Build dir: ${buildDir}`))
      if (opts.domain) {
        console.log(chalk.dim(`  Domain:    ${opts.domain}`))
      }
      console.log()
    }

    const setupSpinner = createSpinner.start('Checking storage-daemon...')
    ensureBinaries(opts.testnet)
    setupSpinner.succeed('storage-daemon ready')

    const daemonSpinner = createSpinner.start('Starting storage-daemon...')
    daemon = await startDaemon(opts.testnet)
    daemonSpinner.succeed('storage-daemon started')

    const uploadSpinner = createSpinner.start('Uploading to TON Storage...')
    const result = createBag({
      buildDir,
      description: opts.desc,
      daemon,
    })
    uploadSpinner.succeed('Upload complete')

    if (!opts.skipVerify) {
      const verifySpinner = createSpinner.start('Verifying bag is accessible...')
      const verification = await verifyBagOnNetwork({
        bagId: result.bagId,
        timeoutMs: 60_000,
        intervalMs: 5_000,
        testnet: opts.testnet,
      })

      if (verification.accessible) {
        verifySpinner.succeed(`Bag indexed by TONAPI in ${verification.latencyMs}ms (${verification.attempts} attempts)`)
      } else {
        // TONAPI does not index raw self-hosted bags, so a miss here is normal
        // and does NOT mean the bag is unreachable — reachability depends on a
        // live, publicly-reachable seeder, not on the TONAPI index. (#68)
        verifySpinner.warn('Not yet in the TONAPI index (normal for self-hosted bags — does not mean unreachable)')
      }
    }

    // --provider is rejected at the cli.ts gate (`opts.provider` always
    // false here in v0.6+); the keep-daemon-alive branch is unreachable
    // and was removed in batch 3 of the v0.8 cleanup. Re-introduce it
    // alongside any v0.9 provider revival work.
    daemon.kill()
    daemon = undefined

    if (opts.jsonOutput) {
      console.log(exportAsJson(result))
      return { result }
    }

    printResult(result)
    return { result }
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
