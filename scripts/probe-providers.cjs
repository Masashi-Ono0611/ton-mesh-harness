#!/usr/bin/env node
// scripts/probe-providers.cjs
//
// v0.7 C4: rerun the storage-provider liveness check that justified the
// v0.6 hard-disable of `--provider`. Hits TONAPI for the registered
// provider list, samples the cheapest N by rate, then walks each one's
// recent transactions counting `accept_storage_contract` ops over a
// 30-day window. Verdicts:
//   • dormant     — zero accepts in 30d → keep --provider disabled
//   • flickering  — 1–4 accepts in 30d  → still risky, keep disabled
//   • live        — 5+ accepts in 30d   → re-enable --provider
//
// Output: a table to stdout + a structured JSON summary at
// docs/v0.7/provider-probe-<YYYY-MM-DD>.md (markdown so it lives next
// to the Round 1–7 post-mortem from v0.5).
//
// Usage:
//   node scripts/probe-providers.cjs [--limit 10] [--days 30]

const fs = require('node:fs')
const path = require('node:path')

const argv = process.argv.slice(2)
function arg(name, fallback) {
  const i = argv.indexOf(name)
  if (i < 0) return fallback
  return argv[i + 1]
}

const LIMIT = parseInt(arg('--limit', '10'), 10)
const DAYS = parseInt(arg('--days', '30'), 10)
const SINCE_UTIME = Math.floor(Date.now() / 1000) - DAYS * 86400

async function fetchJson(url, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { method: 'GET' })
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`)
      return await r.json()
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)))
    }
  }
}

// `accept_storage_contract` op-code: 0x66f6f769
// (TEP for storage providers — the contract handler that signals
// liveness when a provider takes on a new bag.)
const OP_ACCEPT_STORAGE_CONTRACT = '0x66f6f769'

async function countAcceptsForProvider(addr) {
  // TONAPI paginates at 1000 per call; we go back through pages until a tx
  // is older than SINCE_UTIME or we hit a few pages (sanity cap).
  let cursorBefore = 'now'
  let count = 0
  let pages = 0
  while (pages++ < 5) {
    const url = `https://tonapi.io/v2/blockchain/accounts/${addr}/transactions?limit=100${
      cursorBefore !== 'now' ? `&before_lt=${cursorBefore}` : ''
    }`
    const data = await fetchJson(url)
    const txs = data?.transactions ?? []
    if (txs.length === 0) break
    let stop = false
    for (const tx of txs) {
      if (tx.utime < SINCE_UTIME) { stop = true; break }
      const inOp = tx.in_msg?.op_code
      if (inOp === OP_ACCEPT_STORAGE_CONTRACT) count++
    }
    if (stop) break
    cursorBefore = String(txs[txs.length - 1].lt)
  }
  return count
}

function verdictFor(count) {
  if (count === 0) return 'dormant'
  if (count <= 4) return 'flickering'
  return 'live'
}

(async () => {
  console.log(`# Storage-provider liveness probe — ${new Date().toISOString()}`)
  console.log(`# Window: last ${DAYS}d (since utime ${SINCE_UTIME}). Sample: top ${LIMIT} cheapest providers.\n`)

  const reg = await fetchJson('https://tonapi.io/v2/storage/providers')
  const providers = (reg?.providers ?? [])
    .filter((p) => p.accepting_new_contracts !== false)
    .sort((a, b) => Number(a.rate_per_mb_day ?? 0) - Number(b.rate_per_mb_day ?? 0))
    .slice(0, LIMIT)

  if (providers.length === 0) {
    console.log('No registered providers found. Possible TONAPI outage.')
    process.exit(2)
  }

  const rows = []
  for (const p of providers) {
    const addr = p.address
    process.stderr.write(`  probing ${addr.slice(0, 12)}…\r`)
    let count = -1
    let err
    try { count = await countAcceptsForProvider(addr) } catch (e) { err = e }
    const verdict = err ? 'error' : verdictFor(count)
    rows.push({
      address: addr,
      rate_per_mb_day: p.rate_per_mb_day,
      accepts_30d: err ? null : count,
      verdict,
      err: err?.message,
    })
  }
  process.stderr.write('\n')

  // Aggregate verdict
  const overall = rows.some((r) => r.verdict === 'live')
    ? 'live'
    : rows.some((r) => r.verdict === 'flickering')
      ? 'flickering'
      : 'dormant'

  // Pretty table
  console.log('| address | rate (nano/MB/day) | accepts (30d) | verdict |')
  console.log('|---|---|---|---|')
  for (const r of rows) {
    const acc = r.accepts_30d == null ? '?' : String(r.accepts_30d)
    console.log(`| \`${r.address.slice(0,16)}…\` | ${r.rate_per_mb_day ?? '?'} | ${acc} | ${r.verdict} |`)
  }
  console.log(`\n**Overall: ${overall}**`)

  // Persist JSON snapshot under docs/v0.7/
  const today = new Date().toISOString().slice(0, 10)
  const outDir = path.join(__dirname, '..', 'docs', 'v0.7')
  const outFile = path.join(outDir, `provider-probe-${today}.md`)
  fs.mkdirSync(outDir, { recursive: true })
  const md = [
    `# Storage-provider liveness probe — ${today}`,
    '',
    `Window: last ${DAYS}d. Sample: top ${LIMIT} cheapest providers.`,
    '',
    '| address | rate (nano/MB/day) | accepts (30d) | verdict |',
    '|---|---|---|---|',
    ...rows.map((r) => {
      const acc = r.accepts_30d == null ? '?' : String(r.accepts_30d)
      return `| \`${r.address}\` | ${r.rate_per_mb_day ?? '?'} | ${acc} | ${r.verdict} |`
    }),
    '',
    `**Overall: ${overall}**`,
    '',
    '## Raw',
    '```json',
    JSON.stringify(rows, null, 2),
    '```',
  ].join('\n') + '\n'
  fs.writeFileSync(outFile, md)
  console.log(`\n→ saved ${outFile}`)
  // exit code matches verdict so CI can gate on it
  process.exit(overall === 'live' ? 0 : 1)
})().catch((err) => {
  console.error('probe failed:', err)
  process.exit(2)
})
