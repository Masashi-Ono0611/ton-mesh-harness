#!/usr/bin/env node
import chalk from 'chalk'
import { Command } from 'commander'
import type { CliOptions } from './types/cli'
import { runDeploy } from './cli/deploy'
import { runDeployTonutils } from './cli/deploy-tonutils'
import { runDnsRegistration } from './cli/dns'
import { runProviderContract } from './cli/provider'
import { runWatchMode } from './cli/watch'

const VERSION = '0.4.0'

function parseSpanFlag(raw: string | undefined): number {
  const n = Number(raw ?? '86400')
  if (!Number.isInteger(n) || n < 1 || n > 0xffff_ffff) {
    throw new Error(
      `--span must be a positive integer ≤ 4294967295 (got ${JSON.stringify(raw)})`,
    )
  }
  return n
}

const program = new Command()

program
  .name('ton-sovereign-deploy')
  .description('Deploy static sites to TON Storage — censorship-resistant in one command')
  .version(VERSION)
  .argument('[build-dir]', 'Path to build directory (auto-detected if omitted)')
  .option('--testnet', 'Use TON testnet (for testing without real TON)')
  .option('--desc <description>', 'Bag description (defaults to directory name)')
  .option('--domain <domain>', 'Register bag under this .ton domain (e.g. myprotocol.ton)')
  .option('--provider [address]', 'Contract with a storage provider for 24/7 hosting (omit address to auto-select cheapest)')
  .option('--span <seconds>', 'Provider contract span in seconds (default 86400 = 1 day, max 4294967295)', '86400')
  .option('--wallet <name>', 'Preferred wallet for sign requests (case-insensitive substring of wallet name; default "Tonkeeper")', 'Tonkeeper')
  .option('--ci-mode', 'Disable spinners for CI environments')
  .option('--json-output', 'Output result as JSON (for CI/CD pipelines)')
  .option('--skip-verify', 'Skip bag accessibility verification')
  // --watch is the default since v0.6 (self-host first). The daemon stays
  // alive and the build dir is watched for changes. `--no-watch` exits as
  // soon as the bag is uploaded (one-shot deploy).
  .option('--watch', 'Watch build directory for changes and auto-redeploy (default: enabled)')
  .option('--no-watch', 'Disable watch mode and exit after upload')
  .option('--debounce <ms>', 'Debounce delay in ms for watch mode (default: 2000)', '2000')
  // v0.6: daemon backend swap. Default = tonutils (xssnick / Go), the daemon
  // TON-Torrent and the Resistance Tools stack use. ton-core is the legacy
  // C++ daemon, kept as a fallback during the migration.
  .option('--daemon-backend <name>', 'Daemon backend: tonutils (default) | ton-core', 'tonutils')
  .action(async (buildDirArg: string | undefined, opts: CliOptions) => {
    // Validate backend choice early.
    if (opts.daemonBackend && opts.daemonBackend !== 'tonutils' && opts.daemonBackend !== 'ton-core') {
      throw new Error(
        `--daemon-backend must be 'tonutils' or 'ton-core' (got '${opts.daemonBackend}')`,
      )
    }
    const backend = opts.daemonBackend ?? 'tonutils'

    // v0.6: --provider is temporarily disabled while the daemon backend is
    // being migrated. The mainnet provider economy was already dormant
    // (docs/v0.5/round-postmortem.md), so this gate costs no real
    // functionality. v0.7 will reintroduce provider support against
    // whichever protocol turns out to have liveness.
    if (opts.provider) {
      throw new Error(
        `--provider is temporarily disabled in v0.6 during the daemon backend migration. ` +
        `Background: docs/v0.5/round-postmortem.md (mainnet provider economy is dormant). ` +
        `Plan: docs/v0.6/roadmap-draft.md (re-enabled in v0.7).`,
      )
    }

    // Validate span up front so we fail before doing any deploy work.
    // (Only meaningful when --provider is set; otherwise the value is ignored.)
    const spanSeconds = opts.provider ? parseSpanFlag(opts.span) : undefined

    // v0.6: --watch is the default for interactive runs (self-host first).
    // For non-interactive runs (--json-output, --ci-mode, or CI=true env)
    // the documented behaviour is one-shot: print the result and exit, so
    // a CI invocation that doesn't pass --no-watch must not be left
    // hanging in the seeding loop. Codex P1 caught this on review.
    const isCI = opts.ciMode || process.env.CI === 'true'
    const watchExplicitlyOff = opts.watch === false
    const watchExplicitlyOn  = opts.watch === true
    const nonInteractive = isCI || !!opts.jsonOutput
    const watchEnabled = watchExplicitlyOn
      ? true
      : watchExplicitlyOff
        ? false
        : !nonInteractive

    // -----------------------------------------------------------------
    // Backend dispatch
    // -----------------------------------------------------------------
    if (backend === 'tonutils') {
      const deployed = await runDeployTonutils(opts, buildDirArg)
      if (!deployed) return
      const { result, daemon } = deployed

      // DNS registration is daemon-agnostic (TonConnect + cell builder)
      if (opts.domain) {
        await runDnsRegistration(opts.domain, result.bagId, opts.testnet, {
          jsonOutput: opts.jsonOutput,
          ciMode: opts.ciMode,
          walletName: opts.wallet,
        })
      }

      if (watchEnabled) {
        // tonutils daemon is already running and seeding. Hold the process
        // alive until SIGINT/SIGTERM. Re-deploy on file change is not yet
        // wired for this backend (see roadmap B2 follow-up); for v0.6 we
        // simply seed the initial bag. Users who need auto-redeploy on
        // file change can pass --daemon-backend=ton-core for now.
        if (!opts.jsonOutput) {
          console.log()
          console.log(chalk.bold('👀 Seeding'))
          console.log(chalk.dim(`  bag:       ${result.bagId}`))
          console.log(chalk.dim(`  daemon:    ${daemon.apiUrl}`))
          console.log(chalk.dim('  Auto-redeploy on file change is not yet wired for tonutils'))
          console.log(chalk.dim('  in v0.6. Pass --daemon-backend=ton-core for live re-deploy.'))
          console.log(chalk.dim('  Press Ctrl+C to stop seeding.'))
          console.log()
        }
        await new Promise<void>(() => { /* hold forever */ })
      } else {
        daemon.kill()
      }
      return
    }

    // -----------------------------------------------------------------
    // Legacy ton-core backend (opt-in via --daemon-backend=ton-core)
    // -----------------------------------------------------------------
    const deployed = await runDeploy(opts, buildDirArg)
    if (!deployed) return

    const { result, daemon } = deployed

    // Provider contract (daemon still alive when --provider is set)
    if (opts.provider && daemon) {
      try {
        await runProviderContract({
          bagId: result.bagId,
          providerArg: opts.provider,
          daemon,
          testnet: opts.testnet,
          jsonOutput: opts.jsonOutput,
          ciMode: opts.ciMode,
          walletName: opts.wallet,
          spanSeconds,
        })
      } finally {
        daemon.kill()
      }
    }

    // DNS registration
    if (opts.domain) {
      await runDnsRegistration(opts.domain, result.bagId, opts.testnet, {
        jsonOutput: opts.jsonOutput,
        ciMode: opts.ciMode,
        walletName: opts.wallet,
      })
    }

    // Watch mode (default since v0.6 — keeps the daemon seeding the bag).
    if (watchEnabled) {
      const buildDir = buildDirArg || process.cwd()
      await runWatchMode(buildDir, opts, result.bagId)
    }
  })

program.parse()
