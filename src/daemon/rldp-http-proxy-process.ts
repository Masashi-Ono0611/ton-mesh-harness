// rldp-http-proxy lifecycle: mint identity → spawn proxy → spawn local
// static-file server → cleanup. Pairs with v0.7's `--site auto` flag.

import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import http, { type Server } from 'node:http'
import {
  generateAdnlIdentity,
  loadOrCreateSiteSeed,
  resolveSiteKeyringPath,
  writeKeyringFile,
  type AdnlIdentity,
} from './keyring'
import { guessPrimaryIface, isPublicIpLocallyBound } from './net'
import { findFreeTcpPort, findFreeUdpPort } from './ports'
import { getRldpHttpProxyPaths } from './rldp-http-proxy-installer'

const TON_GLOBAL_CONFIG_URL = 'https://ton-blockchain.github.io/global.config.json'

export interface RldpHttpProxyHandle {
  identity: AdnlIdentity      // shortIdHex etc — pass shortIdHex into --site-adnl
  domain: string              // the .ton hostname being served
  publicIp: string            // IP published in ADNL DHT entry
  udpPort: number             // server UDP port (inbound from TON network; reused for outbound)
  localHttpPort: number       // Node static-server TCP port (loopback only)
  dbDir: string
  /** Absolute path of the persisted seed backing `identity`. */
  siteKeyringPath: string
  /** False when the identity was freshly minted this run, true when reused. */
  identityReused: boolean
  proxy: ChildProcess
  staticServer: Server
  kill: () => void
}

export interface StartRldpHttpProxyOptions {
  buildDir: string            // absolute path to the static files
  domain: string              // e.g. "mydapp.ton"
  publicIp?: string           // override; auto-detected via api.ipify.org if absent
  udpPort?: number            // override; findFreeUdpPort if absent
  /**
   * `--site-keyring` override: path to the persisted 32-byte seed file backing
   * the ADNL identity. When absent, a per-domain default under
   * `~/.ton-mesh/site-keyring/` is used. Either way the identity is
   * reused across runs so the on-chain `site` record stays valid.
   */
  siteKeyring?: string
  /**
   * Suppresses the human-readable startup banner (the "Listening on
   * udp …" / "Mapping mydapp.ton → 127.0.0.1:…" lines). The
   * --json-output stdout is the deploy result; this output goes to
   * stderr regardless.
   */
  silent?: boolean
}

/**
 * Spawn rldp-http-proxy + a tiny static file server, wired together so
 * inbound RLDP requests for `domain` are forwarded to local files.
 */
export async function startRldpHttpProxy(
  opts: StartRldpHttpProxyOptions,
): Promise<RldpHttpProxyHandle> {
  if (!path.isAbsolute(opts.buildDir)) {
    throw new Error(`startRldpHttpProxy: buildDir must be absolute (got ${opts.buildDir})`)
  }
  if (!existsSync(opts.buildDir) || !statSync(opts.buildDir).isDirectory()) {
    throw new Error(`startRldpHttpProxy: buildDir does not exist or is not a directory: ${opts.buildDir}`)
  }
  const proxyPaths = getRldpHttpProxyPaths()
  if (!existsSync(proxyPaths.daemon)) {
    throw new Error(`rldp-http-proxy binary not found at ${proxyPaths.daemon}; call ensureRldpHttpProxyBinary() first`)
  }

  // Per-process db dir under the OS temp. Self-audit (Codex r11 class):
  //   - `mkdtempSync` for collision-free naming, mirroring tonutils-process
  //     (the PID+Date.now() approach could theoretically collide on
  //     sub-ms restarts).
  //   - The dir holds the ADNL keyring + a proxy.log that may contain
  //     request paths / IDs. mkdtempSync creates with 0o700 on POSIX
  //     by default; on Windows the user-profile ACL is the protection.
  //   - Cleaned up via rmSync in kill() (previously LEAKED on every
  //     run — every --site auto invocation left a stray dir in /tmp).
  const sessionDir = mkdtempSync(path.join(tmpdir(), `ton-mesh-proxy-${process.pid}-`))
  const dbDir = path.join(sessionDir, 'db')
  mkdirSync(dbDir, { recursive: true, mode: 0o700 })

  // Mainnet config (lightweight 12 KB JSON, refreshed if missing).
  const globalCfgPath = path.join(dbDir, 'ton-global.config.json')
  await downloadFileTo(TON_GLOBAL_CONFIG_URL, globalCfgPath)

  // Load (or mint + persist) the ADNL identity from a stable seed so the
  // on-chain `site` record keeps pointing at a live identity across restarts.
  // The rldp keyring file itself is rebuilt from the seed each run.
  const siteKeyringPath = resolveSiteKeyringPath(opts.domain, opts.siteKeyring)
  const { seed, created } = loadOrCreateSiteSeed(siteKeyringPath)
  const identity = generateAdnlIdentity(seed)
  const identityReused = !created
  writeKeyringFile(dbDir, identity)

  // Resolve transport endpoints.
  const publicIp = opts.publicIp ?? (await detectPublicIp())
  if (!publicIp) {
    throw new Error(
      `Could not detect public IP for rldp-http-proxy. Pass --site-public-ip <ip> ` +
      `(or run on a host with internet egress so api.ipify.org responds).`,
    )
  }

  // Cloud-NAT preflight advisory: rldp binds its client socket to `-a publicIp`.
  // On a 1:1 NAT VM the public IP isn't on any NIC, so the bind fails and the
  // proxy can't sync the liteserver. Surface the exact fix and continue (the
  // kit never runs the privileged command; a non-NAT VPS won't trip this).
  if (!opts.silent && !isPublicIpLocallyBound(publicIp)) {
    const iface = guessPrimaryIface() ?? '<iface>'
    process.stderr.write(
      `  ⚠ ${publicIp} is announced to the DHT but is not assigned to any local interface.\n` +
      `    On a 1:1 NAT cloud VM (GCP/AWS), bind it so rldp can sync the liteserver:\n` +
      `      sudo ip addr add ${publicIp}/32 dev ${iface}\n` +
      (iface === '<iface>' ? `    (find your interface with: ip -o link)\n` : '') +
      `    Without this the proxy starts but can't reach the network and the site won't serve.\n`,
    )
  }

  const udpPort = opts.udpPort ?? (await findFreeUdpPort(17600, 17699))
  const localHttpPort = await findFreeTcpPort(18080, 18099)

  // Local static-file server FIRST so the proxy has somewhere to forward to.
  const staticServer = await startStaticServer(opts.buildDir, localHttpPort)

  // Spawn the proxy. `-R domain.ton:80@127.0.0.1:<localHttpPort>` is the
  // server-mode mapping; -A pins the ADNL identity to our minted key.
  const proxyArgs = [
    '-C', globalCfgPath,
    '-D', dbDir,
    // -A expects the 55-char base32+CRC16 form, NOT hex. (TON's adnl_id_decode.)
    '-A', identity.shortIdEncoded,
    // -a alone sets server mode. -c (client_port) would force client-only
    // and conflict with -A; the proxy reuses -a's UDP socket for outbound.
    '-a', `${publicIp}:${udpPort}`,
    '-R', `${opts.domain}:80@127.0.0.1:${localHttpPort}`,
    '-l', path.join(dbDir, 'proxy.log'),
  ]

  const proxy = spawn(proxyPaths.daemon, proxyArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  // Capture stdout+stderr during the startup window so a failure can surface
  // the proxy's actual error (#75). Two birds: with no reader attached the
  // piped fds were never drained, so a chatty proxy could block on write once
  // the OS pipe buffer filled. We keep draining for the proxy's whole life
  // (discarding post-startup) and only retain a capped tail for diagnostics.
  const logPath = path.join(dbDir, 'proxy.log')
  const OUTPUT_CAP = 16_384
  let capturing = true
  let capturedOutput = ''
  const onData = (chunk: Buffer): void => {
    if (!capturing) return // drain-and-discard after startup (avoid pipe backpressure)
    capturedOutput += chunk.toString()
    if (capturedOutput.length > OUTPUT_CAP) capturedOutput = capturedOutput.slice(-OUTPUT_CAP)
  }
  proxy.stdout?.on('data', onData)
  proxy.stderr?.on('data', onData)

  // The proxy doesn't expose an obvious "ready" marker. We wait briefly
  // for it to settle then check it didn't immediately exit.
  let spawnError: Error | undefined
  proxy.on('error', (err) => { spawnError = err })

  await sleep(2_000)
  // Cleanup helper for the startup-failure paths below: close the
  // static server AND drop the session dir. Previously the session
  // dir leaked on every failed startup. Self-audit class.
  const cleanupStartupFailure = (): void => {
    try { staticServer.close() } catch { /* ignore */ }
    try { rmSync(sessionDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
  if (proxy.exitCode !== null && proxy.exitCode !== 0) {
    // #75: assemble the diagnostic (proxy.log tail + captured stdout/stderr)
    // BEFORE cleanupStartupFailure rmSync's the session dir — the old message
    // pointed at a log it then deleted, turning the #74 keyring bug into a
    // multi-hour diagnosis. Inline the cause so the error is self-diagnosing.
    const diag = buildStartupDiagnostic(logPath, capturedOutput)
    cleanupStartupFailure()
    throw new Error(`rldp-http-proxy exited with code ${proxy.exitCode} during startup.${diag}`)
  }
  if (spawnError) {
    const diag = buildStartupDiagnostic(logPath, capturedOutput)
    cleanupStartupFailure()
    throw new Error(`rldp-http-proxy spawn failed: ${spawnError.message}${diag}`)
  }
  // Startup succeeded — stop retaining output but keep draining the pipes.
  capturing = false
  capturedOutput = ''

  if (!opts.silent) {
    process.stderr.write(
      `  rldp-http-proxy listening on udp ${publicIp}:${udpPort}, ` +
      `forwarding ${opts.domain} → 127.0.0.1:${localHttpPort}\n`,
    )
  }

  // Async-safe teardown mirroring src/daemon/tonutils-process.ts::kill.
  // Codex pre-GA self-audit (round 11 class). The proxy is a Go binary
  // that should exit on SIGTERM within ~100ms, but a hung daemon could
  // hold its UDP port. Schedule rmSync via child 'exit' event so the
  // session dir survives until the proxy releases the keyring file
  // handle. Escalate to SIGKILL on 2s timeout. Static server closes
  // immediately (no async resources to wait on).
  const kill = (() => {
    let killed = false
    return () => {
      if (killed) return
      killed = true
      try { staticServer.close() } catch { /* ignore */ }

      if (proxy.exitCode !== null) {
        // Already exited — clean up synchronously.
        try { rmSync(sessionDir, { recursive: true, force: true }) } catch { /* ignore */ }
        return
      }
      let cleanedUp = false
      const cleanup = (): void => {
        if (cleanedUp) return
        cleanedUp = true
        try { rmSync(sessionDir, { recursive: true, force: true }) } catch { /* ignore */ }
      }
      proxy.once('exit', cleanup)
      const escalation = setTimeout(() => {
        if (proxy.exitCode === null) {
          try { proxy.kill('SIGKILL') } catch { /* ignore */ }
          setImmediate(() => { if (!cleanedUp) cleanup() })
        }
      }, 2_000)
      escalation.unref()
      try { proxy.kill('SIGTERM') } catch { /* ignore */ }
    }
  })()

  return {
    identity,
    domain: opts.domain,
    publicIp,
    udpPort,
    localHttpPort,
    dbDir,
    siteKeyringPath,
    identityReused,
    proxy,
    staticServer,
    kill,
  }
}

/**
 * Auto-detect the public IPv4 by asking api.ipify.org. Returns null on any
 * failure so the caller can surface a clean error.
 */
export async function detectPublicIp(): Promise<string | null> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 4_000)
  try {
    const r = await fetch('https://api.ipify.org', { signal: ac.signal })
    if (!r.ok) return null
    const ip = (await r.text()).trim()
    return /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ----- static file server (small, no extra deps) -----

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
}

async function startStaticServer(rootAbs: string, port: number): Promise<Server> {
  const root = path.resolve(rootAbs)
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0])
      let target = path.resolve(root, '.' + urlPath)
      // Path-traversal guard: target must remain under root.
      if (!(target === root || target.startsWith(root + path.sep))) {
        res.writeHead(403); res.end('forbidden'); return
      }
      // Directory → index.html
      if (existsSync(target) && statSync(target).isDirectory()) {
        target = path.join(target, 'index.html')
      }
      // Missing → SPA fallback to root index.html
      if (!existsSync(target)) {
        target = path.join(root, 'index.html')
      }
      if (!existsSync(target)) {
        res.writeHead(404); res.end('not found'); return
      }
      const ext = path.extname(target).toLowerCase()
      res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' })
      createReadStream(target).pipe(res)
    } catch {
      res.writeHead(500); res.end('error')
    }
  })

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => { server.off('listening', onListening); reject(err) }
    const onListening = () => { server.off('error', onError); resolve() }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, '127.0.0.1')
  })
  return server
}

// ----- helpers -----

/**
 * Build a self-diagnosing tail for a startup-failure error (#75): the last
 * few KB of `proxy.log` plus whatever the proxy wrote to stdout/stderr before
 * exiting. Returns '' (so the caller's message stays clean) when nothing was
 * captured — e.g. a spawn ENOENT before the log file existed.
 */
export function buildStartupDiagnostic(logPath: string, capturedOutput: string): string {
  const parts: string[] = []
  let logTail = ''
  try {
    const buf = readFileSync(logPath)
    const tail = buf.length > 4_000 ? buf.subarray(buf.length - 4_000) : buf
    logTail = tail.toString('utf8').trim()
  } catch { /* log may not exist yet on a very early failure */ }
  if (logTail) parts.push(`--- proxy.log (tail) ---\n${logTail}`)
  const out = capturedOutput.trim()
  if (out) parts.push(`--- proxy stdout/stderr ---\n${out.slice(-2_000)}`)
  return parts.length ? `\n${parts.join('\n')}` : ' (no proxy.log or stderr captured)'
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function downloadFileTo(url: string, dest: string): Promise<void> {
  if (existsSync(dest) && statSync(dest).size > 0) return
  // Use curl for parity with the installer module; avoids pulling another
  // HTTP path into the runtime.
  const tmp = dest + '.tmp'
  const r = spawnSync('curl', ['-fsSL', '-o', tmp, url], { stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.status !== 0) {
    throw new Error(`Failed to download ${url} (curl exit ${r.status})`)
  }
  renameSync(tmp, dest)
}

// Re-export — tests import from this module to inspect identity bytes.
export { writeKeyringFile, generateAdnlIdentity, computeAdnlShortId } from './keyring'
