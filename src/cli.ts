#!/usr/bin/env node
import { Command } from 'commander'
import type { CliOptions } from './types/cli'
import { runDeploy } from './cli/deploy'
import { runDnsRegistration } from './cli/dns'
import { runProviderContract } from './cli/provider'
import { runWatchMode } from './cli/watch'

const VERSION = '0.4.0'

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
  .option('--ci-mode', 'Disable spinners for CI environments')
  .option('--json-output', 'Output result as JSON (for CI/CD pipelines)')
  .option('--skip-verify', 'Skip bag accessibility verification')
  .option('--watch', 'Watch build directory for changes and auto-redeploy')
  .option('--debounce <ms>', 'Debounce delay in ms for watch mode (default: 2000)', '2000')
  .action(async (buildDirArg: string | undefined, opts: CliOptions) => {
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
        })
      } finally {
        daemon.kill()
      }
    }

    // DNS registration
    if (opts.domain) {
      await runDnsRegistration(opts.domain, result.bagId, opts.testnet)
    }

    // Watch mode
    if (opts.watch) {
      const buildDir = buildDirArg || process.cwd()
      await runWatchMode(buildDir, opts, result.bagId)
    }
  })

program.parse()
