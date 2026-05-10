// `ton-sovereign-deploy doctor` — pre-flight environment check.
// Diagnoses the things users actually trip on before a deploy attempt.

import { existsSync, readFileSync, statSync } from 'fs'
import path from 'path'
import os from 'os'
import chalk from 'chalk'
import { getDaemonPaths } from '../daemon/installer'
import { getTonutilsPaths } from '../daemon/tonutils-installer'
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

async function fetchJson<T = unknown>(url: string, timeoutMs = 5_000): Promise<T | null> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const r = await fetch(url, { method: 'GET', signal: ac.signal })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function checkBinary(label: string, binPath: string, expectedVersionFile: string): CheckLine {
  if (!existsSync(binPath)) {
    return { status: 'warn', label, detail: `not installed yet — will be downloaded on first deploy (${binPath})` }
  }
  const size = statSync(binPath).size
  let version = 'unknown'
  if (existsSync(expectedVersionFile)) {
    try { version = readFileSync(expectedVersionFile, 'utf-8').trim() } catch { /* ignore */ }
  }
  return { status: 'pass', label, detail: `${version} · ${(size / 1e6).toFixed(1)} MB` }
}

function checkTonConnectSession(): CheckLine {
  const sessionPath = getTonConnectStoragePath()
  if (!existsSync(sessionPath)) {
    return { status: 'warn', label: 'TonConnect session', detail: 'not paired — run a deploy with --domain to pair Tonkeeper' }
  }
  let walletAddr: string | undefined
  try {
    const raw = JSON.parse(readFileSync(sessionPath, 'utf-8'))
    // The session is stored by @tonconnect/sdk under multiple keys; this
    // is best-effort and only used for the diagnostic line.
    for (const v of Object.values(raw)) {
      if (typeof v === 'string') {
        const m = v.match(/"address":"(0:[0-9a-f]{64}|[A-Za-z0-9_-]{48})"/)
        if (m) { walletAddr = m[1]; break }
      }
    }
  } catch { /* ignore */ }
  return {
    status: 'pass',
    label: 'TonConnect session',
    detail: walletAddr ? `paired (wallet: ${walletAddr.slice(0, 16)}…)` : 'paired',
  }
}

export async function runDoctor(): Promise<void> {
  console.log()
  console.log(chalk.bold('🩺 Sovereign Deploy Kit — environment check'))
  console.log()

  const lines: CheckLine[] = []

  // 1. Daemon binaries
  const tonutilsPaths = getTonutilsPaths()
  lines.push(checkBinary(
    'tonutils-storage binary',
    tonutilsPaths.daemon,
    tonutilsPaths.versionFile,
  ))

  const corePaths = getDaemonPaths()
  lines.push(checkBinary(
    'ton-core daemon binary',
    corePaths.daemon,
    corePaths.versionFile,
  ))

  // 2. Network reachability
  const tonapiOk = await fetchOk('https://tonapi.io/v2/blockchain/masterchain-head')
  lines.push({
    status: tonapiOk ? 'pass' : 'fail',
    label: 'TONAPI mainnet reachable',
    detail: tonapiOk ? 'https://tonapi.io' : 'timed out — check connectivity',
  })

  // 3. Storage provider registry (informational; not "live")
  const providers = await fetchJson<{ providers?: unknown[] }>('https://tonapi.io/v2/storage/providers')
  if (providers && Array.isArray(providers.providers)) {
    lines.push({
      status: 'pass',
      label: 'TON Storage provider registry',
      detail: `${providers.providers.length} entries (registry only — see docs/v0.5/round-postmortem.md re: liveness)`,
    })
  } else {
    lines.push({ status: 'warn', label: 'TON Storage provider registry', detail: 'could not fetch' })
  }

  // 4. TonConnect manifest reachable
  const manifestOk = await fetchOk(TONCONNECT_MANIFEST_URL)
  lines.push({
    status: manifestOk ? 'pass' : 'fail',
    label: 'TonConnect manifest',
    detail: manifestOk ? TONCONNECT_MANIFEST_URL : `unreachable: ${TONCONNECT_MANIFEST_URL}`,
  })

  // 5. TonConnect session (optional pairing)
  lines.push(checkTonConnectSession())

  // 6. UDP listen range — quick sanity
  const homeOk = existsSync(path.join(os.homedir(), '.ton-sovereign'))
  lines.push({
    status: homeOk ? 'pass' : 'warn',
    label: '~/.ton-sovereign session dir',
    detail: homeOk ? path.join(os.homedir(), '.ton-sovereign') : 'will be created on first deploy',
  })

  for (const line of lines) {
    const sym = COLOR[line.status](SYMBOL[line.status])
    const lbl = chalk.bold(line.label)
    const detail = line.detail ? chalk.dim(`  ${line.detail}`) : ''
    console.log(`  ${sym} ${lbl}${detail}`)
  }

  console.log()
  const fails = lines.filter(l => l.status === 'fail').length
  const warns = lines.filter(l => l.status === 'warn').length
  if (fails > 0) {
    console.log(chalk.red(`  ${fails} check(s) failed.`) + ' ' + chalk.dim('Fix the items above before attempting a deploy.'))
    process.exitCode = 1
  } else if (warns > 0) {
    console.log(chalk.yellow(`  ${warns} warning(s).`) + ' ' + chalk.dim('Deploy should still work; the warnings explain expected first-run installs.'))
  } else {
    console.log(chalk.green('  All checks passed.') + ' ' + chalk.dim('Ready to deploy.'))
  }
  console.log()
}
