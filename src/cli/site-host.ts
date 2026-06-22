// `--site auto` orchestrator: install rldp-http-proxy, mint ADNL identity,
// spawn proxy + local static server, return a handle the caller can pass
// into runDnsRegistration so the auto-minted hex is published as the
// dns_adnl_address record alongside the storage record.
//
// Counterpart of the v0.6 BYO flow (`--site-adnl <hex>` with the user's
// own VPS-hosted proxy). The byo path stays in tree as a fallback.

import path from 'node:path'
import os from 'node:os'
import { writeFileSync, mkdirSync } from 'node:fs'
import chalk from 'chalk'
import { generateAdnlIdentity, loadOrCreateSiteSeed, resolveSiteKeyringPath } from '../daemon/keyring'
import { ensureRldpHttpProxyBinary } from '../daemon/rldp-http-proxy-installer'
import { startRldpHttpProxy, type RldpHttpProxyHandle } from '../daemon/rldp-http-proxy-process'
import { installSiteService, siteServiceLabel, type SiteServiceMeta } from '../daemon/site-service'
import { lingerAdvisory } from '../daemon/linger'

export interface RunSiteHostOptions {
  buildDir: string             // absolute
  domain: string               // e.g. "mydapp.ton"
  publicIp?: string            // override; auto-detected if absent
  udpPort?: number             // override; findFreeUdpPort if absent
  siteKeyring?: string         // --site-keyring override (persisted seed path)
  silent?: boolean             // suppress banner output (--json-output)
}

export interface SiteHostResult {
  handle: RldpHttpProxyHandle
  /** 64-char lowercase hex ADNL identity — feed into --site-adnl. */
  siteAdnlHex: string
}

const SITE_ADNL_TXT_PATH = path.join(os.homedir(), '.ton-sovereign', 'site-adnl.txt')

/**
 * Install + spawn rldp-http-proxy with a freshly minted ADNL identity,
 * serving the build directory under the given .ton domain. Returns the
 * proxy handle (for lifecycle management) and the hex form of the
 * identity (the value the DNS site record needs).
 */
export async function runSiteHost(opts: RunSiteHostOptions): Promise<SiteHostResult> {
  if (!opts.silent) {
    console.log()
    console.log(chalk.bold('🌐 Site host (--site auto)'))
    console.log(chalk.dim('  Installing rldp-http-proxy if needed…'))
  }
  ensureRldpHttpProxyBinary({ silent: !!opts.silent })

  if (!opts.silent) {
    console.log(chalk.dim(`  Spawning rldp-http-proxy for ${opts.domain}…`))
  }

  const handle = await startRldpHttpProxy({
    buildDir: opts.buildDir,
    domain: opts.domain,
    publicIp: opts.publicIp,
    udpPort: opts.udpPort,
    siteKeyring: opts.siteKeyring,
    silent: !!opts.silent,
  })

  // Persist the ADNL hex so `doctor` and follow-up tooling can surface it
  // without re-spawning the proxy. Mode 0o600 — not actually a secret
  // (the hex IS the public ADNL identity), but the file path is conventionally
  // owner-only and we keep parity with the keyring file mode.
  try {
    mkdirSync(path.dirname(SITE_ADNL_TXT_PATH), { recursive: true })
    writeFileSync(SITE_ADNL_TXT_PATH, handle.identity.shortIdHex + '\n', { mode: 0o600 })
  } catch { /* best-effort diagnostic — never block the deploy */ }

  if (!opts.silent) {
    console.log(chalk.green(`  ✔ Site ADNL: ${handle.identity.shortIdHex}`))
    console.log(chalk.dim(
      handle.identityReused
        ? `    identity:   reused (stable across restarts) ← ${handle.siteKeyringPath}`
        : `    identity:   minted + persisted → ${handle.siteKeyringPath}`,
    ))
    console.log(chalk.dim(`    encoded:    ${handle.identity.shortIdEncoded}`))
    console.log(chalk.dim(`    public:     ${handle.publicIp}:${handle.udpPort} (UDP)`))
    console.log(chalk.dim(`    local http: 127.0.0.1:${handle.localHttpPort} → ${opts.buildDir}`))
    console.log()
    console.log(chalk.yellow(
      '  ⚠ The proxy needs UDP ' + handle.udpPort + ' reachable from the public internet. ' +
      'Behind NAT? Set up a port-forward or run on a VPS.',
    ))
    console.log(chalk.dim(`    Recorded at ${SITE_ADNL_TXT_PATH}`))
    console.log()
  }

  return {
    handle,
    siteAdnlHex: handle.identity.shortIdHex,
  }
}

export interface InstallSiteServiceOptions {
  buildDir: string // absolute
  domain: string // e.g. "mysite.ton"
  siteKeyring?: string // --site-keyring override
  publicIp?: string // pinned --site-public-ip (recommended for a stable firewall rule)
  udpPort?: number // pinned --site-udp-port
  silent?: boolean
}

export interface InstalledSiteService {
  /** Public ADNL hex — published as the `site` DNS record. */
  siteAdnlHex: string
  siteKeyringPath: string
  identityReused: boolean
}

/**
 * Install the `--site-auto --daemon-mode service` gateway: derive the stable
 * ADNL from the persisted seed (so we can write the DNS record WITHOUT owning
 * the proxy), then hand `site-serve` to launchd / systemd. The service
 * re-derives the same identity from the same seed on every restart.
 */
export function installSiteServiceForDomain(opts: InstallSiteServiceOptions): InstalledSiteService {
  const siteKeyringPath = resolveSiteKeyringPath(opts.domain, opts.siteKeyring)
  const { seed, created } = loadOrCreateSiteSeed(siteKeyringPath)
  const identity = generateAdnlIdentity(seed)

  const meta: SiteServiceMeta = {
    domain: opts.domain,
    label: siteServiceLabel(opts.domain),
    build_dir: opts.buildDir,
    site_keyring: siteKeyringPath,
    public_ip: opts.publicIp ?? null,
    udp_port: opts.udpPort ?? null,
    node_path: process.execPath,
    // Absolute (symlink-following for global installs). A kit upgrade that
    // moves the entry needs a re-install.
    cli_entry: path.resolve(process.argv[1]),
    adnl_short_id: identity.shortIdHex,
    created_at: new Date().toISOString(),
  }
  installSiteService(meta)

  if (!opts.silent) {
    console.log()
    console.log(chalk.bold('🌐 Site gateway installed as an OS service (--daemon-mode service)'))
    console.log(chalk.dim(`  Domain:   ${opts.domain}`))
    console.log(chalk.dim(`  Site ADNL: ${identity.shortIdHex} (${created ? 'minted' : 'reused'})`))
    console.log(chalk.dim(`  identity: ${siteKeyringPath}`))
    console.log(chalk.dim(`  Manage:   ton-sovereign-deploy service list | service stop-site ${opts.domain}`))
    // On a headless Linux VM the systemd --user unit won't restart after an
    // unattended reboot unless lingering is enabled once (#83).
    const lingerHint = lingerAdvisory()
    if (lingerHint) console.log(chalk.yellow(`  ⚠ ${lingerHint}`))
    console.log()
  }

  return { siteAdnlHex: identity.shortIdHex, siteKeyringPath, identityReused: !created }
}
