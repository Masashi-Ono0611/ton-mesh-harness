// OS service-manager ownership for the tonutils-storage seeding daemon (#37).
//
// `--daemon-mode service` hands a per-bag daemon to launchd (macOS) /
// systemd --user (Linux) so it keeps seeding after the CLI exits and the
// MCP server can request a deploy without orphaning a daemon on shutdown.
// Windows is not yet supported (TODO — Windows Service / scheduled task).
//
// User-scope only (no root install). One unit per bag, labelled
// `ton-sovereign.<bag_id>`, backed by a persistent seed dir under
// ~/.ton-sovereign/seeds/<bag_id>/.
//
// This module is platform/IO glue (no console — callers render output).

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

export const SEEDS_ROOT = path.join(os.homedir(), '.ton-sovereign', 'seeds')

export interface ServiceMeta {
  bag_id: string
  label: string
  db_dir: string
  api_port: number
  network_config_path: string | null
  daemon_path: string
  created_at: string
}

export interface ServiceStatus {
  bag_id: string
  label: string
  running: boolean
  api_url: string
  db_dir: string
}

export class ServiceError extends Error {}

function assertSupported(): void {
  if (process.platform === 'win32') {
    throw new ServiceError(
      'service daemon-mode is not yet supported on Windows (TODO: Windows Service / scheduled task). ' +
        'Use --daemon-mode detached, or run on macOS / Linux.',
    )
  }
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    throw new ServiceError(`service daemon-mode is unsupported on platform '${process.platform}'.`)
  }
}

// A bag id is a TON Storage content hash — 64 hex chars. Validate before
// using it in filesystem paths / service labels / unit filenames so a
// hostile value (e.g. `../../etc` passed to `service stop --purge`) can't
// path-traverse out of SEEDS_ROOT in rmSync, or smuggle odd chars into a
// launchd/systemd label.
const BAG_ID_RE = /^[0-9a-fA-F]{64}$/
function assertBagId(bagId: string): void {
  if (!BAG_ID_RE.test(bagId)) {
    throw new ServiceError(`invalid bag id: expected 64 hex chars, got ${JSON.stringify(String(bagId)).slice(0, 48)}`)
  }
}

export function serviceLabel(bagId: string): string {
  return `ton-sovereign.${bagId}`
}
export function seedDir(bagId: string): string {
  return path.join(SEEDS_ROOT, bagId)
}
function metaPath(bagId: string): string {
  return path.join(seedDir(bagId), 'service.json')
}

// ── unit file generation (pure) ──────────────────────────────────────────

export function buildLaunchdPlist(meta: ServiceMeta): string {
  const args = [meta.daemon_path, '--api', `127.0.0.1:${meta.api_port}`, '--db', meta.db_dir]
  if (meta.network_config_path) args.push('--network-config', meta.network_config_path)
  const logPath = path.join(seedDir(meta.bag_id), 'daemon.log')
  const argXml = args.map((a) => `    <string>${escapeXml(a)}</string>`).join('\n')
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
  <true/>
  <key>StandardOutPath</key>
  <string>${escapeXml(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(logPath)}</string>
</dict>
</plist>
`
}

export function buildSystemdUnit(meta: ServiceMeta): string {
  const args = [meta.daemon_path, '--api', `127.0.0.1:${meta.api_port}`, '--db', meta.db_dir]
  if (meta.network_config_path) args.push('--network-config', meta.network_config_path)
  const execStart = args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')
  return `[Unit]
Description=ton-sovereign-deploy seed daemon (bag ${meta.bag_id})
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
function systemdUnitName(bagId: string): string {
  return `ton-sovereign-${bagId}.service`
}
function systemdUnitPath(bagId: string): string {
  return path.join(os.homedir(), '.config', 'systemd', 'user', systemdUnitName(bagId))
}

function run(cmd: string, args: string[]): void {
  execFileSync(cmd, args, { stdio: 'pipe' })
}

// ── install / stop / list ────────────────────────────────────────────────

/**
 * Install + load a per-bag seed service. `db_dir` must already contain the
 * created bag (the daemon will resume seeding it from there).
 */
export function installService(meta: ServiceMeta): void {
  assertSupported()
  assertBagId(meta.bag_id)
  mkdirSync(seedDir(meta.bag_id), { recursive: true })
  writeFileSync(metaPath(meta.bag_id), JSON.stringify(meta, null, 2) + '\n')

  if (process.platform === 'darwin') {
    const plist = launchdPlistPath(meta.label)
    mkdirSync(path.dirname(plist), { recursive: true })
    writeFileSync(plist, buildLaunchdPlist(meta))
    const domain = `gui/${process.getuid?.() ?? ''}`
    // bootout any stale instance first (ignore failure), then bootstrap.
    try {
      run('launchctl', ['bootout', `${domain}/${meta.label}`])
    } catch {
      /* not loaded — fine */
    }
    run('launchctl', ['bootstrap', domain, plist])
  } else {
    const unit = systemdUnitPath(meta.bag_id)
    mkdirSync(path.dirname(unit), { recursive: true })
    writeFileSync(unit, buildSystemdUnit(meta))
    run('systemctl', ['--user', 'daemon-reload'])
    run('systemctl', ['--user', 'enable', '--now', systemdUnitName(meta.bag_id)])
  }
}

function readMeta(bagId: string): ServiceMeta | null {
  try {
    return JSON.parse(readFileSync(metaPath(bagId), 'utf8')) as ServiceMeta
  } catch {
    return null
  }
}

function isRunning(meta: ServiceMeta): boolean {
  try {
    if (process.platform === 'darwin') {
      run('launchctl', ['print', `gui/${process.getuid?.() ?? ''}/${meta.label}`])
      return true
    }
    const out = execFileSync('systemctl', ['--user', 'is-active', systemdUnitName(meta.bag_id)], {
      stdio: 'pipe',
    }).toString().trim()
    return out === 'active'
  } catch {
    return false
  }
}

export function listServices(): ServiceStatus[] {
  if (!existsSync(SEEDS_ROOT)) return []
  const out: ServiceStatus[] = []
  for (const bagId of readdirSync(SEEDS_ROOT)) {
    const meta = readMeta(bagId)
    if (!meta) continue
    out.push({
      bag_id: meta.bag_id,
      label: meta.label,
      running: isRunning(meta),
      api_url: `http://127.0.0.1:${meta.api_port}`,
      db_dir: meta.db_dir,
    })
  }
  return out
}

/**
 * Stop + unload a bag's seed service. Removes the unit file; removes the
 * seed dir (db + metadata) only when `removeDb` is true.
 */
export function stopService(bagId: string, opts: { removeDb?: boolean } = {}): void {
  assertSupported()
  assertBagId(bagId) // guard rmSync(seedDir(bagId)) against path traversal
  const meta = readMeta(bagId)
  if (!meta) throw new ServiceError(`no service found for bag ${bagId}`)

  if (process.platform === 'darwin') {
    try {
      run('launchctl', ['bootout', `gui/${process.getuid?.() ?? ''}/${meta.label}`])
    } catch {
      /* already stopped */
    }
    rmSync(launchdPlistPath(meta.label), { force: true })
  } else {
    try {
      run('systemctl', ['--user', 'disable', '--now', systemdUnitName(bagId)])
    } catch {
      /* already stopped */
    }
    rmSync(systemdUnitPath(bagId), { force: true })
    try {
      run('systemctl', ['--user', 'daemon-reload'])
    } catch {
      /* ignore */
    }
  }

  if (opts.removeDb) rmSync(seedDir(bagId), { recursive: true, force: true })
}
