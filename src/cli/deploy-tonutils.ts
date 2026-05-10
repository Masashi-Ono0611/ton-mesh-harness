// Tonutils-storage backend deploy path (v0.6 default).
// Counterpart of deploy.ts for the xssnick / Go daemon. The TON Core C++
// path stays in deploy.ts for users who pass --daemon-backend=ton-core.

import path from 'path'
import os from 'os'
import { existsSync, readFileSync } from 'fs'
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

export interface TonutilsDeployOptions {
  tunnelConfigPath?: string  // absolute or relative path to nodes-pool.json
}

export interface ResolvedTunnel {
  absPath: string
  nodeCount: number  // best-effort count of intermediate nodes in the pool
}

// Node's path.resolve() does NOT expand `~` to $HOME — passing
// `--tunnel-config ~/foo.json` would resolve relative to CWD and look
// for a literal "~/foo.json" subdirectory. Common UX trap, so we expand
// here. This is the only place users pass paths into the CLI in v0.6.
function expandTilde(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

/**
 * Validate a `--tunnel-config <path>` argument and report the absolute
 * path + node count back to the caller for display.
 *
 * Exported so the unit tests exercise the live implementation rather
 * than a copy that drifts.
 */
export function resolveTunnelConfig(rawPath: string): ResolvedTunnel {
  const absPath = path.resolve(expandTilde(rawPath))
  if (!existsSync(absPath)) {
    throw new Error(
      `--tunnel-config: file not found at ${absPath}. ` +
      `Pass a path to a nodes-pool.json supplied by your tunnel operator.`,
    )
  }
  let nodeCount = 0
  try {
    const parsed = JSON.parse(readFileSync(absPath, 'utf-8'))
    if (Array.isArray(parsed?.NodesPool)) nodeCount = parsed.NodesPool.length
    else if (Array.isArray(parsed?.nodes_pool)) nodeCount = parsed.nodes_pool.length
  } catch (err) {
    throw new Error(
      `--tunnel-config: could not parse ${absPath} as JSON: ` +
      `${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (nodeCount === 0) {
    throw new Error(
      `--tunnel-config: ${absPath} has zero entries in NodesPool. ` +
      `The tunnel client needs at least one intermediate node to route through.`,
    )
  }
  return { absPath, nodeCount }
}

export async function runDeployTonutils(
  opts: CliOptions,
  buildDirArg?: string,
  deployOpts: TonutilsDeployOptions = {},
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

  try {
    // Both checks intentionally live INSIDE the try so their errors are
    // routed through the same JSON-vs-human surfacing path as everything
    // else (Codex M1-CO3 caught that --tunnel-config errors were
    // bypassing the `--json-output` formatter).

    // tonutils-storage uses mainnet network config out of the box.
    // Pretending testnet works on this backend would silently send to
    // mainnet — refuse up front.
    if (opts.testnet) {
      throw new Error(
        `--testnet is not supported on the tonutils-storage backend in v0.6. ` +
        `Use --daemon-backend=ton-core for testnet, or drop --testnet for mainnet self-host.`,
      )
    }

    // Validate the tunnel config (if any) before we download a daemon
    // binary — fail fast on user-input problems.
    const tunnel = deployOpts.tunnelConfigPath
      ? resolveTunnelConfig(deployOpts.tunnelConfigPath)
      : undefined

    const buildDir = detectBuildDir(process.cwd(), buildDirArg)
    const description = opts.desc ?? path.basename(buildDir)

    if (!opts.jsonOutput) {
      console.log()
      console.log(chalk.bold('🚀 TON Sovereign Deploy'))
      console.log(chalk.dim('  Backend:   tonutils-storage (xssnick / Go) — v0.6 default'))
      if (tunnel) {
        console.log(chalk.dim(`  Tunnel:    ${tunnel.absPath}`))
        console.log(chalk.dim(`             ${tunnel.nodeCount} intermediate node(s) in pool`))
      }
      console.log(chalk.dim(`  Build dir: ${buildDir}`))
      if (opts.domain) console.log(chalk.dim(`  Domain:    ${opts.domain}`))
      console.log()
    }

    const setupSpinner = createSpinner.start('Checking tonutils-storage…')
    ensureTonutilsBinary({ silent: !!opts.jsonOutput })
    setupSpinner.succeed('tonutils-storage ready')

    const daemonSpinner = createSpinner.start('Starting tonutils-storage…')
    daemon = await startTonutilsDaemon({ tunnelConfigPath: tunnel?.absPath })
    daemonSpinner.succeed(
      `tonutils-storage started at ${daemon.apiUrl}` +
      (tunnel ? ` (tunnelling via ${tunnel.nodeCount} node(s))` : ''),
    )

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
  opts: {
    debounce?: string
    jsonOutput?: boolean
    domain?: string
    /**
     * v0.7 C1: when --site-auto spawned an rldp-http-proxy, hand its
     * handle in so watch mode kills both daemons on SIGINT.
     */
    proxyHandle?: { kill: () => void }
  },
): Promise<void> {
  const { daemon, buildDir, description, result: initial } = deployed

  if (!opts.jsonOutput) {
    console.log()
    console.log(chalk.bold('👀 Watch mode (tonutils backend)'))
    console.log(chalk.dim(`  Build dir: ${buildDir}`))
    console.log(chalk.dim(`  Initial bag: ${initial.bagId}`))
    console.log(chalk.dim('  daemon will re-create the bag on file changes (same content ⇒ same id)'))
    if (opts.domain) {
      // Codex M1-CO1: re-deploys on change yield a new bag id; the DNS
      // record we wrote earlier still points at `initial.bagId`. Until
      // we wire DNS updates into the redeploy loop, just be honest.
      console.log(chalk.yellow(
        `  ⚠ ${opts.domain} keeps pointing at the initial bag (${initial.bagId.slice(0, 12)}…).`,
      ))
      console.log(chalk.dim(
        '    Re-running --domain on every change would require a wallet sign per change.',
      ))
      console.log(chalk.dim(
        '    For now: stop watch mode and re-run with --domain when you want to publish updates.',
      ))
    }
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
    opts.proxyHandle?.kill()
  }

  process.on('SIGINT',  () => { cleanup(); process.exit(130) })
  process.on('SIGTERM', () => { cleanup(); process.exit(143) })

  // Hold the process alive until SIGINT/SIGTERM
  await new Promise<void>(() => { /* never resolves */ })
}
