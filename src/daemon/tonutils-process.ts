// tonutils-storage daemon process management + HTTP API client.
// Counterpart of process.ts (TON Core daemon) for the xssnick / Go backend.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import os from 'os'
import net from 'net'
import dgram from 'dgram'
import { getTonutilsPaths } from './tonutils-installer'

export interface TonutilsHandle {
  apiUrl: string                // e.g. http://127.0.0.1:8192
  dbDir: string
  process: ChildProcess
  kill: () => void
}

// -----------------------------------------------------------------------
// Spawn + ready-wait
// -----------------------------------------------------------------------

export async function findFreePort(min = 7100, max = 7199): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port > max) {
        reject(new Error(`No free port found in range ${min}-${max}`))
        return
      }
      const server = net.createServer()
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(port))
      })
      server.on('error', () => tryPort(port + 1))
    }
    tryPort(min)
  })
}

async function findFreeUdpPort(min = 17556, max = 17600): Promise<number> {
  // Probe-then-spawn races a third party who may grab the port between
  // our close() and the daemon's bind(). The daemon panics in that case
  // and exits in <1 s, so we add an early-exit detection in waitForApi
  // (see below) instead of trying to make the probe atomic — which would
  // require fork-then-pass-fd-to-child plumbing we don't want.
  for (let p = min; p <= max; p++) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await new Promise<boolean>((resolve) => {
      const s = dgram.createSocket('udp4')
      s.once('error', () => resolve(false))
      s.bind(p, '0.0.0.0', () => { s.close(() => resolve(true)) })
    })
    if (ok) return p
  }
  throw new Error(`No free UDP port in range ${min}-${max} for tonutils ListenAddr`)
}

export interface EnsureTonutilsConfigOptions {
  // Absolute path to a nodes-pool.json that the bundled tunnel client
  // should route through. Pre-validated by the caller (see
  // resolveTunnelConfig in cli/deploy-tonutils.ts).
  tunnelConfigPath?: string
}

// Produce a config.json with a non-default ListenAddr UDP port. The very
// first run of tonutils-storage generates config.json (with Key + tunnel
// data) and only then tries to listen on UDP 17555, panicking if the port
// is busy (e.g. TON Browser.app's own daemon already runs there). We
// exploit the order by letting it generate the file, killing the process,
// rewriting ListenAddr to a free UDP port, then starting again.
async function ensureTonutilsConfig(
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
  const port = await findFreeUdpPort()
  cfg.ListenAddr = `0.0.0.0:${port}`
  if (cfgOpts.tunnelConfigPath) {
    cfg.TunnelConfig = cfg.TunnelConfig ?? {}
    cfg.TunnelConfig.NodesPoolConfigPath = cfgOpts.tunnelConfigPath
  }
  writeFileSync(configPath, JSON.stringify(cfg, null, '\t'))
}

export interface StartTonutilsDaemonOptions {
  tunnelConfigPath?: string
}

export async function startTonutilsDaemon(
  opts: StartTonutilsDaemonOptions = {},
): Promise<TonutilsHandle> {
  const paths = getTonutilsPaths()
  if (!existsSync(paths.daemon)) {
    throw new Error(`tonutils-storage binary not found at ${paths.daemon}; run ensureTonutilsBinary() first`)
  }

  const apiPort = await findFreePort(7100, 7199)
  const sessionDir = path.join(os.tmpdir(), `ton-sovereign-tonutils-${process.pid}`)
  const dbDir = path.join(sessionDir, 'db')
  mkdirSync(dbDir, { recursive: true })

  // Pre-stage config with a non-conflicting UDP ListenAddr (and tunnel
  // pool path if provided).
  await ensureTonutilsConfig(paths.daemon, dbDir, {
    tunnelConfigPath: opts.tunnelConfigPath,
  })

  const child = spawn(
    paths.daemon,
    [
      '--api', `127.0.0.1:${apiPort}`,
      '--db', dbDir,
    ],
    { stdio: 'ignore', detached: false },
  )

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
      try { child.kill('SIGTERM') } catch { /* ignore */ }
      try { rmSync(sessionDir, { recursive: true, force: true }) } catch { /* ignore */ }
    },
  }

  try {
    await waitForApi(handle, 30_000, () => spawnError)
  } catch (err) {
    handle.kill()
    throw err
  }
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
