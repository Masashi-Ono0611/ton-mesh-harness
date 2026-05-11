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
 */
export function installCleanupOnExit(cleanup: () => void): void {
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(143)
  })
}
