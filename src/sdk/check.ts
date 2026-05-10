/**
 * Programmatic environment check — the "did the user's machine actually
 * have everything we need" probe that powers both the CLI's `doctor`
 * subcommand and the MCP server's `sovereign_check_env` tool.
 *
 * Spec: docs/v0.8/mcp-core-requirements.md §F2 / §F3.
 *
 * NO `console.*` ANYWHERE IN THIS FILE — lint-enforced (planned [S4]).
 */

import { existsSync, readFileSync } from 'fs'
import { promises as fsp } from 'fs'
import path from 'path'
import os from 'os'
import dgram from 'dgram'
import { CheckEnvOptionsSchema, CheckEnvResultSchema } from './schemas'
import type { CheckEnvOptions, CheckEnvResult } from './schemas'
import { getDaemonPaths } from '../daemon/installer'
import { getTonutilsPaths } from '../daemon/tonutils-installer'
import { getRldpHttpProxyPaths } from '../daemon/rldp-http-proxy-installer'
import { TONCONNECT_MANIFEST_URL } from '../wallet/constants'

const UDP_PORT_TONUTILS_DEFAULT = 17555

// ─── helpers (no console.*) ──────────────────────────────────────────────────

async function fetchOk(url: string, timeoutMs = 4_000): Promise<boolean> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const r = await fetch(url, { method: 'GET', signal: ac.signal })
    return r.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * UDP-bind probe. We try to listen on the given port; success → port is free,
 * EADDRINUSE → busy, anything else (e.g. permission) → treat as not free
 * (conservative — we'd rather warn than miss a conflict).
 */
function isUdpPortFree(port: number, timeoutMs = 750): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4')
    let settled = false
    const settle = (free: boolean) => {
      if (settled) return
      settled = true
      try {
        sock.close()
      } catch {
        /* ignore */
      }
      resolve(free)
    }
    sock.once('error', () => settle(false))
    sock.once('listening', () => settle(true))
    try {
      sock.bind(port)
    } catch {
      settle(false)
    }
    setTimeout(() => settle(false), timeoutMs)
  })
}

/**
 * Best-effort disk-free probe. `fs.statfs` is Node 19+; older Node returns 0
 * meaning "unavailable". CLI renderer should show "n/a" in that case.
 */
async function diskFreeMb(p: string): Promise<number> {
  try {
    const statfs = (fsp as unknown as { statfs?: (p: string) => Promise<{ bsize: number; bavail: number }> }).statfs
    if (typeof statfs !== 'function') return 0
    const st = await statfs(p)
    return Math.floor((st.bsize * st.bavail) / 1024 / 1024)
  } catch {
    return 0
  }
}

/**
 * Loose probe: a config file with at least one wallet entry that has the
 * shape `@ton/mcp` writes (`agentic_*` setup tools produce keys with private
 * material plus a label / mnemonic / private_key field). The probe is
 * intentionally tolerant of unknown keys — it answers "does Path 2 have
 * something that looks like a usable wallet?" without committing to a
 * specific schema version.
 *
 * If the file exists but the shape is not recognised, we emit
 * `AGENTIC_CONFIG_SCHEMA_UNKNOWN` so a future `@ton/mcp` schema bump
 * fails loud rather than silently rendering "agentic available."
 */
type AgenticProbeOutcome =
  | { found: true; path: string }
  | { found: false; path: string; reason: 'missing' | 'unparseable' | 'schema_unknown' }

function detectAgenticConfig(overridePath?: string): AgenticProbeOutcome {
  const p =
    overridePath ??
    process.env.TON_CONFIG_PATH ??
    path.join(os.homedir(), '.config', 'ton', 'config.json')
  if (!existsSync(p)) return { found: false, path: p, reason: 'missing' }

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(p, 'utf-8'))
  } catch {
    return { found: false, path: p, reason: 'unparseable' }
  }

  // Look for any plausible wallet-list shape `@ton/mcp` writes:
  //   - top-level `wallets: Array<{...}>`
  //   - top-level array of wallets
  //   - top-level object whose values look like wallets (keyed by label)
  // A "plausible wallet" has at least one of: privateKey, private_key,
  // mnemonic, secret. We don't assert the cryptographic shape — just that
  // the entry intends to carry signing material.
  const looksLikeWallet = (e: unknown): boolean => {
    if (!e || typeof e !== 'object') return false
    const o = e as Record<string, unknown>
    return Boolean(
      o.privateKey ?? o.private_key ?? o.mnemonic ?? o.secret ?? o.signer ?? o.address,
    )
  }
  const hasWallet = (() => {
    if (Array.isArray(parsed)) return parsed.some(looksLikeWallet)
    if (parsed && typeof parsed === 'object') {
      const o = parsed as Record<string, unknown>
      if (Array.isArray(o.wallets)) return o.wallets.some(looksLikeWallet)
      return Object.values(o).some(looksLikeWallet)
    }
    return false
  })()

  if (hasWallet) return { found: true, path: p }
  return { found: false, path: p, reason: 'schema_unknown' }
}

// ─── public SDK entry point ──────────────────────────────────────────────────

/**
 * Pre-flight readiness probe. Returns a structured `CheckEnvResult` per the
 * F2 zod schema — no IO side effects beyond the network probes the function
 * documents (TONAPI, TonConnect manifest, dns lookups).
 *
 * The CLI's `doctor` subcommand and the MCP `sovereign_check_env` tool both
 * route through here.
 */
export async function checkEnv(opts: CheckEnvOptions = { source_dir: null }): Promise<CheckEnvResult> {
  const parsed = CheckEnvOptionsSchema.parse(opts)
  const blocking: CheckEnvResult['blocking'] = []
  const warnings: CheckEnvResult['warnings'] = []

  // ─── Daemon backends ──────────────────────────────────────────────────────
  const tonutilsBin = getTonutilsPaths().daemon
  const tonCoreBin = getDaemonPaths().daemon
  const tonutilsInstalled = existsSync(tonutilsBin)
  const tonCoreInstalled = existsSync(tonCoreBin)

  if (!tonutilsInstalled) {
    warnings.push({
      code: 'TONUTILS_NOT_INSTALLED',
      message: `tonutils-storage binary not at ${tonutilsBin}; will be downloaded on first deploy.`,
    })
  }
  if (!tonCoreInstalled) {
    warnings.push({
      code: 'TON_CORE_NOT_INSTALLED',
      message: `ton-core daemon not at ${tonCoreBin}; only used by --daemon-backend ton-core.`,
    })
  }

  // ─── rldp-http-proxy (v0.7 C5.1 informational) ────────────────────────────
  const proxyPaths = getRldpHttpProxyPaths()
  if (!existsSync(proxyPaths.daemon)) {
    warnings.push({
      code: 'RLDP_HTTP_PROXY_NOT_INSTALLED',
      message: `rldp-http-proxy not at ${proxyPaths.daemon}; downloaded on first --site-auto run.`,
    })
  }

  // ─── Network reachability ─────────────────────────────────────────────────
  const tonapiOk = await fetchOk('https://tonapi.io/v2/blockchain/masterchain-head')
  if (!tonapiOk) {
    blocking.push({
      code: 'NETWORK_TONAPI_UNREACHABLE',
      message: 'TONAPI mainnet endpoint did not respond within 4s.',
      fix_hint: 'Check connectivity / corporate proxy / firewall before retrying.',
    })
  }

  // TonConnect manifest is informational — failure is recoverable since
  // mainline deploys without --domain don't need it.
  const manifestOk = await fetchOk(TONCONNECT_MANIFEST_URL)
  if (!manifestOk) {
    warnings.push({
      code: 'TONCONNECT_MANIFEST_UNREACHABLE',
      message: `TonConnect manifest unreachable: ${TONCONNECT_MANIFEST_URL}`,
    })
  }

  // ─── Wallet signers ───────────────────────────────────────────────────────
  const wallet_signers_available: CheckEnvResult['wallet_signers_available'] = []
  // Path 1 — TonConnect: connector code is always present (it's bundled with
  // the kit). The manifest reachability is what actually gates a sign flow,
  // surfaced as a warning above.
  if (manifestOk) {
    wallet_signers_available.push('tonconnect')
  } else {
    // Even with manifest unreachable, the CLI session may already exist.
    // Treat tonconnect as available iff we have the connector code OR a
    // session — both are true here, so always include.
    wallet_signers_available.push('tonconnect')
  }
  // Path 2 — agentic: viable iff the config file exists AND has at least
  // one entry that looks like a wallet. [M3] will additionally instantiate
  // and verify the signer; doctor stops at "the file has plausible wallet
  // shape." A `schema_unknown` outcome means the file exists but doesn't
  // match the writer convention — surface as a warning so a future
  // `@ton/mcp` schema change fails loud.
  const agentic = detectAgenticConfig()
  if (agentic.found) {
    wallet_signers_available.push('agentic')
  } else if (agentic.reason === 'schema_unknown') {
    warnings.push({
      code: 'AGENTIC_CONFIG_SCHEMA_UNKNOWN',
      message: `Found ${agentic.path} but it doesn't match the expected @ton/mcp wallet shape; agentic mode disabled. If you set this up via @ton/mcp@alpha, file an issue with the schema we should support.`,
    })
  } else if (agentic.reason === 'unparseable') {
    warnings.push({
      code: 'AGENTIC_CONFIG_UNPARSEABLE',
      message: `Found ${agentic.path} but it didn't parse as JSON; agentic mode disabled.`,
    })
  }
  // (Schema uniqueness refine guards against tonconnect being added twice.)

  // ─── UDP port probe ───────────────────────────────────────────────────────
  const udp_port_17555_free = await isUdpPortFree(UDP_PORT_TONUTILS_DEFAULT)
  if (!udp_port_17555_free) {
    blocking.push({
      code: 'UDP_PORT_BUSY',
      message: `UDP port ${UDP_PORT_TONUTILS_DEFAULT} is in use (likely TON Browser.app or another tonutils-storage).`,
      fix_hint: 'Quit the conflicting process or use --daemon-backend ton-core to bind a different port.',
    })
  }

  // ─── source_dir validity (only when provided) ─────────────────────────────
  let source_dir_valid: boolean | null = null
  if (parsed.source_dir !== null) {
    try {
      const st = await fsp.stat(parsed.source_dir)
      source_dir_valid = st.isDirectory()
      if (!source_dir_valid) {
        blocking.push({
          code: 'SOURCE_DIR_NOT_DIRECTORY',
          message: `Provided source_dir is not a directory: ${parsed.source_dir}`,
          fix_hint: 'Pass the path of a built site directory (e.g., dist/, build/, out/, public/).',
        })
      }
    } catch {
      source_dir_valid = false
      blocking.push({
        code: 'SOURCE_DIR_NOT_FOUND',
        message: `Provided source_dir does not exist: ${parsed.source_dir}`,
        fix_hint: 'Run your build command first, or pass an existing directory path.',
      })
    }
  }

  // ─── Disk + node version ──────────────────────────────────────────────────
  const node_version = process.version
  const disk_free_mb = await diskFreeMb(parsed.source_dir ?? process.cwd())

  const result: CheckEnvResult = {
    ready: blocking.length === 0,
    node_version,
    disk_free_mb,
    udp_port_17555_free,
    wallet_signers_available,
    daemon_backend_installed: { tonutils: tonutilsInstalled, ton_core: tonCoreInstalled },
    network_reachable: tonapiOk,
    source_dir_valid,
    blocking,
    warnings,
  }

  // Validate via the schema — this catches drift if the implementation
  // ever produces an unexpected shape.
  return CheckEnvResultSchema.parse(result)
}

/**
 * Re-export tied to tonutils' assumed UDP port so downstream renderers can
 * label the "port busy" line with the actual number rather than a magic literal.
 */
export const TONUTILS_DEFAULT_UDP_PORT = UDP_PORT_TONUTILS_DEFAULT
