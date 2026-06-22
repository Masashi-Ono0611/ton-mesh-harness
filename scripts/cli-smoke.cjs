#!/usr/bin/env node
/**
 * Portable CLI smoke test — spawns `dist/cli.js --help` and `--version`
 * to verify the binary loads on the current Node version without
 * runtime errors.
 *
 * This sister test exists because rc2 / rc3 / rc4 shipped a CLI bundle
 * that failed at module load on Node 22+ with ERR_UNSUPPORTED_DIR_IMPORT
 * (a @ton/walletkit packaging bug exposed by Node's stricter ESM
 * resolver). The MCP smoke didn't catch it because it only loads
 * dist/mcp.js. rc5 added noExternal: ['@ton/walletkit'] to tsup; this
 * smoke locks the fix in so a regression fails CI.
 *
 * Exits 0 on success, 1 on any failure with stderr captured.
 */

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const CLI_PATH = path.resolve(__dirname, '..', 'dist', 'cli.js')
const TIMEOUT_MS = 10_000

function run(args, expectExitCode = 0) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  })
  if (result.error) {
    throw new Error(`spawn error for "${args.join(' ')}": ${result.error.message}`)
  }
  if (result.status !== expectExitCode) {
    throw new Error(
      `"cli ${args.join(' ')}" exited with ${result.status} (expected ${expectExitCode}); ` +
        `stdout=${result.stdout?.slice(0, 500)} stderr=${result.stderr?.slice(0, 500)}`,
    )
  }
  return result
}

function main() {
  // --version: smallest possible load. If walletkit's directory-import
  // bug recurs, this fails immediately with ERR_UNSUPPORTED_DIR_IMPORT
  // (the runtime error is emitted on first require chain walk).
  const ver = run(['--version'])
  const stdout = ver.stdout.trim()
  if (!/^\d+\.\d+\.\d+/.test(stdout)) {
    throw new Error(`--version output unexpected: ${JSON.stringify(stdout)}`)
  }

  // --help: full subcommand parser path. Exercises commander's whole tree.
  const help = run(['--help'])
  if (!help.stdout.includes('ton-sovereign-deploy')) {
    throw new Error(`--help missing program name`)
  }
  // Spot-check new v0.8 flags surface so a regression that drops them
  // fails CI.
  for (const flag of ['--wallet-mode', '--wallet-label', '--wallet-config']) {
    if (!help.stdout.includes(flag)) {
      throw new Error(`--help missing ${flag}`)
    }
  }
  // Spot-check that subcommands are still registered (e.g. `site-record`).
  for (const cmd of ['site-record', 'site-serve', 'doctor', 'verify-provenance', 'service']) {
    if (!help.stdout.includes(cmd)) {
      throw new Error(`--help missing subcommand ${cmd}`)
    }
  }

  // Invalid flag → expect non-zero exit (Commander emits an error and
  // exits with code 1). We don't pin the exact exit code since
  // Commander's behavior has changed across versions; just confirm
  // it surfaces an error rather than crashing with ERR_UNSUPPORTED_DIR_IMPORT.
  const invalid = spawnSync(
    process.execPath,
    [CLI_PATH, '--wallet-mode', 'bogus', '.'],
    { encoding: 'utf8', timeout: TIMEOUT_MS },
  )
  if (invalid.status === 0) {
    throw new Error(`--wallet-mode bogus should fail but exited 0`)
  }
  if (invalid.stderr?.includes('ERR_UNSUPPORTED_DIR_IMPORT')) {
    throw new Error(
      `--wallet-mode bogus failed with ERR_UNSUPPORTED_DIR_IMPORT — walletkit bundling regression`,
    )
  }

  process.stdout.write(`CLI smoke OK — version=${stdout}; help OK; validation OK\n`)
}

try {
  main()
} catch (err) {
  process.stderr.write(`CLI smoke FAILED: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
}
