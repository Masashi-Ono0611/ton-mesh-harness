// Tonutils-storage backend deploy path.
// v0.8 [S3]: this file is now a thin CLI adapter over the SDK's `deploy()`
// generator (src/sdk/deploy.ts). All bag-creation logic lives in the SDK;
// this file's job is to render progress events as terminal output (chalk +
// ora spinners) or as `--json-output` lines, then return the same
// `TonutilsDeployReturn` shape so cli.ts callers stay regression-zero.

import path from 'path'
import chalk from 'chalk'
import type { CliOptions } from '../types/cli'
import { installCleanupOnExit, resolveCliOutputMode } from './output-mode'
import { detectBuildDir } from '../detect'
import {
  tonutilsCreate,
  type TonutilsHandle,
} from '../daemon/tonutils-process'
import { buildUrls, printResult, exportAsJson, type DeployResult } from '../output'
import { watchBuildDir } from '../watch'
import { deploy as sdkDeploy } from '../sdk/deploy'
import type { DeployEvent, DeployResult as SdkDeployResult } from '../sdk/schemas'
import {
  resolveTunnelConfig as resolveTunnelConfigCore,
  TunnelConfigError,
  type ResolvedTunnel,
} from '../utils/tunnel-config'

export type { ResolvedTunnel }

export interface TonutilsDeployReturn {
  result: DeployResult
  daemon: TonutilsHandle  // kept alive when watch mode follows; caller must kill if not
  buildDir: string        // for watch-mode re-create
  description: string     // for watch-mode re-create
}

export interface TonutilsDeployOptions {
  tunnelConfigPath?: string  // absolute or relative path to nodes-pool.json
}

/**
 * Thin wrapper around the shared core that converts `TunnelConfigError`
 * into a plain `Error` for the CLI's existing error rendering. v0.7
 * tests + CLI consumers see the same message strings as before.
 */
export function resolveTunnelConfig(rawPath: string): ResolvedTunnel {
  try {
    return resolveTunnelConfigCore(rawPath)
  } catch (err) {
    if (err instanceof TunnelConfigError) throw new Error(err.message)
    throw err
  }
}

/**
 * CLI adapter — drives the SDK's `deploy()` generator and renders progress
 * events as terminal output. Returns the same shape v0.7 callers expect.
 *
 * Daemon ownership: the CLI uses the SDK's internal `onDaemonReady` hook
 * to capture the real `TonutilsHandle` the daemon-process module created.
 * That handle (not a synthetic one) is returned so watch-mode re-uploads
 * can call `tonutilsCreate(handle, ...)` and `handle.kill()` cleans up the
 * temp db dir as well as the process.
 *
 * Cancellation: the CLI installs SIGINT/SIGTERM handlers that call
 * `controller.abort()` (NOT `process.exit()`). The SDK's abort listener
 * kills the daemon; the for-await loop unwinds; the CLI then exits with
 * the appropriate code. A second signal forces immediate exit (escape
 * hatch if abort cleanup itself hangs).
 */
export async function runDeployTonutils(
  opts: CliOptions,
  buildDirArg?: string,
  deployOpts: TonutilsDeployOptions = {},
): Promise<TonutilsDeployReturn | undefined> {
  let capturedDaemon: TonutilsHandle | undefined
  const controller = new AbortController()

  // Track signal handlers so we can remove them when this function returns
  // — leaked handlers cause the next caller (watch mode, DNS) to fight
  // with our deploy-phase cleanup.
  let signalCount = 0
  const onSignal = (exitCode: number) => () => {
    signalCount++
    if (signalCount === 1) {
      // First signal: graceful abort. The SDK kills the daemon via its
      // listener; the for-await loop unwinds; the catch below renders
      // the cancellation; finally-block exits with the right code.
      controller.abort()
    } else {
      // Second signal: hard exit (user is done waiting). Drop the daemon.
      try {
        capturedDaemon?.kill()
      } catch {
        /* ignore */
      }
      process.exit(exitCode)
    }
  }
  const onSigint = onSignal(130)
  const onSigterm = onSignal(143)
  const onUncaught = (err: Error) => {
    try {
      capturedDaemon?.kill()
    } catch {
      /* ignore */
    }
    console.error(chalk.red('\nUnexpected error:'), err.message)
    process.exit(1)
  }
  process.on('SIGINT', onSigint)
  process.on('SIGTERM', onSigterm)
  process.on('uncaughtException', onUncaught)

  const removeSignalHandlers = () => {
    process.off('SIGINT', onSigint)
    process.off('SIGTERM', onSigterm)
    process.off('uncaughtException', onUncaught)
  }

  const { createSpinner } = resolveCliOutputMode(opts)

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

    let spinner: ReturnType<typeof createSpinner.start> | undefined
    let sdkResult: SdkDeployResult | undefined

    const sdkInput = {
      source_dir: buildDir,
      description,
      keep_alive: true as const,
      tunnel_config: tunnel?.absPath ?? null,
    }

    try {
      for await (const ev of sdkDeploy(sdkInput, {
        signal: controller.signal,
        onDaemonReady: (handle) => {
          capturedDaemon = handle
        },
      })) {
        renderEvent(ev)
        if (ev.phase === 'done') sdkResult = ev.data as SdkDeployResult
      }
    } catch (err) {
      spinner?.fail(err instanceof Error ? err.message : String(err))
      throw err
    }

    if (!sdkResult) throw new Error('SDK deploy() ended without a `done` event.')
    if (!capturedDaemon) {
      // onDaemonReady never fired — should never happen on the success path.
      throw new Error('SDK deploy() succeeded but onDaemonReady was never invoked.')
    }

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

    return { result, daemon: capturedDaemon, buildDir, description }

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
          const data = ev.data as { daemon_api_url?: string } | undefined
          const url = data?.daemon_api_url ?? ''
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
        // DNS-related phases (awaiting_signature / dns_signing /
        // dns_confirmed / verifying) are emitted by the SDK when
        // opts.domain is set; the CLI's deploy step does NOT pass
        // domain (DNS is handled by runDnsRegistration[Agentic]
        // after the bag upload), so they never fire here.
      }
    }
  } catch (err: unknown) {
    // Cleanup daemon if SDK fired onDaemonReady before throwing — and
    // SDK didn't already kill it (it does on cancellation/error finally).
    // This is a belt-and-braces guard.
    try {
      capturedDaemon?.kill()
    } catch {
      /* ignore */
    }
    const message = err instanceof Error ? err.message : String(err)
    if (opts.jsonOutput) {
      // v0.7 JSON-error contract: exactly { "error": message }. SdkError
      // codes are NOT exposed here — strict CI parsers depend on the
      // historic shape. Code information is available via the SDK
      // contract / MCP F5 envelope for programmatic consumers.
      console.log(JSON.stringify({ error: message }, null, 2))
    } else {
      console.error(chalk.red('\nError:'), message)
    }
    process.exit(1)
  } finally {
    // Always release the signal handlers we installed at function entry,
    // so subsequent phases (DNS / site-host / watch) can install their own
    // without our handlers firing first and exiting the process early.
    removeSignalHandlers()
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

  installCleanupOnExit(cleanup)

  // Hold the process alive until SIGINT/SIGTERM
  await new Promise<void>(() => { /* never resolves */ })
}
