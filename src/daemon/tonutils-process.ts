// tonutils-storage daemon process management + HTTP API client.
// Counterpart of process.ts (TON Core daemon) for the xssnick / Go backend.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { spawn, type ChildProcess } from 'child_process'
import { isIP } from 'net'
import path from 'path'
import os from 'os'
import { findFreeTcpPort, findFreeUdpPort } from './ports'
import { getTonutilsPaths } from './tonutils-installer'
import { BIN_DIR } from './installer-utils'
import { getNetworkConfig } from '../network'

export interface TonutilsHandle {
  apiUrl: string                // e.g. http://127.0.0.1:8192
  dbDir: string
  process: ChildProcess
  kill: () => void
  // Public reachability as reported by the daemon's own startup port-checker:
  //   true  = "server mode: true"  → other nodes can download bags from here
  //   false = behind NAT / no public IP → download-only, nobody can reach it
  //   null  = unknown (verdict not seen / log format changed) — never treat
  //           null as "unreachable"; it just means we couldn't read the signal.
  // This is the only honest reachability signal available: public gateways and
  // TONAPI do not index raw self-hosted bags, so they cannot confirm a bag is
  // actually downloadable. Set after the API becomes ready (#68).
  reachable?: boolean | null
}

// -----------------------------------------------------------------------
// Spawn + ready-wait
// -----------------------------------------------------------------------

// Port helpers moved to `./ports.ts` in v0.8 cleanup batch 7. Re-exported
// here so existing call sites (rldp-http-proxy-process.ts and tests) keep
// importing from `./tonutils-process`. New callers should import from
// `./ports` directly.
export { findFreeTcpPort as findFreePort, findFreeUdpPort }

// -----------------------------------------------------------------------
// Network config (#33 testnet-via-MCP)
//
// tonutils-storage defaults to mainnet. For testnet it needs a global
// config file passed via `-network-config`. We download + cache the
// testnet config in BIN_DIR. Mainnet returns undefined (daemon default).
// -----------------------------------------------------------------------

const TESTNET_CONFIG_CACHE = path.join(BIN_DIR, 'testnet-global.config.json')

export async function ensureTonutilsNetworkConfig(testnet: boolean): Promise<string | undefined> {
  if (!testnet) return undefined
  if (existsSync(TESTNET_CONFIG_CACHE)) return TESTNET_CONFIG_CACHE
  const url = getNetworkConfig(true).daemonConfigUrl
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`failed to fetch testnet global config from ${url} (HTTP ${res.status})`)
  }
  const text = await res.text()
  JSON.parse(text) // sanity: must be valid JSON before we cache it
  mkdirSync(BIN_DIR, { recursive: true })
  writeFileSync(TESTNET_CONFIG_CACHE, text)
  return TESTNET_CONFIG_CACHE
}

export interface EnsureTonutilsConfigOptions {
  // Absolute path to a nodes-pool.json that the bundled tunnel client
  // should route through. Pre-validated by the caller (see
  // resolveTunnelConfig in cli/deploy-tonutils.ts).
  tunnelConfigPath?: string
  // Public IP to ANNOUNCE to the DHT for a publicly-reachable cloud seeder.
  // tonutils-storage binds to ListenAddr (0.0.0.0:port) but downloaders can
  // only find it if it advertises a reachable external address. On a 1:1-NAT
  // VM (GCP/AWS) the external IP is not on any local interface, so the
  // daemon's own port-checker cannot detect it and the node silently runs
  // download-only ("server mode: false"). Maps to config.json `ExternalIP`.
  externalIp?: string
  // Fixed UDP port for ListenAddr so a firewall rule can be pre-opened for a
  // cloud seeder. Omit to keep the historic behaviour (a free port chosen at
  // start) — fine for a local transient daemon, unusable for a server whose
  // port must be stable and firewalled.
  listenPort?: number
}

export interface AnnounceConfig {
  externalIp?: string
  listenPort?: number
}

// Cloud-seeder knobs (dogfood 2026-06-21). A kit-managed tonutils-storage
// daemon binds 0.0.0.0:<random udp> and never sets ExternalIP, so on a public
// VM it announces nothing a downloader can reach. These env vars let an
// operator run the kit AS a publicly-reachable seeder:
//   SOVEREIGN_ANNOUNCE_IP=<public ip>  -> config.json ExternalIP (DHT announce)
//   SOVEREIGN_ANNOUNCE_PORT=<udp port> -> fixed ListenAddr port (firewall-able)
// Both are optional and independent; a real cloud seeder sets both (a stable,
// firewall-opened port plus the advertised IP). Invalid values fail fast
// rather than silently producing an unreachable node.
// Per-field env getters (#69): kept separate so the resolver can short-circuit
// past a stale/malformed env var when the operator overrode that field on the
// command line. Each validates only its own var.
export function announceIpFromEnv(env: NodeJS.ProcessEnv): string | undefined {
  const ip = env.SOVEREIGN_ANNOUNCE_IP?.trim()
  if (!ip) return undefined
  // IPv4 only: ensureTonutilsConfig binds ListenAddr to 0.0.0.0 (IPv4), so
  // announcing an IPv6 ExternalIP would advertise an address the node cannot
  // actually serve. Reject it rather than ship a dead announce.
  if (isIP(ip) !== 4) {
    throw new Error(
      `SOVEREIGN_ANNOUNCE_IP must be a valid IPv4 address (got "${ip}"). ` +
      `Set it to the VM's public IPv4 — the address downloaders will reach. ` +
      `(IPv6 is not supported yet: the daemon binds 0.0.0.0, i.e. IPv4 only.)`,
    )
  }
  return ip
}

export function announcePortFromEnv(env: NodeJS.ProcessEnv): number | undefined {
  const portRaw = env.SOVEREIGN_ANNOUNCE_PORT?.trim()
  if (!portRaw) return undefined
  const port = Number(portRaw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `SOVEREIGN_ANNOUNCE_PORT must be an integer in 1..65535 (got "${portRaw}").`,
    )
  }
  return port
}

export function parseAnnounceEnv(env: NodeJS.ProcessEnv): AnnounceConfig {
  return { externalIp: announceIpFromEnv(env), listenPort: announcePortFromEnv(env) }
}

// Per-field precedence (#69): an explicit announce value (from
// --announce-ip / --announce-port, validated upstream) wins; otherwise fall
// back to the env var FOR THAT FIELD. The `??` short-circuits, so when a field
// is overridden the corresponding env var is never read or validated — a stale
// malformed env var can't abort a command that overrode it (Codex review).
export function resolveAnnounce(explicit: AnnounceConfig, env: NodeJS.ProcessEnv): AnnounceConfig {
  return {
    externalIp: explicit.externalIp ?? announceIpFromEnv(env),
    listenPort: explicit.listenPort ?? announcePortFromEnv(env),
  }
}

// Produce a config.json with a non-default ListenAddr UDP port. The very
// first run of tonutils-storage generates config.json (with Key + tunnel
// data) and only then tries to listen on UDP 17555, panicking if the port
// is busy (e.g. TON Browser.app's own daemon already runs there). We
// exploit the order by letting it generate the file, killing the process,
// rewriting ListenAddr to a free UDP port, then starting again.
export async function ensureTonutilsConfig(
  daemonPath: string,
  dbDir: string,
  cfgOpts: EnsureTonutilsConfigOptions = {},
): Promise<void> {
  // Defensive: NodesPoolConfigPath must be absolute or daemon's `os.Open`
  // will resolve it relative to its CWD (the session db dir), which the
  // user did NOT pass. Caller (resolveTunnelConfig) already absolutises;
  // double-check here so a future caller that forgets isn't silently
  // broken.
  if (cfgOpts.tunnelConfigPath && !path.isAbsolute(cfgOpts.tunnelConfigPath)) {
    throw new Error(
      `Internal: ensureTonutilsConfig got a relative tunnelConfigPath ` +
      `(${cfgOpts.tunnelConfigPath}). Caller must absolutise.`,
    )
  }
  const configPath = path.join(dbDir, 'config.json')

  if (!existsSync(configPath)) {
    // Step 1: short-lived spawn to let the daemon generate the file.
    // Both the polling timer and the child's `exit` event can race to
    // resolve, and in either branch we need to clean up the other —
    // hence the explicit `settled` guard.
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const child = spawn(daemonPath, ['--db', dbDir], { stdio: 'ignore', detached: false })

      let timer: NodeJS.Timeout | undefined
      let giveUp: NodeJS.Timeout | undefined

      const cleanup = () => {
        if (timer) clearInterval(timer)
        if (giveUp) clearTimeout(giveUp)
        try { child.kill('SIGKILL') } catch { /* ignore */ }
      }

      const succeed = () => {
        if (settled) return
        settled = true
        cleanup()
        resolve()
      }

      const fail = (err: Error) => {
        if (settled) return
        settled = true
        cleanup()
        reject(err)
      }

      timer = setInterval(() => {
        if (existsSync(configPath)) succeed()
      }, 200)

      giveUp = setTimeout(() => {
        fail(new Error('tonutils-storage did not produce config.json within 8 s'))
      }, 8_000)

      child.on('exit', () => {
        if (existsSync(configPath)) succeed()
        else fail(new Error('tonutils-storage exited before producing config.json'))
      })

      child.on('error', (err) => {
        fail(new Error(`tonutils-storage spawn (config-gen step) failed: ${err.message}`))
      })
    })
  }

  // Step 2: rewrite ListenAddr to a free UDP port so we don't collide with
  // any other tonutils-storage instance on the machine; if the caller
  // supplied a tunnel pool path, wire it into TunnelConfig too.
  const cfg = JSON.parse(readFileSync(configPath, 'utf-8'))
  const port = cfgOpts.listenPort ?? (await findFreeUdpPort())
  cfg.ListenAddr = `0.0.0.0:${port}`
  // Cloud seeder (dogfood 2026-06-21): advertise the reachable public IP so
  // downloaders can find this node via the DHT. Without it the daemon's
  // port-checker cannot reach a 1:1-NAT VM and the node runs download-only.
  if (cfgOpts.externalIp) {
    cfg.ExternalIP = cfgOpts.externalIp
  }
  if (cfgOpts.tunnelConfigPath) {
    cfg.TunnelConfig = cfg.TunnelConfig ?? {}
    cfg.TunnelConfig.NodesPoolConfigPath = cfgOpts.tunnelConfigPath
  }
  writeFileSync(configPath, JSON.stringify(cfg, null, '\t'))
}

// Parse the tonutils-storage port-checker verdict out of its startup log.
// The daemon prints (ANSI-coloured) one of:
//   "Storage started, server mode: true"   → publicly reachable
//   "Storage started, server mode: false"  → download-only (NAT / no public IP)
// after probing itself via an external port checker. Returns null when the
// verdict isn't present (yet) or the log wording changed — callers MUST treat
// null as "unknown", never "unreachable". #68.
export function parseServerMode(output: string): boolean | null {
  const m = output.match(/server mode:\s*(true|false)/i)
  if (!m) return null
  return m[1].toLowerCase() === 'true'
}

export interface StartTonutilsDaemonOptions {
  tunnelConfigPath?: string
  /** Path to a global network config (testnet); omit for mainnet default. */
  networkConfigPath?: string
  /**
   * Cloud-seeder announce overrides (#69), already validated by the caller.
   * Take precedence (per-field) over the SOVEREIGN_ANNOUNCE_IP / _PORT env
   * vars; when both are omitted the env vars are used (the #67 behaviour).
   */
  externalIp?: string
  listenPort?: number
  /**
   * Persistent db dir (#37 service mode). When set, the daemon uses this
   * dir instead of an ephemeral mkdtemp one, and kill() does NOT delete it
   * (the OS service unit resumes seeding from here). Omit for the default
   * ephemeral behaviour.
   */
  dbDir?: string
}

export async function startTonutilsDaemon(
  opts: StartTonutilsDaemonOptions = {},
): Promise<TonutilsHandle> {
  const paths = getTonutilsPaths()
  if (!existsSync(paths.daemon)) {
    throw new Error(`tonutils-storage binary not found at ${paths.daemon}; run ensureTonutilsBinary() first`)
  }

  const apiPort = await findFreeTcpPort(7100, 7199)
  // Default: an ephemeral mkdtemp session dir, rm'd on kill(). mkdtempSync
  // so two concurrent startTonutilsDaemon() calls in the same Node process
  // never collide (Codex pre-GA review round 7 MAJOR).
  //
  // #37 service mode: when `opts.dbDir` is given, the daemon uses that
  // PERSISTENT db and kill() must NOT delete it — the OS service unit will
  // resume seeding from the same dir after this embedded daemon is stopped.
  // `cleanupDir` is the dir kill() rm's; null = persistent (keep).
  let dbDir: string
  let cleanupDir: string | null
  if (opts.dbDir) {
    dbDir = opts.dbDir
    mkdirSync(dbDir, { recursive: true })
    cleanupDir = null
  } else {
    const sessionDir = mkdtempSync(path.join(os.tmpdir(), `ton-sovereign-tonutils-${process.pid}-`))
    dbDir = path.join(sessionDir, 'db')
    mkdirSync(dbDir, { recursive: true })
    cleanupDir = sessionDir
  }

  // Pre-stage config with a non-conflicting UDP ListenAddr (and tunnel pool
  // path if provided). Cloud-seeder announce: explicit --announce-ip/-port
  // (opts) win per-field; an un-overridden field falls back to the matching
  // SOVEREIGN_ANNOUNCE_* env var (only that var is read/validated). #69.
  const announce = resolveAnnounce({ externalIp: opts.externalIp, listenPort: opts.listenPort }, process.env)
  await ensureTonutilsConfig(paths.daemon, dbDir, {
    tunnelConfigPath: opts.tunnelConfigPath,
    externalIp: announce.externalIp,
    listenPort: announce.listenPort,
  })

  const child = spawn(
    paths.daemon,
    [
      // `-daemon` = non-interactive: suppress the command-line REPL. We drive
      // the daemon over the HTTP API, never the prompt; without this the REPL
      // can busy-loop at ~100% CPU when stdin is unusable (esp. long-running
      // --watch / service-mode handoff). See service.ts for the launchd story.
      '-daemon',
      '--api', `127.0.0.1:${apiPort}`,
      '--db', dbDir,
      // testnet: hand the daemon a global config (mainnet is its default).
      ...(opts.networkConfigPath ? ['--network-config', opts.networkConfigPath] : []),
    ],
    // stdin stays ignored (the `-daemon` flag suppresses the REPL, so there's
    // no stdin busy-loop risk); stdout/stderr are piped so we can read the
    // daemon's own port-checker verdict ("server mode: true/false") for an
    // honest reachability signal (#68). The pipes MUST be drained for the
    // daemon's lifetime or a full buffer would block it.
    { stdio: ['ignore', 'pipe', 'pipe'], detached: false },
  )

  // Accumulate startup logs (capped) so we can parse the port-checker verdict
  // once the API is ready. The handler stays attached and keeps reading past
  // the cap so the pipe never backs up; it just stops appending.
  let logBuf = ''
  const LOG_CAP = 64 * 1024
  const onLog = (chunk: Buffer): void => {
    if (logBuf.length < LOG_CAP) logBuf += chunk.toString('utf8')
  }
  child.stdout?.on('data', onLog)
  child.stderr?.on('data', onLog)

  // Capture the spawn error in a state we can check during waitForApi
  // instead of throwing inside the event handler (which becomes an
  // unhandled exception that bypasses the caller's try/catch).
  let spawnError: Error | undefined
  child.on('error', (err) => { spawnError = err })

  const handle: TonutilsHandle = {
    apiUrl: `http://127.0.0.1:${apiPort}`,
    dbDir,
    process: child,
    kill: () => {
      // Codex pre-GA review round 7 MAJOR: old kill() sent SIGTERM then
      // IMMEDIATELY rmSync'd the session dir, so a daemon that delayed
      // exit kept its UDP port alive while the DB dir was deleted.
      // Round 8 caught that the round-7 fix (Atomics.wait on main
      // thread) was also broken: blocking the main thread prevents
      // libuv from delivering the child's 'exit' event, so the
      // exitCode check would never see exit before the 2s timeout —
      // kill() always paid the full 2s + SIGKILL even on clean exits.
      //
      // This implementation:
      //   1. Send SIGTERM synchronously (returns immediately).
      //   2. Schedule the rmSync via `child.once('exit', ...)` so it
      //      runs AFTER the daemon's resources are released. The event
      //      loop delivers 'exit' once the process actually terminates.
      //   3. Set a 2 s timer that forces SIGKILL + same rmSync if
      //      'exit' hasn't fired by then.
      //   4. kill() returns synchronously — callers in SIGINT handlers
      //      and process-exit paths get the SIGTERM enqueued
      //      immediately and don't block.
      //
      // Trade-off: rmSync happens AFTER kill() returns. In emergency
      // abort paths (process.exit immediately after kill()) the rmSync
      // may not run — the OS reclaims the tmp dir on reboot anyway,
      // and rmSync isn't security-critical (only state cleanliness).
      // For SDK code that needs guaranteed cleanup, see the async
      // wrap in src/sdk/deploy.ts's finally.
      if (child.exitCode === null) {
        let cleanedUp = false
        const cleanup = (): void => {
          if (cleanedUp) return
          cleanedUp = true
          // cleanupDir is null for a persistent (#37 service) db — keep it.
          if (cleanupDir) {
            try { rmSync(cleanupDir, { recursive: true, force: true }) } catch { /* ignore */ }
          }
        }
        child.once('exit', cleanup)
        const escalation = setTimeout(() => {
          if (child.exitCode === null) {
            try { child.kill('SIGKILL') } catch { /* ignore */ }
            // SIGKILL is delivered immediately by the kernel — give
            // libuv one tick to fire 'exit' before forcing cleanup.
            setImmediate(() => {
              if (!cleanedUp) cleanup()
            })
          }
        }, 2_000)
        // Don't keep the Node event loop alive solely for the
        // escalation timer — if everything else is done, let the
        // process exit and skip the SIGKILL fallback.
        escalation.unref()
        try { child.kill('SIGTERM') } catch { /* already exited */ }
      } else if (cleanupDir) {
        // Already exited — clean up the ephemeral dir synchronously.
        // (cleanupDir is null for a persistent #37 service db — keep it.)
        try { rmSync(cleanupDir, { recursive: true, force: true }) } catch { /* ignore */ }
      }
    },
  }

  try {
    await waitForApi(handle, 30_000, () => spawnError)
  } catch (err) {
    handle.kill()
    throw err
  }
  // The daemon logs its port-checker verdict ("server mode: …") BEFORE it
  // opens the HTTP API, so by the time waitForApi resolves the verdict is
  // already in logBuf — reading it here adds no latency. null = unknown.
  handle.reachable = parseServerMode(logBuf)
  return handle
}

async function waitForApi(
  handle: TonutilsHandle,
  timeoutMs = 30_000,
  getSpawnError?: () => Error | undefined,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const spawnErr = getSpawnError?.()
    if (spawnErr) {
      throw new Error(`tonutils-storage spawn failed: ${spawnErr.message}`)
    }
    // Early-exit if the daemon already died (e.g. lost the UDP-port race
    // and panicked). Without this we'd burn the full timeoutMs probing a
    // dead PID. Codex/Claude review note (W2): this was an open
    // robustness item.
    if (handle.process.exitCode !== null && handle.process.exitCode !== 0) {
      throw new Error(
        `tonutils-storage exited with code ${handle.process.exitCode} during startup. ` +
        `Most common cause: another process bound the daemon's UDP ListenAddr ` +
        `(likely TON Browser.app's bundled tonutils-storage) between our probe and the daemon's bind. ` +
        `Re-run, or stop the other tonutils instance first.`,
      )
    }
    // Each fetch needs its own timeout — Node 18+'s fetch has no default,
    // so a stuck connect would otherwise hang past the outer deadline.
    const ac = new AbortController()
    const probeTimer = setTimeout(() => ac.abort(), 1_500)
    try {
      const r = await fetch(`${handle.apiUrl}/api/v1/list`, { method: 'GET', signal: ac.signal })
      clearTimeout(probeTimer)
      if (r.ok) return
    } catch {
      clearTimeout(probeTimer)
      /* not ready yet */
    }
    await sleep(300)
  }
  throw new Error(`tonutils-storage did not accept HTTP on ${handle.apiUrl} within ${timeoutMs} ms`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// -----------------------------------------------------------------------
// HTTP API client
// -----------------------------------------------------------------------

export interface TonutilsBagSummary {
  bag_id: string
  description: string
  downloaded: number
  size: number
  files_count: number
  dir_name: string
  completed: boolean
  header_loaded: boolean
  info_loaded: boolean
  active: boolean
  seeding: boolean
}

export interface TonutilsBagDetails extends TonutilsBagSummary {
  piece_size: number
  bag_size: number
  merkle_hash: string             // hex; this is TorrentInfo.RootHash
  path: string
  files: Array<{ index: number; name: string; size: number }>
  peers?: Array<{ addr: string; id: string }>
}

async function api<T>(handle: TonutilsHandle, path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${handle.apiUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`tonutils ${path} → HTTP ${r.status}: ${body.slice(0, 200)}`)
  }
  return (await r.json()) as T
}

export async function tonutilsCreate(
  handle: TonutilsHandle,
  args: { path: string; description: string },
): Promise<{ bag_id: string }> {
  return api(handle, '/api/v1/create', {
    method: 'POST',
    body: JSON.stringify(args),
  })
}

export async function tonutilsDetails(
  handle: TonutilsHandle,
  bagId: string,
): Promise<TonutilsBagDetails> {
  return api(handle, `/api/v1/details?bag_id=${encodeURIComponent(bagId)}`)
}

export async function tonutilsList(
  handle: TonutilsHandle,
): Promise<{ bags: TonutilsBagSummary[] }> {
  // tonutils-storage returns `{}` (or `{bags: null}`) when there are no
  // bags registered yet — depending on version. Normalise to an empty
  // array so callers can iterate unconditionally.
  const r = await api<{ bags?: TonutilsBagSummary[] | null }>(handle, '/api/v1/list')
  return { bags: r.bags ?? [] }
}

export async function tonutilsRemove(
  handle: TonutilsHandle,
  args: { bag_id: string; with_files?: boolean },
): Promise<{ ok: boolean }> {
  return api(handle, '/api/v1/remove', {
    method: 'POST',
    body: JSON.stringify({ with_files: false, ...args }),
  })
}
