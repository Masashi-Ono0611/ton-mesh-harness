// `ton-sovereign-deploy doctor` — pre-flight environment check.
// Thin CLI renderer over the SDK's `checkEnv()` ([S1] / [F2] schemas).
// All probe logic lives in src/sdk/check.ts; this file only formats output.

import { existsSync, readFileSync } from 'fs'
import path from 'path'
import os from 'os'
import chalk from 'chalk'
import { checkEnv, TONUTILS_DEFAULT_UDP_PORT } from '../sdk/check'
import { getDaemonPaths } from '../daemon/installer'
import { getTonutilsPaths } from '../daemon/tonutils-installer'
import { getRldpHttpProxyPaths } from '../daemon/rldp-http-proxy-installer'
import { getTonConnectStoragePath, TONCONNECT_MANIFEST_URL } from '../wallet/constants'

type Status = 'pass' | 'warn' | 'fail'

interface CheckLine {
  status: Status
  label: string
  detail?: string
}

const SYMBOL: Record<Status, string> = { pass: '✔', warn: '⚠', fail: '✗' }
const COLOR: Record<Status, (s: string) => string> = {
  pass: (s) => chalk.green(s),
  warn: (s) => chalk.yellow(s),
  fail: (s) => chalk.red(s),
}

function detailFromBinary(label: string, binPath: string, expectedVersionFile: string, installed: boolean): CheckLine {
  if (!installed) {
    return { status: 'warn', label, detail: `not installed yet — will be downloaded on first deploy (${binPath})` }
  }
  let detail = binPath
  if (existsSync(expectedVersionFile)) {
    try {
      const v = readFileSync(expectedVersionFile, 'utf-8').trim()
      if (v) detail = `${v} · ${binPath}`
    } catch {
      /* ignore */
    }
  }
  return { status: 'pass', label, detail }
}

function tonconnectSessionLine(): CheckLine {
  const sessionPath = getTonConnectStoragePath()
  if (!existsSync(sessionPath)) {
    return { status: 'warn', label: 'TonConnect session', detail: 'not paired — run a deploy with --domain to pair Tonkeeper' }
  }
  let walletAddr: string | undefined
  try {
    const raw = JSON.parse(readFileSync(sessionPath, 'utf-8'))
    for (const v of Object.values(raw)) {
      if (typeof v === 'string') {
        const m = v.match(/"address":"(0:[0-9a-f]{64}|[A-Za-z0-9_-]{48})"/)
        if (m) {
          walletAddr = m[1]
          break
        }
      }
    }
  } catch {
    /* ignore */
  }
  return {
    status: 'pass',
    label: 'TonConnect session',
    detail: walletAddr ? `paired (wallet: ${walletAddr.slice(0, 16)}…)` : 'paired',
  }
}

function siteAdnlLine(): CheckLine | null {
  const siteAdnlPath = path.join(os.homedir(), '.ton-sovereign', 'site-adnl.txt')
  if (!existsSync(siteAdnlPath)) return null
  let hex: string | undefined
  try {
    hex = readFileSync(siteAdnlPath, 'utf-8').trim()
  } catch {
    return null
  }
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) return null
  return {
    status: 'pass',
    label: 'Site ADNL identity',
    detail: `${hex.slice(0, 16)}… (full at ${siteAdnlPath})`,
  }
}

export async function runDoctor(): Promise<void> {
  console.log()
  console.log(chalk.bold('🩺 Sovereign Deploy Kit — environment check'))
  console.log()

  const result = await checkEnv()

  const lines: CheckLine[] = []

  // 1. Daemon binaries — derived from result + binary path lookups for the detail text.
  const tonutilsPaths = getTonutilsPaths()
  lines.push(
    detailFromBinary(
      'tonutils-storage binary',
      tonutilsPaths.daemon,
      tonutilsPaths.versionFile,
      result.daemon_backend_installed.tonutils,
    ),
  )
  const corePaths = getDaemonPaths()
  lines.push(
    detailFromBinary(
      'ton-core daemon binary',
      corePaths.daemon,
      corePaths.versionFile,
      result.daemon_backend_installed.ton_core,
    ),
  )
  const proxyPaths = getRldpHttpProxyPaths()
  // rldp-http-proxy availability is encoded as a warning in result.warnings;
  // we render it here with the same line shape for consistency.
  const proxyInstalled = !result.warnings.some((w) => w.code === 'RLDP_HTTP_PROXY_NOT_INSTALLED')
  lines.push(
    detailFromBinary('rldp-http-proxy binary', proxyPaths.daemon, proxyPaths.versionFile, proxyInstalled),
  )

  // 2. Site ADNL identity (informational)
  const adnl = siteAdnlLine()
  if (adnl) lines.push(adnl)

  // 3. Network reachability
  lines.push({
    status: result.network_reachable ? 'pass' : 'fail',
    label: 'TONAPI mainnet reachable',
    detail: result.network_reachable ? 'https://tonapi.io' : 'timed out — check connectivity',
  })

  // 4. TonConnect manifest reachability (warning, not blocker)
  const manifestWarning = result.warnings.find((w) => w.code === 'TONCONNECT_MANIFEST_UNREACHABLE')
  lines.push({
    status: manifestWarning ? 'warn' : 'pass',
    label: 'TonConnect manifest',
    detail: manifestWarning ? `unreachable: ${TONCONNECT_MANIFEST_URL}` : TONCONNECT_MANIFEST_URL,
  })

  // 5. TonConnect session (optional pairing)
  lines.push(tonconnectSessionLine())

  // 6. Agentic wallet config (Path 2 viability)
  if (result.wallet_signers_available.includes('agentic')) {
    lines.push({
      status: 'pass',
      label: 'Agentic wallet config',
      detail: `~/.config/ton/config.json present — Path 2 (agentic) signing available.`,
    })
  } else {
    lines.push({
      status: 'warn',
      label: 'Agentic wallet config',
      detail: 'no ~/.config/ton/config.json — agentic mode requires `npx -y @ton/mcp@alpha agentic_start_root_wallet_setup`.',
    })
  }

  // 7. UDP port 17555
  lines.push({
    status: result.udp_port_17555_free ? 'pass' : 'fail',
    label: `UDP port ${TONUTILS_DEFAULT_UDP_PORT}`,
    detail: result.udp_port_17555_free ? 'free' : 'in use (likely TON Browser.app or another tonutils-storage)',
  })

  // 8. ~/.ton-sovereign session dir
  const homeOk = existsSync(path.join(os.homedir(), '.ton-sovereign'))
  lines.push({
    status: homeOk ? 'pass' : 'warn',
    label: '~/.ton-sovereign session dir',
    detail: homeOk ? path.join(os.homedir(), '.ton-sovereign') : 'will be created on first deploy',
  })

  // 9. Disk free
  if (result.disk_free_mb > 0) {
    lines.push({
      status: result.disk_free_mb < 200 ? 'warn' : 'pass',
      label: 'Disk free (cwd)',
      detail: `${result.disk_free_mb} MB`,
    })
  }

  // 10. Node version (informational)
  lines.push({
    status: 'pass',
    label: 'Node version',
    detail: result.node_version,
  })

  for (const line of lines) {
    const sym = COLOR[line.status](SYMBOL[line.status])
    const lbl = chalk.bold(line.label)
    const detail = line.detail ? chalk.dim(`  ${line.detail}`) : ''
    console.log(`  ${sym} ${lbl}${detail}`)
  }

  console.log()
  const fails = lines.filter((l) => l.status === 'fail').length
  const warns = lines.filter((l) => l.status === 'warn').length
  if (fails > 0) {
    console.log(
      chalk.red(`  ${fails} check(s) failed.`) +
        ' ' +
        chalk.dim('Fix the items above before attempting a deploy.'),
    )
    process.exitCode = 1
  } else if (warns > 0) {
    console.log(
      chalk.yellow(`  ${warns} warning(s).`) +
        ' ' +
        chalk.dim('Deploy should still work; the warnings explain expected first-run installs.'),
    )
  } else {
    console.log(chalk.green('  All checks passed.') + ' ' + chalk.dim('Ready to deploy.'))
  }
  console.log()
}
