// `site-serve` — the foreground entrypoint launchd / systemd runs for a
// `--site-auto --daemon-mode service` gateway. It starts the rldp-http-proxy +
// static server (re-deriving the SAME ADNL from the persisted seed) and stays
// in the foreground until SIGTERM/SIGINT, so the OS manager owns its lifecycle.
//
// Run directly too: `ton-sovereign-deploy site-serve --build-dir ./out
// --domain mysite.ton` keeps a site up in your terminal.

import path from 'node:path'
import chalk from 'chalk'
import { startRldpHttpProxy } from '../daemon/rldp-http-proxy-process'
import { ensureRldpHttpProxyBinary } from '../daemon/rldp-http-proxy-installer'

export interface SiteServeOptions {
  buildDir: string
  domain: string
  siteKeyring?: string
  publicIp?: string
  udpPort?: number
}

export async function runSiteServe(opts: SiteServeOptions): Promise<void> {
  const buildDir = path.resolve(opts.buildDir)

  ensureRldpHttpProxyBinary({ silent: false })
  const handle = await startRldpHttpProxy({
    buildDir,
    domain: opts.domain,
    publicIp: opts.publicIp,
    udpPort: opts.udpPort,
    siteKeyring: opts.siteKeyring,
    silent: false, // output is the service log — keep it informative
  })

  console.log(
    chalk.green(`✔ Serving ${opts.domain} — ADNL ${handle.identity.shortIdHex} ` +
      `(${handle.identityReused ? 'reused' : 'minted'}) on udp ${handle.publicIp}:${handle.udpPort}`),
  )

  // If the proxy child dies, exit non-zero so the OS manager (Restart=on-failure
  // / KeepAlive on unsuccessful exit) restarts the whole gateway.
  handle.proxy.on('exit', (code) => {
    console.error(chalk.red(`rldp-http-proxy exited (code ${code}); shutting down site-serve.`))
    try { handle.kill() } catch { /* already torn down */ }
    process.exit(code === 0 ? 1 : (code ?? 1))
  })

  // Clean shutdown on a stop request — exit 0 so the OS manager does NOT
  // resurrect it (KeepAlive SuccessfulExit:false / Restart=on-failure).
  let shuttingDown = false
  const shutdown = (): void => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(chalk.dim(`Stopping site-serve for ${opts.domain}…`))
    try { handle.kill() } catch { /* ignore */ }
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  // The static server + proxy child keep the event loop alive; this promise
  // never resolves (the process exits via a signal or the proxy-exit handler).
  await new Promise<void>(() => {})
}
