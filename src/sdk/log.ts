/**
 * Tiny stderr-only structured logger. Honours the `DEBUG` env var with
 * `debug`-compatible glob grammar so contributors familiar with that
 * library find it ergonomic, but no runtime dep on `debug` itself.
 *
 * Grammar (matches `debug` semantics):
 *   DEBUG="*"                       — all namespaces enabled
 *   DEBUG="sovereign:*"              — every sovereign:<sub> namespace
 *   DEBUG="sovereign:deploy,sovereign:dns"
 *                                   — specific namespaces only
 *   DEBUG=""  | unset                — fully disabled
 *   DEBUG="*,-sovereign:resolve-tx"  — wildcard with exclusion
 *
 * Output always goes to STDERR. Never stdout — the CLI's `--json-output`
 * mode requires stdout to remain valid JSON, and the MCP server's stdio
 * transport requires stdout to be JSON-RPC frames only. Both would break
 * if logger output landed on stdout. Tests cover this invariant.
 *
 * NO `console.*` IN THIS FILE — uses `process.stderr.write` directly.
 */

export interface SdkLogger {
  /** Always emitted when the namespace is enabled. */
  debug(message: string, data?: unknown): void
  /** Always emitted when the namespace is enabled. */
  info(message: string, data?: unknown): void
  /** Always emitted when the namespace is enabled. */
  warn(message: string, data?: unknown): void
}

/**
 * Parse a DEBUG pattern into match + exclude segments. Glob `*` matches
 * any single namespace segment; multiple segments are comma-separated.
 * `-prefix` means "exclude even if matched by an earlier wildcard."
 */
function parseDebugPattern(raw: string): {
  matchers: RegExp[]
  excluders: RegExp[]
} {
  const matchers: RegExp[] = []
  const excluders: RegExp[] = []
  for (const segment of raw.split(/[\s,]+/)) {
    if (!segment) continue
    const isExclude = segment.startsWith('-')
    const body = isExclude ? segment.slice(1) : segment
    if (!body) continue // skip a bare '-' segment
    // Escape ALL regex metas except `*` (we convert that to `.*` next).
    // The class explicitly lists `?` — without it, `DEBUG='?'` crashes
    // `require('ton-sovereign-deploy')` with SyntaxError: Nothing to
    // repeat. Caught by Codex review on 2026-05-12.
    const pattern = body
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
    let re: RegExp
    try {
      re = new RegExp(`^${pattern}$`)
    } catch {
      // The new char-class above covers every standard meta. A throw
      // here would mean an unknown unicode-flag interaction or
      // similar; skip the segment rather than fail import.
      continue
    }
    if (isExclude) excluders.push(re)
    else matchers.push(re)
  }
  return { matchers, excluders }
}

function isNamespaceEnabled(namespace: string, debugVar: string | undefined): boolean {
  if (!debugVar) return false
  const { matchers, excluders } = parseDebugPattern(debugVar)
  if (!matchers.some((re) => re.test(namespace))) return false
  if (excluders.some((re) => re.test(namespace))) return false
  return true
}

function format(level: string, namespace: string, message: string, data: unknown): string {
  const stamp = new Date().toISOString()
  const dataPart =
    data === undefined ? '' : ` ${typeof data === 'string' ? data : JSON.stringify(data)}`
  return `${stamp} ${level} ${namespace} ${message}${dataPart}\n`
}

/**
 * Build a logger for `namespace`. The enabled state is computed ONCE at
 * construction time (it doesn't react to runtime env changes). The
 * returned logger is cheap when disabled — each method short-circuits
 * without formatting the message.
 *
 * Convention: namespaces follow `sovereign:<area>` where area mirrors
 * the SDK module name (`deploy`, `dns`, `agentic-sign`, `resolve-tx`).
 */
export function createSdkLogger(namespace: string): SdkLogger {
  const enabled = isNamespaceEnabled(namespace, process.env.DEBUG)
  if (!enabled) {
    const noop: SdkLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
    }
    return noop
  }
  return {
    debug: (msg, data) => process.stderr.write(format('DEBUG', namespace, msg, data)),
    info: (msg, data) => process.stderr.write(format('INFO', namespace, msg, data)),
    warn: (msg, data) => process.stderr.write(format('WARN', namespace, msg, data)),
  }
}

/**
 * Probe variant — exposed for tests so they can inject a controlled
 * `debugVar` instead of mutating `process.env`.
 */
export function isNamespaceEnabledForTesting(
  namespace: string,
  debugVar: string | undefined,
): boolean {
  return isNamespaceEnabled(namespace, debugVar)
}
