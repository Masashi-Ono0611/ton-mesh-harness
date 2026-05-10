/**
 * Programmatic deploy SDK — the seam that powers both the CLI's
 * `runDeployTonutils` adapter and (future) the MCP server's
 * `sovereign_deploy` tool.
 *
 * Spec: docs/v0.8/mcp-core-requirements.md §F2 / §F3 / §F4 / §F5.
 *
 * v0.8.0-rc2 scope: bag creation core path only (env_check → daemon_starting
 * → bag_creating → bag_uploaded → done). DNS write integration + watch +
 * site-auto orchestration are scheduled for follow-up commits ([S2.5] /
 * [S2.6]) — the CLI will continue to chain DNS / site-host / watch via
 * its existing helpers in this iteration.
 *
 * NO `console.*` ANYWHERE IN THIS FILE — lint-enforced.
 */

import { existsSync, readFileSync } from 'fs'
import path from 'path'
import os from 'os'
import {
  DeployOptionsSchema,
  parseWalletInput,
  type DeployEvent,
  type DeployOptions,
  type DeployResult,
  type ErrCode,
  type WalletSpec,
} from './schemas'
import { ensureTonutilsBinary } from '../daemon/tonutils-installer'
import {
  startTonutilsDaemon,
  tonutilsCreate,
  tonutilsDetails,
  type TonutilsHandle,
} from '../daemon/tonutils-process'

// ─────────────────────────────────────────────────────────────────────────────
// Public input shape — accepts the full DeployOptions schema, plus a legacy
// wallet override (string or WalletSpec) for CLI backwards compat.
// ─────────────────────────────────────────────────────────────────────────────

export type DeployInput = Omit<Partial<DeployOptions>, 'wallet'> & {
  source_dir: string
  wallet?: string | WalletSpec
}

export interface DeployControl {
  /**
   * AbortSignal honoured at every event boundary AND just-after the daemon
   * spawns. When fired:
   *  - the SDK kills the daemon (regardless of `keep_alive`);
   *  - in-flight HTTP calls to the daemon will reject (the daemon is gone);
   *  - the generator throws `SdkError(ERR_CANCELLED)` with `phase_at_cancel`
   *    set to the most recent yielded phase (or "env_check" if cancellation
   *    occurred before any yield).
   *
   * Per F4: `may_have_published` is `false` for any cancellation that
   * occurs before `awaiting_signature` fires (this iteration never reaches
   * that phase — DNS write is out of scope for rc2).
   */
  signal?: AbortSignal
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed error
// ─────────────────────────────────────────────────────────────────────────────

export class SdkError extends Error {
  readonly code: ErrCode
  readonly severity: 'fatal' | 'recoverable'
  readonly fixHint?: string
  readonly data?: Record<string, unknown>

  constructor(
    code: ErrCode,
    message: string,
    options: { severity?: 'fatal' | 'recoverable'; fixHint?: string; data?: Record<string, unknown> } = {},
  ) {
    super(message)
    this.name = 'SdkError'
    this.code = code
    this.severity = options.severity ?? 'fatal'
    this.fixHint = options.fixHint
    this.data = options.data
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Process-local lock — F5 ERR_BUSY: v0.8.0 serialises sovereign_deploy
// invocations within a single SDK process. Concurrent calls fail-fast with
// ERR_BUSY rather than colliding on the UDP port / shared db dir.
// ─────────────────────────────────────────────────────────────────────────────

let deployInFlight = false

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function expandTilde(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

/**
 * Validate a tunnel config path BEFORE we start the daemon. Reused from the
 * legacy CLI helper so behaviour stays consistent with v0.7. Maps bad paths
 * to `ERR_INVALID_INPUT` rather than letting them surface as a daemon
 * timeout further down.
 */
function validateTunnelConfig(rawPath: string): string {
  const absPath = path.resolve(expandTilde(rawPath))
  if (!existsSync(absPath)) {
    throw new SdkError(
      'ERR_INVALID_INPUT',
      `--tunnel-config: file not found at ${absPath}. Pass a path to a nodes-pool.json supplied by your tunnel operator.`,
      { severity: 'fatal' },
    )
  }
  let nodeCount = 0
  try {
    const parsed = JSON.parse(readFileSync(absPath, 'utf-8'))
    if (Array.isArray(parsed?.NodesPool)) nodeCount = parsed.NodesPool.length
    else if (Array.isArray(parsed?.nodes_pool)) nodeCount = parsed.nodes_pool.length
  } catch (err) {
    throw new SdkError(
      'ERR_INVALID_INPUT',
      `--tunnel-config: could not parse ${absPath} as JSON: ${err instanceof Error ? err.message : String(err)}`,
      { severity: 'fatal' },
    )
  }
  if (nodeCount === 0) {
    throw new SdkError(
      'ERR_INVALID_INPUT',
      `--tunnel-config: ${absPath} has zero NodesPool entries.`,
      { severity: 'fatal' },
    )
  }
  return absPath
}

/**
 * Coerce loose input into a strict DeployOptions. The `wallet` field
 * accepts either a bare string ("Tonkeeper" — legacy CLI) or a structured
 * WalletSpec. Everything else is passed through to the strict zod parser
 * so typos in field names fail loud.
 */
function normalize(rawInput: DeployInput): DeployOptions {
  // Pass the full input to the strict parser (with `wallet` lifted) so
  // unknown top-level keys are rejected by `z.strictObject`.
  const candidate = { ...rawInput, wallet: parseWalletInput(rawInput.wallet) }
  return DeployOptionsSchema.parse(candidate)
}

/**
 * Heuristic mapping from `startTonutilsDaemon` failure messages to F5 codes.
 * The daemon-process module throws `Error(message)` for several distinct
 * causes (spawn crash / config gen / port collision / API never came up);
 * we route them to the right ERR_* code by message inspection.
 */
function mapDaemonStartError(err: unknown): SdkError {
  const msg = err instanceof Error ? err.message : String(err)
  if (/EADDRINUSE|address already in use|udp.*busy|UDP.*in use/i.test(msg)) {
    return new SdkError('ERR_PORT_BUSY', `tonutils-storage UDP port collision: ${msg}`, {
      severity: 'fatal',
      fixHint: 'Quit any conflicting tonutils-storage / TON Browser.app instance, then retry.',
    })
  }
  if (/spawn .* ENOENT|exited with code|crashed at start|config-gen/i.test(msg)) {
    return new SdkError('ERR_DAEMON_SPAWN', `tonutils-storage failed to spawn: ${msg}`, {
      severity: 'fatal',
      fixHint: 'Run `npx ton-sovereign-deploy doctor` to verify the binary is installed and executable.',
    })
  }
  return new SdkError('ERR_DAEMON_API_TIMEOUT', `tonutils-storage HTTP API did not come up: ${msg}`, {
    severity: 'fatal',
  })
}

function buildCancelledError(
  phase: DeployEvent['phase'],
  bag_id: string | null,
): SdkError {
  return new SdkError('ERR_CANCELLED', `Deploy cancelled at phase ${phase}.`, {
    severity: 'recoverable',
    data: {
      phase_at_cancel: phase,
      may_have_published: false, // rc2 scope ends before awaiting_signature
      bag_id,
      tx_hash: null,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Async-generator deploy SDK. Yields typed `DeployEvent` values in phase
 * order. The terminal `done` event carries the full `DeployResult`; consumers
 * can also read it from the generator's return value.
 *
 * Daemon lifecycle:
 *   - Normal `keep_alive: false` success → daemon killed BEFORE yielding
 *     the `done` event, so consumers reading the terminal event already
 *     see `seed_status: "stopped"`.
 *   - Normal `keep_alive: true` success → daemon kept alive; CALLER owns
 *     the kill. Ownership transfers BEFORE the `done` yield so a consumer
 *     that breaks at `done` doesn't leak via the generator's `return()`.
 *   - Cancellation (AbortSignal) → daemon ALWAYS killed; throws ERR_CANCELLED.
 *   - Error → daemon ALWAYS killed.
 *
 * Concurrency: this SDK serialises within a process. A second concurrent
 * `deploy()` invocation throws `SdkError(ERR_BUSY)` per F5 / spec §3.2.
 */
export async function* deploy(
  rawInput: DeployInput,
  control: DeployControl = {},
): AsyncGenerator<DeployEvent, DeployResult, void> {
  // ─── Input validation FIRST, before acquiring the in-flight gate.
  //     Validation errors must NEVER leave the gate stuck — that would
  //     deadlock the next call. We do all synchronous parsing here
  //     (input shape, --testnet refusal, tunnel-config) before entering
  //     the try/finally that owns the gate.
  const opts = (() => {
    try {
      return normalize(rawInput)
    } catch (err) {
      if (err instanceof SdkError) throw err
      const msg = err instanceof Error ? err.message : String(err)
      throw new SdkError('ERR_INVALID_INPUT', `Invalid deploy input: ${msg}`, { severity: 'fatal' })
    }
  })()

  if (opts.testnet) {
    throw new SdkError(
      'ERR_INVALID_INPUT',
      '--testnet is not supported on the tonutils-storage backend in v0.8. ' +
        'Use --daemon-backend=ton-core for testnet, or drop --testnet for mainnet self-host.',
      { severity: 'fatal' },
    )
  }

  const resolvedTunnel = opts.tunnel_config ? validateTunnelConfig(opts.tunnel_config) : undefined

  // ─── F5 ERR_BUSY: process-local serialisation gate. We acquire AFTER
  //     synchronous input validation so a malformed call doesn't hold
  //     the lock; we release in finally below.
  if (deployInFlight) {
    throw new SdkError(
      'ERR_BUSY',
      'Another sovereign_deploy call is already in flight in this process; v0.8.0 serialises invocations.',
      {
        severity: 'recoverable',
        fixHint: 'Wait for the in-flight deploy to complete (or be cancelled), then retry.',
      },
    )
  }
  deployInFlight = true

  // ─── Track current phase + known bag_id for accurate F4 cancellation ────
  let currentPhase: DeployEvent['phase'] = 'env_check'
  let knownBagId: string | null = null
  const checkAborted = () => {
    if (control.signal?.aborted) throw buildCancelledError(currentPhase, knownBagId)
  }

  let daemon: TonutilsHandle | undefined
  let signalListener: (() => void) | undefined

  // Generator-wide cleanup. Runs on every termination path: normal close,
  // throw, return(), and consumer-break. We always release the in-flight
  // gate; we kill the daemon iff we still own it.
  let daemonOwned = true

  try {
    // ─── env_check ────────────────────────────────────────────────────────
    checkAborted()
    currentPhase = 'env_check'
    yield { phase: 'env_check', message: 'preparing tonutils-storage…' }
    checkAborted()

    try {
      ensureTonutilsBinary({ silent: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new SdkError('ERR_DAEMON_SPAWN', `Could not prepare tonutils-storage binary: ${msg}`, {
        severity: 'fatal',
        fixHint: 'Run `npx ton-sovereign-deploy doctor` to inspect installer state.',
      })
    }

    checkAborted()

    // ─── daemon_starting ─────────────────────────────────────────────────
    currentPhase = 'daemon_starting'
    yield { phase: 'daemon_starting', message: 'starting tonutils-storage…' }
    checkAborted()

    try {
      daemon = await startTonutilsDaemon({ tunnelConfigPath: resolvedTunnel })
    } catch (err) {
      throw mapDaemonStartError(err)
    }

    // Hook AbortSignal → daemon kill, so any in-flight HTTP call we make
    // next will reject. We ALSO checkAborted() in the immediate vicinity;
    // the listener catches abort-during-await cases the polling can't.
    const sig = control.signal
    if (sig) {
      signalListener = () => {
        try {
          daemon?.kill()
        } catch {
          /* ignore */
        }
      }
      sig.addEventListener('abort', signalListener, { once: true })
    }

    checkAborted()

    // Validate daemon pid is a real number (post-waitForApi). If pid is
    // undefined here, something went sideways during spawn.
    const pid = daemon.process.pid
    if (typeof pid !== 'number') {
      throw new SdkError('ERR_DAEMON_SPAWN', 'tonutils-storage spawned without a pid.', {
        severity: 'fatal',
      })
    }

    // ─── bag_creating ────────────────────────────────────────────────────
    currentPhase = 'bag_creating'
    yield {
      phase: 'bag_creating',
      message: `creating bag from ${opts.source_dir}`,
      data: { source_dir: opts.source_dir },
    }
    checkAborted()

    let created
    try {
      created = await tonutilsCreate(daemon, {
        path: opts.source_dir,
        description: opts.description ?? path.basename(opts.source_dir),
      })
    } catch (err) {
      // If the cause was abort, the daemon was killed by the listener
      // and tonutilsCreate rejected — re-throw as ERR_CANCELLED.
      if (control.signal?.aborted) throw buildCancelledError('bag_creating', null)
      const msg = err instanceof Error ? err.message : String(err)
      throw new SdkError('ERR_BAG_UPLOAD', `tonutils-storage failed to create bag: ${msg}`, {
        severity: 'fatal',
      })
    }

    knownBagId = created.bag_id
    checkAborted()

    let details
    try {
      details = await tonutilsDetails(daemon, created.bag_id)
    } catch (err) {
      if (control.signal?.aborted) throw buildCancelledError('bag_creating', knownBagId)
      const msg = err instanceof Error ? err.message : String(err)
      throw new SdkError('ERR_BAG_UPLOAD', `Could not fetch bag details: ${msg}`, {
        severity: 'fatal',
      })
    }

    checkAborted()

    // ─── bag_uploaded ────────────────────────────────────────────────────
    currentPhase = 'bag_uploaded'
    yield {
      phase: 'bag_uploaded',
      message: `bag created: ${created.bag_id}`,
      data: {
        bag_id: created.bag_id,
        bag_size_bytes: details.size,
        files_count: details.files_count,
      },
    }
    checkAborted()

    // ─── Build result + transfer daemon ownership BEFORE final yield ─────
    // (Codex S2 review: ownership flip after `yield done` lets a consumer
    // that breaks early via for-await leak / falsely-kill the daemon.)
    const result: DeployResult = {
      bag_id: created.bag_id,
      bag_size_bytes: details.size,
      dns_tx_hash: null,
      dashboard_url: daemon.apiUrl,
      daemon_pid: opts.keep_alive ? pid : null,
      seed_status: opts.keep_alive ? 'seeding' : 'stopped',
      next_actions: opts.domain
        ? [
            {
              description: `SDK does not yet write the .ton DNS record for ${opts.domain}. Use the CLI's runDnsRegistration() flow (or the v0.8 GA SDK once [S2.5] lands) to publish bag ${created.bag_id} to the domain.`,
            },
          ]
        : [],
    }

    if (opts.keep_alive) {
      // Consumer takes ownership — finally-block must NOT kill the daemon.
      daemonOwned = false
    } else {
      // keep_alive: false → kill the daemon BEFORE yielding `done` so the
      // event's seed_status: "stopped" is honest.
      try {
        daemon.kill()
      } catch {
        /* ignore */
      }
      daemonOwned = false
    }

    currentPhase = 'done'
    yield { phase: 'done', message: 'deploy complete', data: result }

    return result
  } finally {
    if (signalListener && control.signal) {
      try {
        control.signal.removeEventListener('abort', signalListener)
      } catch {
        /* ignore */
      }
    }
    if (daemonOwned && daemon) {
      try {
        daemon.kill()
      } catch {
        /* ignore */
      }
    }
    deployInFlight = false
  }
}
