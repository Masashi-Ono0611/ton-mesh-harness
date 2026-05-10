import ora from 'ora'
import chalk from 'chalk'
import { startDaemon } from '../daemon'
import { createBag } from '../upload'
import { printResult } from '../output'
import { watchBuildDir } from '../watch'

export interface WatchModeOptions {
  testnet?: boolean
  desc?: string
  debounce?: string
  skipVerify?: boolean
}

/**
 * Run watch mode workflow
 */
export async function runWatchMode(
  buildDir: string,
  opts: WatchModeOptions,
  initialBagId: string
): Promise<void> {
  console.log()
  console.log(chalk.bold('👀 Watch mode enabled'))
  console.log(chalk.dim(`  Build dir: ${buildDir}`))
  console.log(chalk.dim(`  Initial bag: ${initialBagId}`))
  console.log(chalk.dim('  Press Ctrl+C to stop'))
  console.log()

  // Keep daemon alive for watch mode.
  // Codex P2 caught: by this point the deploy step has already killed the
  // daemon used to upload `initialBagId` and removed its temp DB, so the
  // bag printed earlier is *not* yet seeded by anyone. Recreate it on the
  // fresh daemon up front (same content ⇒ same bag id, deterministic) so
  // the first watch tick isn't required to make the bag reachable.
  const daemon = await startDaemon(opts.testnet)
  try {
    const reseeded = createBag({ buildDir, description: opts.desc, daemon })
    if (reseeded.bagId !== initialBagId) {
      console.log(chalk.yellow(
        `\n  ⚠ Re-seeded bag id (${reseeded.bagId.slice(0, 12)}…) ` +
        `differs from initial (${initialBagId.slice(0, 12)}…). ` +
        `This means the build dir changed between deploy and watch start.`,
      ))
    }
  } catch (err) {
    console.log(chalk.yellow(`\n  ⚠ Failed to re-seed initial bag on the watch daemon: ${err instanceof Error ? err.message : err}`))
  }

  const stopWatching = watchBuildDir({
    buildDir,
    debounceMs: parseInt(opts.debounce || '2000'),
    onChange: async () => {
      const spinner = ora('Re-deploying...').start()
      try {
        const result = createBag({
          buildDir,
          description: opts.desc,
          daemon,
        })
        spinner.succeed(`Deployed: ${result.bagId}`)
        printResult(result)
      } catch (err) {
        spinner.fail(`Deploy failed: ${err}`)
      }
    },
  })

  // Override cleanup handlers
  const originalCleanup = () => {
    stopWatching()
    daemon.kill()
  }

  process.removeListener('SIGINT', () => {})
  process.removeListener('SIGTERM', () => {})

  process.on('SIGINT', () => {
    originalCleanup()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    originalCleanup()
    process.exit(143)
  })

  // Keep process alive (forever)
  await new Promise(() => {})
}
