// Tonutils-storage backend deploy path.
// v0.8 [S3]: this file is now a thin CLI adapter over the SDK's `deploy()`
// generator (src/sdk/deploy.ts). All bag-creation logic lives in the SDK;
// this file's job is to render progress events as terminal output (chalk +
// ora spinners) or as `--json-output` lines, then return the same
// `TonutilsDeployReturn` shape so cli.ts callers stay regression-zero.

import path from 'path'
import os from 'os'
import { existsSync, readFileSync } from 'fs'
import chalk from 'chalk'
import type { CliOptions } from '../types/cli'
import { createSpinnerFactory } from '../utils/spinner'
import { detectBuildDir } from '../detect'
import {
  startTonutilsDaemon,
  tonutilsCreate,
  type TonutilsHandle,
} from '../daemon/tonutils-process'
import { buildUrls, printResult, exportAsJson, type DeployResult } from '../output'
import { watchBuildDir } from '../watch'
import { deploy as sdkDeploy, SdkError } from '../sdk/deploy'
import type { DeployEvent, DeployResult as SdkDeployResult } from '../sdk/schemas'

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
  nodeCount: number
}

// expandTilde + resolveTunnelConfig kept here as PUBLIC HELPERS — the
// existing unit tests exercise them directly. The SDK has its own copy
// of validateTunnelConfig() that maps failures to ERR_INVALID_INPUT;
// these CLI-side variants throw plain Errors which cli.ts surfaces.
function expandTilde(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

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

/**
 * CLI adapter — drives the SDK's `deploy()` generator and renders progress
 * events as terminal output. Returns the same shape v0.7 callers expect.
 *
 * Daemon lifecycle: we ask the SDK for `keep_alive: true` so the daemon
 * survives the SDK call. The CLI then either continues into watch mode
 * (which re-uses the daemon) or kills it via the returned `daemon.kill()`.
 *
 * Because the SDK now owns spawn / API-wait, we don't get a proper
 * `TonutilsHandle` back — we synthesise one from the SDK result's
 * `dashboard_url` (= daemon.apiUrl) and `daemon_pid`. The synthetic handle
 * satisfies `tonutilsCreate(handle, ...)` (which only reads `apiUrl`)
 * for watch-mode re-uploads.
 */
export async function runDeployTonutils(
  opts: CliOptions,
  buildDirArg?: string,
  deployOpts: TonutilsDeployOptions = {},
): Promise<TonutilsDeployReturn | undefined> {
  let synthHandle: TonutilsHandle | undefined

  const cleanup = () => { if (synthHandle) synthHandle.kill() }
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
    if (opts.testnet) {
      throw new Error(
        `--testnet is not supported on the tonutils-storage backend in v0.6. ` +
        `Use --daemon-backend=ton-core for testnet, or drop --testnet for mainnet self-host.`,
      )
    }

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

    // ─── Drive the SDK and render events ────────────────────────────────
    let spinner: ReturnType<typeof createSpinner.start> | undefined
    let sdkResult: SdkDeployResult | undefined
    let daemonApiUrl: string | undefined

    const sdkInput = {
      source_dir: buildDir,
      description,
      keep_alive: true as const,
      tunnel_config: tunnel?.absPath ?? null,
    }

    try {
      for await (const ev of sdkDeploy(sdkInput)) {
        renderEvent(ev)
        if (ev.phase === 'done') sdkResult = ev.data as SdkDeployResult
      }
    } catch (err) {
      // Spinner may still be open — close it as failed before rethrowing.
      spinner?.fail(err instanceof Error ? err.message : String(err))
      throw err
    }

    if (!sdkResult) throw new Error('SDK deploy() ended without a `done` event.')
    daemonApiUrl = sdkResult.dashboard_url

    // Synthesise a TonutilsHandle that watch-mode re-uploads can use.
    // tonutilsCreate / tonutilsDetails only read `apiUrl`; the rest are
    // stubbed. kill() uses process.kill(pid, 'SIGTERM') against the SDK's
    // returned daemon_pid.
    const pid = sdkResult.daemon_pid
    if (pid === null) {
      throw new Error('SDK returned daemon_pid: null despite keep_alive: true.')
    }
    synthHandle = makeSyntheticHandle(daemonApiUrl, pid)

    const result: DeployResult = {
      bagId: sdkResult.bag_id,
      ...buildUrls(sdkResult.bag_id),
    }

    if (!opts.jsonOutput) {
      console.log(chalk.dim(`  Size:      ${sdkResult.bag_size_bytes} bytes`))
    }

    if (opts.jsonOutput) {
      console.log(exportAsJson(result))
    } else {
      printResult(result)
    }

    return { result, daemon: synthHandle, buildDir, description }

    // ─── helpers (closures over `spinner` + `createSpinner`) ────────────
    function renderEvent(ev: DeployEvent): void {
      switch (ev.phase) {
        case 'env_check':
          spinner = createSpinner.start('Checking tonutils-storage…')
          break
        case 'daemon_starting':
          spinner?.succeed('tonutils-storage ready')
          spinner = createSpinner.start('Starting tonutils-storage…')
          break
        case 'bag_creating': {
          const data = ev.data as { dashboard_url?: string } | undefined
          const url = data?.dashboard_url ?? ''
          spinner?.succeed(
            `tonutils-storage started${url ? ` at ${url}` : ''}` +
            (tunnel ? ` (tunnelling via ${tunnel.nodeCount} node(s))` : ''),
          )
          spinner = createSpinner.start('Creating bag in TON Storage…')
          break
        }
        case 'bag_uploaded': {
          const data = ev.data as { bag_id: string; files_count: number } | undefined
          spinner?.succeed(`Bag created: ${data?.bag_id}`)
          spinner = undefined
          if (!opts.jsonOutput && data) {
            console.log(chalk.dim(`  Files:     ${data.files_count}`))
          }
          break
        }
        case 'done':
          // Final logging happens after the for-await loop.
          break
        // other phases are not emitted in rc2 scope (DNS / watch / verify).
      }
    }
  } catch (err: unknown) {
    cleanup()
    const message = err instanceof Error ? err.message : String(err)
    if (opts.jsonOutput) {
      console.log(JSON.stringify({ error: message, ...(err instanceof SdkError ? { code: err.code } : {}) }, null, 2))
    } else {
      console.error(chalk.red('\nError:'), message)
    }
    process.exit(1)
  }
}

/**
 * Synthetic `TonutilsHandle` for watch-mode re-uploads. The SDK owns the
 * real ChildProcess; the CLI only needs an object that satisfies
 * `tonutilsCreate(handle, ...)` (which reads `apiUrl`) and supports `kill()`.
 *
 * The `process` field is a typed-but-empty stub — watch-mode and DNS code
 * never touch it. If a future caller does, this synth handle should be
 * replaced with an SDK-exposed real handle (see [S3] follow-up TODO).
 */
function makeSyntheticHandle(apiUrl: string, pid: number): TonutilsHandle {
  let killed = false
  return {
    apiUrl,
    dbDir: '',  // unused after spawn
    // process is a typed slot; we never call its methods because the CLI
    // tracks the kill via pid below.
    process: { pid } as unknown as TonutilsHandle['process'],
    kill: () => {
      if (killed) return
      killed = true
      try {
        process.kill(pid, 'SIGTERM')
      } catch {
        /* daemon already gone */
      }
    },
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

// Suppress unused-import warning: startTonutilsDaemon is imported because
// the legacy export shape kept it as part of this module's surface; if
// no caller uses it, future cleanup can drop the re-export.
void startTonutilsDaemon
