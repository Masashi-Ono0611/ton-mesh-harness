/**
 * Shared CLI output-mode resolution.
 *
 * Four CLI modules (deploy.ts, deploy-tonutils.ts, dns.ts,
 * dns-agentic.ts) each had their own copy of:
 *   - isCI = opts.ciMode || CI=true env
 *   - jsonMode = !!opts.jsonOutput
 *   - interactive = !isCI && !jsonMode
 *   - createSpinner = createSpinnerFactory({ silent: jsonMode, plain: isCI })
 *   - log = jsonMode ? () => {} : console.log
 *
 * Centralised so the rules ("CI implies plain spinner; JSON implies
 * silent spinner + suppressed log; interactive only when neither")
 * have one source of truth.
 */

import { createSpinnerFactory, type SpinnerFactory } from '../utils/spinner'

export interface CliOutputModeInput {
  /** Maps from --json-output (or programmatic boolean). */
  jsonOutput?: boolean
  /** Maps from --ci-mode (or programmatic boolean). */
  ciMode?: boolean
}

export interface CliOutputMode {
  /** `true` when running under CI (env CI=true OR --ci-mode). */
  isCI: boolean
  /** `true` when --json-output is set (stdout must stay JSON-clean). */
  jsonMode: boolean
  /** `true` when neither CI nor JSON — humans get spinners + colour. */
  interactive: boolean
  /** Pre-configured spinner factory honouring jsonMode + isCI. */
  createSpinner: SpinnerFactory
  /** `console.log` shim — no-op when jsonMode, real when not. */
  log: (...args: unknown[]) => void
}

export function resolveCliOutputMode(opts: CliOutputModeInput): CliOutputMode {
  const isCI = opts.ciMode === true || process.env.CI === 'true'
  const jsonMode = !!opts.jsonOutput
  const interactive = !isCI && !jsonMode
  return {
    isCI,
    jsonMode,
    interactive,
    createSpinner: createSpinnerFactory({ silent: jsonMode, plain: isCI }),
    log: jsonMode ? () => {} : (...args) => console.log(...args),
  }
}

/**
 * Wire SIGINT and SIGTERM to run a cleanup hook before exiting. Exit
 * codes follow the POSIX `128 + signal` convention:
 *   - SIGINT (Ctrl+C) → 130
 *   - SIGTERM         → 143
 *
 * Idempotent w.r.t. multiple installs (Node naturally fans handlers).
 * Use the same cleanup function in CLI deploy entry points so the
 * daemon is killed regardless of which signal arrives first.
 *
 * Codex pre-GA review round 9 caught a wrinkle: the tonutils daemon
 * kill() pre-rc-r7 was sync but round-7 made it schedule async
 * cleanup (child.once('exit', rmSync) + SIGKILL escalation timer).
 * `process.exit()` immediately after `cleanup()` would kill the loop
 * before those tasks run — a daemon that delays SIGTERM could
 * survive orphaned.
 *
 * Fix: set `process.exitCode = code` and add a 2.5 s safety timer.
 * The event loop drains until cleanup's pending listeners complete,
 * then exits naturally. The safety timer is REF'd so it pins the
 * loop alive long enough for the kill() escalation + rmSync to land,
 * and forces exit if cleanup got stuck.
 */
export function installCleanupOnExit(cleanup: () => void): void {
  const SHUTDOWN_DEADLINE_MS = 2_500
  let alreadyShuttingDown = false
  const drain = (code: number): void => {
    if (alreadyShuttingDown) return
    alreadyShuttingDown = true
    try { cleanup() } catch { /* never throw from a signal handler */ }
    process.exitCode = code
    // Force-exit safety net. REF'd intentionally — we want the loop
    // to stay alive long enough for cleanup's async pieces (daemon
    // exit listener, rmSync) to fire, but capped so a wedged daemon
    // can't keep us hanging.
    setTimeout(() => process.exit(code), SHUTDOWN_DEADLINE_MS)
  }
  process.on('SIGINT', () => drain(130))
  process.on('SIGTERM', () => drain(143))
}
