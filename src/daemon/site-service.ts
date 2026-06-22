// OS service-manager ownership for the `--site-auto` rldp-http-proxy gateway.
//
// `--site-auto --daemon-mode service` hands the proxy + static server to
// launchd (macOS) / systemd --user (Linux) so a `.ton` site survives CLI exit
// and reboots. The OS runs `ton-sovereign-deploy site-serve …` (a foreground
// entrypoint that re-derives the SAME ADNL from the persisted seed), so the
// on-chain `site` record stays valid across restarts.
//
// SITE-keyed and deliberately PARALLEL to the bag-keyed src/daemon/service.ts:
// the bag-seeder is load-bearing (#37, an 823 MB-log resurrection incident) and
// must not be destabilized. The duplicated OS glue (~80 lines) is the cost.
//
// User-scope only (no root). One unit per domain, label
// `ton-sovereign-site.<domain>`, namespace ~/.ton-sovereign/sites/<domain>/.
// Restart-on-failure ONLY (crash), so a clean stop stays stopped.
//
// Platform/IO glue — no console (callers render output).

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const SITES_ROOT = path.join(os.homedir(), '.ton-sovereign', 'sites')

export interface SiteServiceMeta {
  domain: string // e.g. "mysite.ton"
  label: string // ton-sovereign-site.<sanitized domain>
  build_dir: string // absolute path to the static files
  site_keyring: string // absolute path to the persisted ADNL seed
  public_ip: string | null // pinned --site-public-ip, or null (auto-detect)
  udp_port: number | null // pinned --site-udp-port, or null (auto)
  node_path: string // process.execPath captured at install time
  cli_entry: string // resolved CLI entry (dist/cli.js) captured at install time
  adnl_short_id: string // the public ADNL hex (for `service list` display)
  created_at: string
}

export interface SiteServiceStatus {
  domain: string
  label: string
  running: boolean
  adnl_short_id: string
  build_dir: string
  site_keyring: string
}

export class SiteServiceError extends Error {}

function assertSupported(): void {
  if (process.platform === 'win32') {
    throw new SiteServiceError(
      'site service-mode is not yet supported on Windows. Run --site-auto without --daemon-mode service ' +
        '(CLI-owned), or host on macOS / Linux.',
    )
  }
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    throw new SiteServiceError(`site service-mode is unsupported on platform '${process.platform}'.`)
  }
}

// A `.ton` domain is `[a-z0-9-]` labels joined by dots. Validate before using
// it in filesystem paths / service labels / unit filenames so a hostile value
// (e.g. `../../etc` to `service stop-site --purge`) can't path-traverse out of
// SITES_ROOT in rmSync or smuggle odd chars into a launchd/systemd label.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/
function assertDomain(domain: string): void {
  if (typeof domain !== 'string' || domain.length === 0 || domain.length > 253 || !DOMAIN_RE.test(domain)) {
    throw new SiteServiceError(
      `invalid domain: expected a .ton hostname ([a-z0-9-] labels), got ${JSON.stringify(String(domain)).slice(0, 48)}`,
    )
  }
}

export function siteServiceLabel(domain: string): string {
  return `ton-sovereign-site.${domain}`
}
export function siteDir(domain: string): string {
  return path.join(SITES_ROOT, domain)
}
function metaPath(domain: string): string {
  return path.join(siteDir(domain), 'service.json')
}

// ── ExecStart args (shared by both unit builders) ─────────────────────────

/**
 * The `site-serve` argv the OS manager runs each (re)start. Re-derives the
 * same identity from `site_keyring`, so the on-chain record stays valid.
 */
export function siteServeArgs(meta: SiteServiceMeta): string[] {
  const args = [
    meta.node_path,
    meta.cli_entry,
    'site-serve',
    '--build-dir', meta.build_dir,
    '--domain', meta.domain,
    '--site-keyring', meta.site_keyring,
  ]
  if (meta.public_ip) args.push('--site-public-ip', meta.public_ip)
  if (meta.udp_port != null) args.push('--site-udp-port', String(meta.udp_port))
  return args
}

// ── unit file generation (pure) ───────────────────────────────────────────

export function buildSiteLaunchdPlist(meta: SiteServiceMeta): string {
  const args = siteServeArgs(meta)
  const logPath = path.join(siteDir(meta.domain), 'site.log')
  const argXml = args.map((a) => `    <string>${escapeXml(a)}</string>`).join('\n')
  // KeepAlive only when the process exited UNsuccessfully (a crash). A clean
  // SIGTERM (exit 0 from `service stop-site`) is a successful exit, so launchd
  // does NOT resurrect it. Avoids the #37 always-restart class.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(meta.label)}</string>
  <key>ProgramArguments</key>
  <array>
${argXml}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(logPath)}</string>
</dict>
</plist>
`
}

export function buildSiteSystemdUnit(meta: SiteServiceMeta): string {
  const execStart = siteServeArgs(meta)
    .map((a) => (/\s/.test(a) ? `"${a}"` : a))
    .join(' ')
  // Restart=on-failure (NOT always): a clean stop (systemctl stop → SIGTERM →
  // exit 0) stays stopped; only a crash restarts. Avoids the #37 resurrection.
  return `[Unit]
Description=ton-sovereign-deploy site gateway (${meta.domain})
After=network-online.target

[Service]
Type=simple
ExecStart=${execStart}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function launchdPlistPath(label: string): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `${label}.plist`)
}
function systemdUnitName(domain: string): string {
  return `ton-sovereign-site-${domain}.service`
}
function systemdUnitPath(domain: string): string {
  return path.join(os.homedir(), '.config', 'systemd', 'user', systemdUnitName(domain))
}

function run(cmd: string, args: string[]): void {
  execFileSync(cmd, args, { stdio: 'pipe' })
}

// ── install / stop / list ──────────────────────────────────────────────────

/**
 * Install + load a per-domain site gateway service. The seed at
 * `meta.site_keyring` must already exist (the install-time CLI creates it
 * when deriving the ADNL for the DNS record).
 */
export function installSiteService(meta: SiteServiceMeta): void {
  assertSupported()
  assertDomain(meta.domain)
  mkdirSync(siteDir(meta.domain), { recursive: true })
  writeFileSync(metaPath(meta.domain), JSON.stringify(meta, null, 2) + '\n')

  if (process.platform === 'darwin') {
    const plist = launchdPlistPath(meta.label)
    mkdirSync(path.dirname(plist), { recursive: true })
    writeFileSync(plist, buildSiteLaunchdPlist(meta))
    const domain = `gui/${process.getuid?.() ?? ''}`
    try {
      run('launchctl', ['bootout', `${domain}/${meta.label}`])
    } catch {
      /* not loaded — fine */
    }
    run('launchctl', ['bootstrap', domain, plist])
  } else {
    const unit = systemdUnitPath(meta.domain)
    mkdirSync(path.dirname(unit), { recursive: true })
    writeFileSync(unit, buildSiteSystemdUnit(meta))
    run('systemctl', ['--user', 'daemon-reload'])
    run('systemctl', ['--user', 'enable', systemdUnitName(meta.domain)])
    // `restart` (not `enable --now`) so a REINSTALL for an already-active unit
    // actually picks up the new build dir / keyring / public-ip / port — the
    // macOS path reloads via bootout+bootstrap, this is the systemd parity.
    // restart also starts the unit if it was inactive. Codex review P2.
    run('systemctl', ['--user', 'restart', systemdUnitName(meta.domain)])
  }
}

function readMeta(domain: string): SiteServiceMeta | null {
  try {
    return JSON.parse(readFileSync(metaPath(domain), 'utf8')) as SiteServiceMeta
  } catch {
    return null
  }
}

function isRunning(meta: SiteServiceMeta): boolean {
  try {
    if (process.platform === 'darwin') {
      run('launchctl', ['print', `gui/${process.getuid?.() ?? ''}/${meta.label}`])
      return true
    }
    const out = execFileSync('systemctl', ['--user', 'is-active', systemdUnitName(meta.domain)], {
      stdio: 'pipe',
    })
      .toString()
      .trim()
    return out === 'active'
  } catch {
    return false
  }
}

export function listSiteServices(): SiteServiceStatus[] {
  if (!existsSync(SITES_ROOT)) return []
  const out: SiteServiceStatus[] = []
  for (const domain of readdirSync(SITES_ROOT)) {
    const meta = readMeta(domain)
    if (!meta) continue
    out.push({
      domain: meta.domain,
      label: meta.label,
      running: isRunning(meta),
      adnl_short_id: meta.adnl_short_id,
      build_dir: meta.build_dir,
      site_keyring: meta.site_keyring,
    })
  }
  return out
}

/**
 * Stop + unload a domain's site gateway. Removes the unit file; removes the
 * site dir (metadata) only when `removeData` is true. The seed at
 * `site_keyring` is NEVER deleted here (it's the identity — losing it means
 * re-signing the DNS record); delete it manually if you truly want a new ADNL.
 */
export function stopSiteService(domain: string, opts: { removeData?: boolean } = {}): void {
  assertSupported()
  assertDomain(domain) // guard rmSync(siteDir(domain)) against path traversal
  const meta = readMeta(domain)
  if (!meta) throw new SiteServiceError(`no site service found for domain ${domain}`)

  if (process.platform === 'darwin') {
    try {
      run('launchctl', ['bootout', `gui/${process.getuid?.() ?? ''}/${meta.label}`])
    } catch {
      /* already stopped */
    }
    rmSync(launchdPlistPath(meta.label), { force: true })
  } else {
    try {
      run('systemctl', ['--user', 'disable', '--now', systemdUnitName(domain)])
    } catch {
      /* already stopped */
    }
    rmSync(systemdUnitPath(domain), { force: true })
    try {
      run('systemctl', ['--user', 'daemon-reload'])
    } catch {
      /* ignore */
    }
  }

  if (opts.removeData) rmSync(siteDir(domain), { recursive: true, force: true })
}
