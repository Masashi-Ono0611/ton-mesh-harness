// Shared tunnel-config helpers — used by both the SDK (`src/sdk/deploy.ts`)
// and the CLI (`src/cli/deploy-tonutils.ts`).
//
// Background: a `--tunnel-config <path>` argument names a `nodes-pool.json`
// supplied by an ADNL Tunnel operator. We must validate the path exists,
// is parseable JSON, and lists at least one intermediate node BEFORE the
// daemon spawns — otherwise daemon-side errors get mapped to mysterious
// timeouts.
//
// Two slightly different validators existed before this refactor:
//   - cli/deploy-tonutils.ts: throws plain Error
//   - sdk/deploy.ts: throws SdkError(ERR_INVALID_INPUT)
// Both shared the same `expandTilde` + JSON parsing logic. This module
// hosts the pure "resolve path + count nodes" core; each caller wraps it
// to raise its own error type.

import path from 'path'
import os from 'os'
import { existsSync, readFileSync } from 'fs'

export interface ResolvedTunnel {
  /** Absolute path after `~` expansion. */
  absPath: string
  /** Best-effort count of intermediate nodes in the pool. */
  nodeCount: number
}

/** `~` and `~/foo` expansion — Node's `path.resolve()` does NOT do this. */
export function expandTilde(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

export type TunnelConfigErrorReason = 'not_found' | 'unparseable' | 'empty_pool'

export class TunnelConfigError extends Error {
  readonly reason: TunnelConfigErrorReason
  readonly absPath: string
  constructor(reason: TunnelConfigErrorReason, absPath: string, message: string) {
    super(message)
    this.name = 'TunnelConfigError'
    this.reason = reason
    this.absPath = absPath
  }
}

/**
 * Resolve, validate, and summarise a tunnel-config file. Throws
 * `TunnelConfigError` on every failure mode — callers map to their own
 * error class (CLI: plain Error / SDK: SdkError(ERR_INVALID_INPUT)).
 */
export function resolveTunnelConfig(rawPath: string): ResolvedTunnel {
  const absPath = path.resolve(expandTilde(rawPath))
  if (!existsSync(absPath)) {
    throw new TunnelConfigError(
      'not_found',
      absPath,
      `--tunnel-config: file not found at ${absPath}. Pass a path to a nodes-pool.json supplied by your tunnel operator.`,
    )
  }
  let nodeCount = 0
  try {
    const parsed = JSON.parse(readFileSync(absPath, 'utf-8'))
    if (Array.isArray(parsed?.NodesPool)) nodeCount = parsed.NodesPool.length
    else if (Array.isArray(parsed?.nodes_pool)) nodeCount = parsed.nodes_pool.length
  } catch (err) {
    throw new TunnelConfigError(
      'unparseable',
      absPath,
      `--tunnel-config: could not parse ${absPath} as JSON: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
  if (nodeCount === 0) {
    throw new TunnelConfigError(
      'empty_pool',
      absPath,
      `--tunnel-config: ${absPath} has zero entries in NodesPool. The tunnel client needs at least one intermediate node to route through.`,
    )
  }
  return { absPath, nodeCount }
}
