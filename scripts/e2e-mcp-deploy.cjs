#!/usr/bin/env node
/**
 * E2E acceptance driver for the V3 gate (#18) — Claude-Code-style MCP
 * client → real on-chain deploy via `ton-mesh-harness-mcp`.
 *
 * Scope decision (2026-05-23): the V3 issue and release-checklist
 * originally specified a *testnet* deploy, but the v0.8 SDK rejects
 * `testnet:true` with ERR_INVALID_INPUT (src/sdk/deploy.ts:253 — the
 * tonutils-storage backend is mainnet-only; testnet lives only on the
 * legacy `--daemon-backend=ton-core` CLI path, which is outside the MCP
 * boundary and TonConnect-only). So the MCP-path E2E gate is
 * re-defined as a **mainnet** deploy. See docs/v0.8/e2e-runbook.md.
 *
 * Written as a portable `.cjs` (not `.sh`) for the same reason
 * scripts/mcp-smoke.cjs is: GNU `timeout` is not on macOS runners by
 * default. This drives stdio JSON-RPC directly.
 *
 * Stages (gated, fail-safe — never spends TON unless explicitly armed):
 *
 *   Stage 1 — ALWAYS runs (zero cost): initialize → notifications/
 *     initialized → tools/list (assert 4 tools) → tools/call
 *     mesh_check_env (assert shape). Proves the MCP surface is live.
 *
 *   Stage 2 — DEPLOY, when armed with ONE signing path:
 *       • `E2E_TONCONNECT=1` — human-approved: surfaces the
 *         awaiting_signature signing_url + a terminal QR; you approve in
 *         Tonkeeper. No key stored anywhere.
 *       • `E2E_AUTO_SIGN=1` — agentic: requires an agentic wallet already
 *         configured via @ton/mcp (detected by check_env reporting
 *         `agentic` in wallet_signers_available — we never read a raw seed
 *         from env).
 *     Calls mesh_deploy on test/fixtures/minimal-site against
 *     E2E_MAINNET_DOMAIN (optional). Asserts the deploy reaches a `done`
 *     payload with a bag_id; if a domain was given, asserts the DNS write
 *     LANDED ON-CHAIN by re-resolving the domain via TONAPI and checking
 *     `storage` == bag_id — NOT by requiring a non-null dns_tx_hash (that
 *     field is best-effort and is legitimately null when Toncenter's tx
 *     index lags the TONAPI DNS poll; gating on it false-FAILed a
 *     fully-successful mainnet deploy on 2026-06-25, see #117).
 *
 *   Stage 2b — RENDER CONFIRM, opt-in via `E2E_VERIFY_RENDER=1` (needs a
 *     domain): checks whether the domain has a site (ADNL) record and, if
 *     so, fetches its ton.run gateway URL, asserts HTTP 200, and prints the
 *     URL for the human to open and confirm the rendered content. A
 *     storage-only deploy (the mesh_deploy default) has no site record and
 *     is not browser-openable, so this emits BLOCKED, never PASS (#118).
 *
 *   Stage 3 — CANCELLATION, only when `E2E_AUTO_SIGN=1` AND
 *     `E2E_CANCEL=1`: starts a deploy, sends notifications/cancelled
 *     mid-flight, then asserts no leaked daemon process matching
 *     `tonutils-storage` / `storage-daemon`. (Per the MCP cancellation
 *     contract the ERR_CANCELLED response is suppressed — see
 *     src/mcp.ts handleDeploy F4 caveat — so we assert on process
 *     hygiene, not on a response frame.)
 *
 * Exit 0 = pass OR gracefully-skipped. Exit 1 = a real failure.
 * Exit 2 = BLOCKED: an observation could not be confirmed — the deploy
 * reached `done` but TONAPI could not confirm storage==bag_id within the
 * window, and/or (with E2E_VERIFY_RENDER) the site did not serve HTTP 200.
 * Not a clean pass, not a hard fail (do not green a release on it):
 * a full-e2e PASS requires TONAPI to confirm the bag and any armed render
 * check to pass.
 *
 * Every terminal state also emits one machine-readable line for CI (#122):
 *   [e2e] VERDICT verdict=<PASS|SKIP|BLOCKED|FAIL> scope=<stage1-only|full-e2e|e2e> [stages=…] [detail="…"]
 * so a stage-1-only run (scope=stage1-only) is distinguishable from a full
 * E2E (scope=full-e2e) rather than both being an opaque exit 0.
 */

const { spawn, execSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'mcp.js')
const FIXTURE_DIR = path.resolve(__dirname, '..', 'test', 'fixtures', 'minimal-site')

// Deploy from a throwaway COPY of the fixture, never the committed tree: a
// domain deploy injects a provenance manifest (.well-known/ton-deploy.json)
// into source_dir before bagging, which would dirty the repo and perturb the
// bag content-hash for the integration tests that also bag this fixture (#121).
// Created lazily by main() (NOT at module load) so importing this file for the
// unit test of assessDnsLanding has no filesystem side effect.
let SOURCE_DIR = FIXTURE_DIR
function prepareSourceDir() {
  SOURCE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ton-mesh-e2e-src-'))
  fs.cpSync(FIXTURE_DIR, SOURCE_DIR, { recursive: true })
  process.on('exit', () => {
    try {
      fs.rmSync(SOURCE_DIR, { recursive: true, force: true })
    } catch {
      /* best-effort temp cleanup */
    }
  })
}
const HANDSHAKE_TIMEOUT_MS = 10_000
// Must exceed the SDK's internal max: the storage-record DNS poll runs up
// to 5 min (pollDnsRecord) + the tx-hash grace (TX_HASH_GRACE_MS, 15s) +
// bag-upload headroom. The prior 5-min value equalled the SDK poll exactly,
// so a slow-but-successful deploy could race this await (Codex P2 / #117).
const DEPLOY_TIMEOUT_MS = 7 * 60_000

// Run ONLY the Stage 3 cancellation (skip the Stage 2 deploy). A near-zero-gas
// way to exercise cancellation on mainnet: the cancel fires BEFORE the
// broadcast, so the agentic wallet never signs or spends — a throwaway,
// unfunded, non-domain-owning wallet suffices. Implies E2E_CANCEL *and*
// E2E_AUTO_SIGN: cancellation runs through the agentic signer, so
// `E2E_CANCEL_ONLY=1` alone must still ARM the run — otherwise main() falls
// through to the !ARMED stage1-only branch and reports a misleading PASS before
// the cancellation ever runs. (#123/#145)
const CANCEL_ONLY = process.env.E2E_CANCEL_ONLY === '1'
const CANCEL = process.env.E2E_CANCEL === '1' || CANCEL_ONLY
const AGENTIC = process.env.E2E_AUTO_SIGN === '1' || CANCEL_ONLY
const TONCONNECT = process.env.E2E_TONCONNECT === '1'
const ARMED = AGENTIC || TONCONNECT
// Target network. Default mainnet (back-compat); E2E_TESTNET=1 routes the
// deploys + TONAPI reads to testnet (free gas) — used by the #123 agentic
// cancellation variant so it can exercise a real on-chain flow without
// spending mainnet TON. (#123)
const TESTNET = process.env.E2E_TESTNET === '1'
// Domain is network-gated so a testnet domain never deploys on mainnet (or
// vice-versa): testnet runs read E2E_TESTNET_DOMAIN, mainnet runs read
// E2E_MAINNET_DOMAIN. (code-review P3)
const DOMAIN = (TESTNET ? process.env.E2E_TESTNET_DOMAIN : process.env.E2E_MAINNET_DOMAIN) || null
// Opt-in render confirmation (#118): after a domain deploy, check whether the
// domain has a site (ADNL) record and, if so, fetch its ton.run gateway URL,
// assert HTTP 200, and surface the URL for the human to confirm the rendered
// content. A storage-only deploy (the mesh_deploy default) has no site record,
// so this emits BLOCKED, never PASS — it cannot render via ton.run.
const VERIFY_RENDER = process.env.E2E_VERIFY_RENDER === '1'
// Force a fresh TonConnect pairing (QR) by clearing any cached session at
// startup, so a restored session doesn't silently skip the QR. (#131)
const FRESH_PAIR = process.env.E2E_FRESH_PAIR === '1'

function send(child, msg) {
  child.stdin.write(JSON.stringify(msg) + '\n')
}

function parseFrames(buf) {
  const out = []
  for (const line of buf.split('\n')) {
    const s = line.trim()
    if (!s) continue
    try {
      out.push(JSON.parse(s))
    } catch {
      /* partial line — ignore */
    }
  }
  return out
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function log(msg) {
  process.stdout.write(`[e2e] ${msg}\n`)
}

/** Spawn the MCP server, return { child, frames(), stderr() }. */
function spawnServer() {
  const child = spawn(process.execPath, [SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stdoutBuf = ''
  let stderrBuf = ''
  child.stdout.on('data', (d) => {
    stdoutBuf += d.toString('utf8')
  })
  child.stderr.on('data', (d) => {
    stderrBuf += d.toString('utf8')
  })
  return {
    child,
    frames: () => parseFrames(stdoutBuf),
    stdout: () => stdoutBuf,
    stderr: () => stderrBuf,
  }
}

async function awaitFrame(srv, predicate, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const f = srv.frames().find(predicate)
    if (f) return f
    await wait(100)
  }
  throw new Error(`timed out (${timeoutMs}ms) waiting for ${label}; stderr=${srv.stderr().slice(0, 400)}`)
}

async function handshake(srv) {
  send(srv.child, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'e2e-mcp-deploy', version: '0.0.0' },
    },
  })
  const init = await awaitFrame(srv, (f) => f.id === 1, HANDSHAKE_TIMEOUT_MS, 'initialize')
  if (init.result?.serverInfo?.name !== 'ton-mesh-harness-mcp') {
    throw new Error(`initialize.serverInfo.name unexpected: ${JSON.stringify(init.result?.serverInfo)}`)
  }
  send(srv.child, { jsonrpc: '2.0', method: 'notifications/initialized' })
  await wait(200)
  log(`Stage 1: handshake OK (${init.result.serverInfo.name})`)
}

async function stage1ListAndCheck(srv) {
  send(srv.child, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  const list = await awaitFrame(srv, (f) => f.id === 2, HANDSHAKE_TIMEOUT_MS, 'tools/list')
  const names = (list.result?.tools ?? []).map((t) => t.name).sort()
  const expected = [
    'mesh_check_env',
    'mesh_deploy',
    'mesh_site_record',
    'mesh_status',
  ]
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`tools/list mismatch: expected ${expected.join(', ')} got ${names.join(', ')}`)
  }

  send(srv.child, {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'mesh_check_env', arguments: { source_dir: SOURCE_DIR } },
  })
  const res = await awaitFrame(srv, (f) => f.id === 3, HANDSHAKE_TIMEOUT_MS, 'check_env')
  const sc = res.result?.structuredContent
  if (!sc || typeof sc.ready !== 'boolean' || !Array.isArray(sc.wallet_signers_available)) {
    throw new Error(`check_env shape unexpected: ${JSON.stringify(res.result).slice(0, 300)}`)
  }
  log(`Stage 1: tools/list OK (${names.join(', ')})`)
  log(`Stage 1: check_env ready=${sc.ready} signers=[${sc.wallet_signers_available.join(', ')}] source_dir_valid=${sc.source_dir_valid}`)
  return sc
}

/**
 * Running tonutils-storage / storage-daemon processes (this run's driver and
 * grep excluded), as `{ pid, line }`. Stage 3 snapshots this BEFORE the deploy
 * and diffs AFTER the cancel, so a PRE-EXISTING daemon — TON Browser.app's
 * bundled one, or a prior `--daemon-mode service`/`detached` seeder — is never
 * mis-attributed to a cancellation cleanup leak. A system-wide match would
 * false-FAIL on a developer machine, which is the documented run environment
 * (#147).
 */
function storageDaemonProcs() {
  try {
    const out = execSync('ps -A -o pid,command 2>/dev/null', { encoding: 'utf8' })
    const procs = []
    for (const l of out.split('\n')) {
      if (!/tonutils-storage|storage-daemon/.test(l)) continue
      if (/e2e-mcp-deploy|grep/.test(l)) continue
      const m = /^\s*(\d+)\s/.exec(l)
      if (m) procs.push({ pid: m[1], line: l.trim() })
    }
    return procs
  } catch {
    return []
  }
}

function renderSigningUrl(url) {
  log('')
  log('  ┌─────────────────────────────────────────────────────────────')
  log('  │ AWAITING SIGNATURE — open this in Tonkeeper and approve:')
  log(`  │ ${url}`)
  log('  └─────────────────────────────────────────────────────────────')
  try {
    // Reuse the CLI's QR renderer so a phone wallet can scan it.
    const qr = require('qrcode-terminal')
    qr.generate(url, { small: true })
  } catch {
    log('  (qrcode-terminal unavailable — copy the URL above into Tonkeeper)')
  }
  log('')
}

/**
 * Fetch a `.ton` domain's full TONAPI resolve payload (`{ storage, sites, … }`)
 * or null on any error. Single fetch choke point for both the storage gate
 * (#117) and the render check (#118).
 */
async function tonapiResolveJson(domain, testnet = false) {
  // Mirror the SDK's shorthand normalization (src/sdk/site-record.ts:53 /
  // status.ts:141): a bare `myname` is deployed to `myname.ton`, so we must
  // resolve the SAME `.ton` form or it would false-BLOCK a successful paid
  // deploy. Lowercase first so a cased suffix like `example.TON` normalizes to
  // `example.ton`, not `example.TON.ton` — TON DNS is case-insensitive and
  // TONAPI resolves lowercased (Codex P2).
  const d = String(domain).toLowerCase()
  const cleanDomain = d.endsWith('.ton') ? d : `${d}.ton`
  const ctrl = new AbortController()
  // 8s per fetch keeps the bounded post-check (≤4 tries) well inside the
  // remaining harness budget after a worst-case 5-min mesh_deploy (Codex P2).
  const timer = setTimeout(() => ctrl.abort(), 8_000)
  try {
    const host = testnet ? 'https://testnet.tonapi.io' : 'https://tonapi.io'
    const r = await fetch(`${host}/v2/dns/${encodeURIComponent(cleanDomain)}/resolve`, {
      headers: { accept: 'application/json' },
      signal: ctrl.signal,
    })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve a `.ton` domain's TON Storage DNS record via TONAPI, returning
 * the bag id (lowercased hex) or null on any error / not-yet-propagated.
 * This is the GROUND-TRUTH check the deploy gate uses instead of trusting
 * the best-effort `dns_tx_hash` field (#117).
 */
async function tonapiResolveStorage(domain, testnet = false) {
  const j = await tonapiResolveJson(domain, testnet)
  return j && typeof j.storage === 'string' && j.storage ? j.storage.toLowerCase() : null
}

/**
 * Poll TONAPI until its `storage` record MATCHES the expected bag, or the
 * window expires. The SDK's own propagation poll already saw the match
 * before it yielded `done`, but a load-balanced TONAPI backend can briefly
 * serve a STALE previous bag afterward — so we poll for the match rather
 * than trust the first non-empty read (which would re-introduce the
 * false-negative this fix removes; Codex P2). Returns the match flag plus
 * the last value seen (for diagnostics).
 */
async function pollTonapiStorageMatch(domain, expectedBag, tries, intervalMs, testnet = false) {
  const want = String(expectedBag || '').toLowerCase()
  let lastStorage = null
  for (let i = 0; i < tries; i++) {
    const storage = await tonapiResolveStorage(domain, testnet)
    if (storage) lastStorage = storage
    if (storage && storage === want) return { matched: true, lastStorage: storage }
    if (i < tries - 1) await wait(intervalMs)
  }
  return { matched: false, lastStorage }
}

/**
 * Pure verdict: did the `.ton` DNS write land? Gated on TONAPI ground
 * truth — whether TONAPI resolved the domain's `storage` to the deployed
 * bag within the poll window (`tonapiMatched`). `dns_tx_hash` /
 * `next_actions` are only a fallback when TONAPI never confirmed, so an
 * indexer-lag null hash never reads as FAIL. A non-matching / stale /
 * unreachable TONAPI read is BLOCKED, never FAIL: the SDK already
 * confirmed landing before it yielded `done` (it throws otherwise), so a
 * reached-`done` deploy is never grounds for FAIL — only "could not
 * independently re-confirm". FAIL is reserved for the degenerate case of
 * no DNS-write evidence at all. Exported for unit tests. See #117.
 *
 * @returns { verdict: 'PASS' | 'FAIL' | 'BLOCKED', reason: string }
 */
function assessDnsLanding({ domain, result, tonapiMatched, lastStorage }) {
  if (!domain) {
    return { verdict: 'PASS', reason: 'storage-only deploy; no DNS record to verify' }
  }
  const bag = String((result && result.bag_id) || '').toLowerCase()
  if (tonapiMatched) {
    return { verdict: 'PASS', reason: `TONAPI resolve storage == bag_id (${bag.slice(0, 12)}…)` }
  }
  // TONAPI did not confirm the new bag within the window (lag, stale
  // backend, or unreachable). Fall back to the SDK's own success signal:
  // reaching `done` with a DNS-write pointer means its propagation poll
  // already succeeded.
  const actions = result && Array.isArray(result.next_actions) ? result.next_actions : []
  const dnsSubmitted =
    !!(result && result.dns_tx_hash) ||
    actions.some((a) => /DNS write (confirmed|submitted)/i.test((a && a.description) || ''))
  if (dnsSubmitted) {
    const seen = lastStorage ? `last TONAPI storage=${String(lastStorage).slice(0, 12)}…` : 'TONAPI unreachable'
    return {
      verdict: 'BLOCKED',
      reason: `deploy reached done with a DNS-write pointer, but TONAPI did not confirm storage==bag_id within the window (${seen})`,
    }
  }
  return { verdict: 'FAIL', reason: 'no TONAPI confirmation and no DNS-write pointer in deploy result' }
}

async function stage2Deploy(srv, checkEnv) {
  const wallet = TONCONNECT
    ? { kind: 'tonconnect', connector: 'Tonkeeper' }
    : { kind: 'agentic' }

  if (!TONCONNECT && !checkEnv.wallet_signers_available.includes('agentic')) {
    throw new Error(
      'Stage 2 armed (E2E_AUTO_SIGN=1) but no agentic signer is configured. ' +
        'Set up an agentic wallet via @ton/mcp (writes ~/.config/ton/config.json) ' +
        'or point TON_CONFIG_PATH at a valid config. See docs/v0.8/e2e-runbook.md.',
    )
  }
  log(`Stage 2: deploying ${FIXTURE_DIR} → domain=${DOMAIN ?? '(storage-only, dns_tx_hash will be null)'} on ${TESTNET ? 'TESTNET' : 'MAINNET'}`)
  log(`Stage 2: signing path = ${wallet.kind}${TONCONNECT ? ' (approve on your phone when the QR appears)' : ''}`)

  const progressToken = 'e2e-deploy-1'
  send(srv.child, {
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'mesh_deploy',
      arguments: {
        source_dir: SOURCE_DIR,
        domain: DOMAIN,
        wallet,
        testnet: TESTNET,
        keep_alive: false,
      },
      _meta: { progressToken },
    },
  })

  // Surface progress as it streams so the run is observable. For TonConnect,
  // surface the signing_url + QR from the awaiting_signature event.
  let lastProgressSeen = 0
  let signingUrlShown = false
  const pump = setInterval(() => {
    const progs = srv.frames().filter((f) => f.method === 'notifications/progress')
    for (const p of progs.slice(lastProgressSeen)) {
      log(`  progress: ${p.params?.message ?? ''}`)
      const url = p.params?._meta?.data?.signing_url
      if (url && !signingUrlShown) {
        signingUrlShown = true
        if (String(url).includes('restored-session')) {
          // A cached TonConnect pairing was reused — connect() restored it, so
          // no QR is drawn and the tx request is pushed to the already-paired
          // Tonkeeper instead. Without this message the run just looks hung
          // (the operator waits for a QR that never comes). (#131)
          log('  AWAITING SIGNATURE — reusing a paired Tonkeeper session (no QR drawn).')
          log('  → Approve the request IN your Tonkeeper app. To force a fresh QR,')
          log('    delete ~/.ton-mesh/tonconnect.json (or run with E2E_FRESH_PAIR=1).')
        } else {
          renderSigningUrl(url)
        }
      }
    }
    lastProgressSeen = progs.length
  }, 500)

  let res
  try {
    res = await awaitFrame(srv, (f) => f.id === 10, DEPLOY_TIMEOUT_MS, 'mesh_deploy result')
  } finally {
    clearInterval(pump)
  }

  if (res.result?.isError) {
    throw new Error(`deploy returned isError: ${JSON.stringify(res.result?.structuredContent).slice(0, 400)}`)
  }
  const sc = res.result?.structuredContent
  if (!sc || typeof sc.bag_id !== 'string' || !sc.bag_id) {
    throw new Error(`deploy result missing bag_id: ${JSON.stringify(res.result).slice(0, 400)}`)
  }
  log(`Stage 2: deploy DONE — bag_id=${sc.bag_id} dns_tx_hash=${sc.dns_tx_hash ?? '(none)'} seed_status=${sc.seed_status}`)
  lastSeedStatus = sc.seed_status ?? null // for the VERDICT seed qualifier (#133)

  if (!DOMAIN) return 'PASS'

  // Gate on GROUND TRUTH (TONAPI resolve `storage` == bag_id), NOT on a
  // non-null dns_tx_hash. A null hash on an otherwise-`done` deploy still
  // means the change_dns_record landed — the old non-null assertion
  // false-FAILed a fully-successful mainnet deploy on 2026-06-25 (#117).
  // Bounded budget: ≤4 tries × (8s fetch + 3s gap) ≈ 41s worst case, so a
  // worst-case 5-min mesh_deploy + this post-check stays under the gated
  // harness timeout in test/mcp-e2e.test.ts (raised to 8 min) (Codex P2).
  const { matched, lastStorage } = await pollTonapiStorageMatch(DOMAIN, sc.bag_id, 4, 3_000, TESTNET)
  const { verdict, reason } = assessDnsLanding({ domain: DOMAIN, result: sc, tonapiMatched: matched, lastStorage })
  log(`Stage 2: DNS landing ${verdict} — ${reason}`)
  if (verdict === 'FAIL') {
    throw new Error(`deploy with domain=${DOMAIN}: DNS write did not land — ${reason}`)
  }
  // Surface the storage-vs-site viewability breadcrumb the SDK now emits
  // (#118) so the operator sees where/how the site can be viewed — or why a
  // storage-only deploy is not browser-openable yet, plus the would-be URL.
  const viewHint = (Array.isArray(sc.next_actions) ? sc.next_actions : [])
    .map((a) => a && a.description)
    .find((desc) => typeof desc === 'string' && /browser-openable|site \(ADNL\) record/i.test(desc))
  if (viewHint) log(`Stage 2: viewability — ${viewHint}`)
  // Surface WHY dns_tx_hash may be null (the SDK emits a BOC / message-hash
  // fallback or a throttle/API-key hint as a next_action). Without this, the
  // `dns_tx_hash=(none)` line above reads as a silent dead-end. (#132)
  const txHint = (Array.isArray(sc.next_actions) ? sc.next_actions : [])
    .map((a) => a && a.description)
    .find(
      (desc) =>
        typeof desc === 'string' &&
        /signed-message boc|normalized message hash|dns_tx_hash|tx hash resolve/i.test(desc),
    )
  if (txHint) log(`Stage 2: dns-tx — ${txHint}`)

  // PASS (TONAPI confirmed the bag) or BLOCKED (reached `done` but TONAPI
  // never confirmed) bubble up to main(): BLOCKED must NOT print
  // "PASS (full E2E)" (Codex P2 — BLOCKED ≠ PASS), so the gate only greens
  // a domain deploy when TONAPI independently confirms storage==bag_id.
  return verdict
}

/**
 * Opt-in render confirmation (#118): does the deployed `.ton` site actually
 * serve content a human can view? A mesh_deploy writes only the STORAGE
 * record, so by default the domain has no site (ADNL) record and is NOT
 * browser-openable via the ton.run RLDP gateway — that case is BLOCKED (not
 * FAIL), with a hint to set a site record. When a site record DOES exist we
 * fetch its ton.run gateway URL, assert HTTP 200, and print the URL for the
 * human to open and confirm the rendered content.
 *
 * @returns { verdict: 'PASS' | 'BLOCKED', reason: string }
 */
async function stage2bRenderConfirm(domain) {
  log('Stage 2b: render confirmation (E2E_VERIFY_RENDER=1)')
  // Gate on the gateway's ACTUAL response (ground truth), NOT on TONAPI's
  // flaky `sites` array: a domain with a site record can show empty/stale
  // `sites` yet still serve HTTP 200 (Codex P2). `sites` is consulted only as
  // a non-authoritative hint when the fetch fails. URL mirrors
  // src/sdk/endpoints.ts siteGatewayUrl (ton.run is mainnet-only).
  const d = String(domain).toLowerCase()
  const gatewayUrl = `https://${d.endsWith('.ton') ? d : `${d}.ton`}.run`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)
  let status = 0
  try {
    const r = await fetch(gatewayUrl, { signal: ctrl.signal, redirect: 'follow' })
    status = r.status
  } catch (err) {
    log(`Stage 2b: gateway fetch error: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    clearTimeout(timer)
  }
  if (status === 200) {
    log(`Stage 2b: RENDER OK — gateway ${gatewayUrl} returned HTTP 200.`)
    log(`Stage 2b: 👉 Open ${gatewayUrl} in your browser / TON Browser and CONFIRM the page shows your content.`)
    return { verdict: 'PASS', reason: `gateway ${gatewayUrl} HTTP 200` }
  }
  // Non-200 → add the TONAPI `sites` read as a hint (not the gate) to explain
  // the likely cause: storage-only (no site record) vs proxy still settling.
  const resolved = await tonapiResolveJson(domain, TESTNET)
  const sites = resolved && Array.isArray(resolved.sites) ? resolved.sites : []
  const hint =
    sites.length === 0
      ? ' TONAPI shows no site (ADNL) record — likely a storage-only deploy; set one via mesh_site_record + run a gateway.'
      : ' TONAPI shows a site record, so the rldp-http-proxy may still be settling or be unreachable.'
  log(`Stage 2b: BLOCKED — gateway ${gatewayUrl} returned HTTP ${status || 'no-response'}.${hint}`)
  return { verdict: 'BLOCKED', reason: `gateway ${gatewayUrl} HTTP ${status || 'no-response'}` }
}

/**
 * Pure verdict for the cancellation test (#123). Inputs are derived in
 * stage3Cancel; this is the testable decision table.
 *
 * What a PASS actually proves depends on the wallet:
 *  - With the throwaway UNFUNDED, NON-OWNER wallet used by E2E_CANCEL_ONLY, the
 *    in-flight bag can NEVER become the domain's storage (a change_dns_record is
 *    owner-gated and needs gas), so the `afterStorage === cancelledBag` FAIL
 *    branch is UNREACHABLE — a PASS proves daemon hygiene + a clean pre-broadcast
 *    cancel, NOT on-chain prevention. The CI-runnable proof that the cancel
 *    actually short-circuits the broadcast lives in the SDK tests (#146); this
 *    live e2e is a hygiene/regression guard, not affirmative prevention proof
 *    (#142).
 *  - With a FUNDED, domain-OWNING wallet (a Stage-2-class run), an un-cancelled
 *    write WOULD land, so the FAIL branch becomes reachable and the on-chain
 *    assertion is genuinely falsifiable.
 *
 * Decision table (domainMode = a `.ton` domain was targeted; deployOutcome from
 * the mesh_deploy result frame — 'cancelled' | 'errored' | 'completed'):
 *   - leaked daemon (NEW since the deploy)    → FAIL (cleanup leaked)
 *   - domain + deploy completed despite cancel → FAIL (cancel didn't stop it; #143)
 *   - domain + deploy errored pre-cancel      → BLOCKED (not exercised; #143)
 *   - domain + no bag in 60s                  → BLOCKED (not exercised; #143)
 *   - no-domain, cancelled pre-bag            → PASS (daemon-hygiene only)
 *   - storage unobservable                    → BLOCKED (can't independently confirm)
 *   - cancelled bag IS resolved storage:
 *       cancelled BEFORE the broadcast        → FAIL (cancellation failed to prevent it)
 *       cancelled AFTER the broadcast         → BLOCKED (may_have_published; the F4
 *                                               contract allows the write to land)
 *   - else                                    → PASS
 * Exported for unit tests.
 */
function assessCancellation({
  leaked,
  cancelledBag,
  afterStorage,
  cancelledPreBroadcast,
  domainMode = false,
  deployOutcome = 'cancelled',
}) {
  if (Array.isArray(leaked) && leaked.length > 0) {
    return { verdict: 'FAIL', reason: `leaked daemon process(es) after cancel: ${leaked.join(', ')}` }
  }
  // The deploy ran to completion despite the cancel — the write was NOT
  // prevented. Only conclusive with a domain (a storage-only/no-domain deploy
  // completes normally and the test only asserts daemon hygiene). (#143)
  if (domainMode && deployOutcome === 'completed') {
    return {
      verdict: 'FAIL',
      reason: 'deploy ran to completion despite the cancel — cancellation did not stop the deploy',
    }
  }
  // The deploy errored for its OWN reason (not our cancel — a clean cancel
  // suppresses the ERR_CANCELLED response) before the cancellation could be
  // exercised, so nothing can be concluded about cancellation. (#143)
  if (domainMode && deployOutcome === 'errored') {
    return {
      verdict: 'BLOCKED',
      reason: 'deploy errored before the cancellation window — cancellation not exercised (see the stage log)',
    }
  }
  if (!cancelledBag) {
    // Domain path: no bag means the deploy never reached bag-create within the
    // 60s window, so the cancel had no in-flight write to prevent → can't
    // confirm prevention (previously a vacuous PASS; #143). No-domain path:
    // cancelling at first progress before any bag is the intended
    // hygiene-only check → PASS.
    return domainMode
      ? {
          verdict: 'BLOCKED',
          reason: 'deploy never reached bag creation within 60s — cancellation not exercised against an in-flight write',
        }
      : { verdict: 'PASS', reason: 'cancelled before a bag was created; no leaked daemon' }
  }
  const bag12 = String(cancelledBag).slice(0, 12)
  if (afterStorage === null) {
    return {
      verdict: 'BLOCKED',
      reason: `no leaked daemon, but TONAPI could not resolve the domain to confirm the cancelled bag (${bag12}…) did not land`,
    }
  }
  if (afterStorage === String(cancelledBag).toLowerCase()) {
    return cancelledPreBroadcast
      ? {
          verdict: 'FAIL',
          reason: `cancelled BEFORE the broadcast, yet the cancelled bag (${bag12}…) IS the resolved storage — cancellation failed to prevent the write`,
        }
      : {
          verdict: 'BLOCKED',
          reason: `cancelled AFTER the broadcast (may_have_published); the bag (${bag12}…) landed, which the F4 contract permits — not a clean prevention`,
        }
  }
  return {
    verdict: 'PASS',
    reason: `no leaked daemon and the cancelled bag (${bag12}…) did not become the resolved storage`,
  }
}

/**
 * Append a unique marker to the throwaway tmp SOURCE_DIR so the Stage 3 deploy
 * produces a FRESH bag (≠ the domain's current storage), so a genuine landing
 * would be distinguishable from the pre-existing bag. (Note: with the non-owner
 * throwaway wallet the write can't land regardless — this only bites for a
 * funded-owner variant; see assessCancellation's docblock. #123/#142)
 */
function freshenSourceDir() {
  const marker = `\n<!-- e2e-cancel ${Date.now()} -->\n`
  const idx = path.join(SOURCE_DIR, 'index.html')
  try {
    fs.appendFileSync(idx, marker)
  } catch {
    try {
      fs.writeFileSync(path.join(SOURCE_DIR, 'e2e-cancel-nonce.txt'), String(Date.now()))
    } catch {
      /* best-effort — a non-fresh bag only weakens the on-chain assertion */
    }
  }
}

async function stage3Cancel() {
  // With a domain we check whether the cancelled bag stayed OUT of the domain's
  // storage record; with the throwaway non-owner wallet it can't change that
  // record anyway, so this is a hygiene + clean-pre-broadcast-cancel check, not
  // affirmative on-chain prevention proof (see assessCancellation's docblock;
  // #142). Without a domain it is the original daemon-hygiene-only check.
  log(
    `Stage 3: cancellation hygiene check${
      DOMAIN ? ` (domain=${DOMAIN} on ${TESTNET ? 'TESTNET' : 'MAINNET'})` : ' (storage-only, daemon hygiene)'
    }`,
  )
  if (DOMAIN) freshenSourceDir()
  // Baseline the storage daemons BEFORE the deploy spawns its own, so the
  // post-cancel leak check counts only NEW processes, not a pre-existing TON
  // Browser / seeder daemon (#147).
  const daemonsBefore = new Set(storageDaemonProcs().map((p) => p.pid))
  const srv = spawnServer()
  await handshake(srv)

  const progressToken = 'e2e-cancel-1'
  const requestId = 20
  send(srv.child, {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: 'mesh_deploy',
      arguments: {
        source_dir: SOURCE_DIR,
        domain: DOMAIN,
        wallet: { kind: 'agentic' },
        testnet: TESTNET,
        keep_alive: false,
      },
      _meta: { progressToken },
    },
  })

  // Cancel mid-flight, ideally BEFORE the broadcast. With a domain we wait for
  // bag_uploaded so we can capture the bag_id (to assert it never lands), then
  // cancel at once; without a domain, cancel at first progress (original
  // behaviour). Phase comes from the structured `_meta.phase` the MCP server
  // attaches to every progress notification (src/mcp.ts) — not a free-text
  // message regex, which would silently break if the wording drifted (#144).
  let cancelledBag = null
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const progs = srv.frames().filter((f) => f.method === 'notifications/progress')
    if (DOMAIN) {
      for (const p of progs) {
        if (p.params?._meta?.phase === 'bag_uploaded') {
          const bag = p.params._meta.data?.bag_id
          if (typeof bag === 'string') cancelledBag = bag.toLowerCase()
        }
      }
    }
    const sawSigning = progs.some((p) => p.params?._meta?.phase === 'dns_signing')
    // Domain path: cancel once we have the bag (or we already missed the
    // pre-broadcast window). No-domain path: cancel at first progress.
    if ((DOMAIN && (cancelledBag || sawSigning)) || (!DOMAIN && progs.length > 0)) break
    await wait(50)
  }
  send(srv.child, {
    jsonrpc: '2.0',
    method: 'notifications/cancelled',
    params: { requestId, reason: 'e2e cancellation test' },
  })
  await wait(3000)

  // Re-derive pre/post-broadcast from the FULLY buffered progress stream: the
  // dns_signing frame is emitted only after the broadcast and can arrive AFTER
  // the cancel-decision window closed, so a value frozen at break time would be
  // stale (#144).
  const progsFinal = srv.frames().filter((f) => f.method === 'notifications/progress')
  const cancelledPreBroadcast = !progsFinal.some((p) => p.params?._meta?.phase === 'dns_signing')
  // Classify the deploy's own outcome from its result frame (id 20). A clean
  // cancel makes the MCP server SUPPRESS the ERR_CANCELLED response (F4), so no
  // frame ⇒ 'cancelled'. A self-error (e.g. ERR_DAEMON_SPAWN before bag-create)
  // returns a real error frame; a success frame means the deploy COMPLETED
  // despite the cancel. Without this the harness ignored the result and a
  // pre-bag error read as a vacuous PASS (#143).
  // NOTE on timing: pre-bag errors and "never reached bag" surface fast, well
  // inside the 3s settle window, so the BLOCKED guards below fire reliably — the
  // load-bearing #143 wins. A 'completed' frame only appears if the WHOLE deploy
  // (bag + DNS + broadcast + tx-resolve) finished in ~3s, which a real deploy
  // never does; the on-chain TONAPI poll further down is the backstop that
  // catches a slow funded-owner write a failed cancel let land.
  const resultFrame = srv.frames().find((f) => f.id === requestId)
  let deployOutcome = 'cancelled'
  if (resultFrame && resultFrame.result) {
    if (resultFrame.result.isError) {
      const code = resultFrame.result.structuredContent?.code
      deployOutcome = code === 'ERR_CANCELLED' ? 'cancelled' : 'errored'
    } else {
      deployOutcome = 'completed'
    }
  }
  log(
    `Stage 3: sent notifications/cancelled mid-flight${
      cancelledBag ? ` (in-flight bag ${cancelledBag.slice(0, 12)}…, ${cancelledPreBroadcast ? 'pre' : 'post'}-broadcast)` : ''
    }; deploy ${deployOutcome}`,
  )

  try {
    srv.child.kill()
  } catch {
    /* ignore */
  }
  await wait(1500)

  // Leak = a storage daemon that is NEW since the pre-deploy baseline (#147).
  const leaked = storageDaemonProcs()
    .filter((p) => !daemonsBefore.has(p.pid))
    .map((p) => p.line)
  // On-chain check (domain path, no leak, deploy not self-errored): did the
  // cancelled bag stay OUT of the domain's storage record? Bounded TONAPI read.
  let afterStorage = null
  if (DOMAIN && cancelledBag && leaked.length === 0 && deployOutcome !== 'errored') {
    // Give the would-be write a fair chance to LAND before concluding it was
    // prevented: poll for the cancelled bag over a settle window ≥ TON finality
    // + TONAPI propagation (~tens of seconds). A single early read would
    // false-PASS — it sees the pre-existing bag before a failed-cancel
    // broadcast could surface (code-review P2 / #139). pollTonapiStorageMatch
    // early-returns the moment the bag DOES land (→ FAIL/BLOCKED); only a full
    // no-match window means "prevented". lastStorage is null iff TONAPI never
    // resolved at all → BLOCKED.
    const { matched, lastStorage } = await pollTonapiStorageMatch(DOMAIN, cancelledBag, 6, 5_000, TESTNET)
    afterStorage = matched ? String(cancelledBag).toLowerCase() : lastStorage
  }
  const { verdict, reason } = assessCancellation({
    leaked,
    cancelledBag,
    afterStorage,
    cancelledPreBroadcast,
    domainMode: Boolean(DOMAIN),
    deployOutcome,
  })
  log(`Stage 3: ${verdict} — ${reason}`)
  if (verdict === 'FAIL') throw new Error(`Stage 3: ${reason}`)
  return verdict // 'PASS' | 'BLOCKED'
}

// Coarse stage progress, updated by main() before each throwable stage so the
// FAIL verdict (emitted from the top-level catch, outside main's scope) can
// still report which stage failed — otherwise FAIL is the one terminal state
// with no `stages=` breakdown (#122 / Codex P2). The in-progress stage is
// `RUNNING`; the catch rewrites it to `FAIL`.
let lastStages = 'stage1:RUNNING'
// Seed status of the deployed bag, captured from the deploy result so the
// machine-readable VERDICT line can carry it. A `verdict=PASS` only means the
// DNS record landed — NOT that the content is being served; `seed=stopped`
// tells a downstream consumer the bag is currently un-seeded / not retrievable
// (the e2e uses keep_alive:false by design). null until a deploy runs. (#133)
let lastSeedStatus = null

/**
 * Emit the single machine-readable verdict line (#122). One grep-able line so
 * CI can tell PASS / SKIP / BLOCKED / FAIL apart and a stage-1-only run is
 * distinguishable from a full E2E (via `scope` + per-stage `stages`), instead
 * of every outcome collapsing into exit 0 vs exit 1.
 *   verdict: PASS | SKIP | BLOCKED | FAIL
 *   scope:   stage1-only | full-e2e
 *   stages:  comma list like `stage1:PASS,stage2:BLOCKED,render:SKIP,stage3:SKIP`
 */
function emitVerdict({ verdict, scope, stages, detail, seed }) {
  let line = `VERDICT verdict=${verdict} scope=${scope}`
  if (stages) line += ` stages=${stages}`
  // Seed/retrievability qualifier (#133): a PASS gates on the DNS record
  // landing, never on the content being served. Surfacing seed=<status> keeps
  // a machine consumer from reading `verdict=PASS` as "live and fetchable".
  if (seed) line += ` seed=${seed} retrievable=unverified`
  // Collapse CR/LF (e.g. the Stage 3 leak list is newline-joined) + quotes so
  // the verdict stays a single grep-able line (#122 / Codex P2).
  if (detail) line += ` detail="${String(detail).replace(/[\r\n]+/g, '; ').replace(/"/g, "'")}"`
  log(line)
}

async function main() {
  prepareSourceDir()
  if (FRESH_PAIR) {
    // Clear any cached TonConnect pairing so connect() does a FRESH pairing and
    // renders a QR, instead of restoring a session and silently skipping it.
    // Path mirrors getTonConnectStoragePath() in src/wallet/constants.ts. (#131)
    try {
      fs.rmSync(path.join(os.homedir(), '.ton-mesh', 'tonconnect.json'), { force: true })
      log('E2E_FRESH_PAIR=1 — cleared cached TonConnect session; a fresh QR will be drawn.')
    } catch {
      /* best-effort */
    }
  }
  lastStages = 'stage1:RUNNING'
  const srv = spawnServer()
  await handshake(srv)
  const checkEnv = await stage1ListAndCheck(srv)

  if (!ARMED) {
    try {
      srv.child.kill()
    } catch {
      /* ignore */
    }
    log('Stage 2/3 SKIPPED. To run the real mainnet deploy, set ONE signing path:')
    log('  • E2E_TONCONNECT=1  — human-approved (scan the QR in Tonkeeper)')
    log('  • E2E_AUTO_SIGN=1   — agentic (requires a configured @ton/mcp wallet)')
    // Stage 1 passed but the deploy was intentionally not run — PASS-but-partial,
    // distinguished from a full run by scope (not a silent exit-0). (#122)
    emitVerdict({ verdict: 'PASS', scope: 'stage1-only', stages: 'stage1:PASS,stage2:SKIP,stage3:SKIP' })
    return
  }

  lastStages = 'stage1:PASS,stage2:RUNNING'
  // Stage 2 (deploy) — skipped under E2E_CANCEL_ONLY so the cancellation can be
  // exercised on mainnet without a funded, domain-owning wallet (the Stage 3
  // cancel fires pre-broadcast, so nothing is signed or spent). (#123)
  let dnsVerdict = 'SKIP'
  let renderVerdict = 'SKIP'
  if (CANCEL_ONLY) {
    log('Stage 2 SKIPPED (E2E_CANCEL_ONLY=1) — running only the Stage 3 cancellation check.')
    try {
      srv.child.kill()
    } catch {
      /* ignore */
    }
  } else {
    dnsVerdict = await stage2Deploy(srv, checkEnv) // 'PASS' | 'BLOCKED' (FAIL throws)
    try {
      srv.child.kill()
    } catch {
      /* ignore */
    }

    // Stage 2b — opt-in render confirmation (#118). Uses TONAPI + the gateway
    // over HTTP, so it runs after the MCP server is torn down. SKIP unless armed.
    if (VERIFY_RENDER && DOMAIN) {
      renderVerdict = (await stage2bRenderConfirm(DOMAIN)).verdict // 'PASS' | 'BLOCKED'
    } else if (VERIFY_RENDER && !DOMAIN) {
      log('Stage 2b SKIPPED — E2E_VERIFY_RENDER=1 needs E2E_MAINNET_DOMAIN to check a site record.')
    }
  }

  let stage3Verdict = 'SKIP'
  // Cause shown in the BLOCKED VERDICT detail — defaults to the on-chain
  // unobservable case (stage3Cancel), overridden by the no-agentic guard so a
  // CI triager isn't pointed at TONAPI when the real cause is wallet config.
  let stage3BlockedReason = 'cancellation (could not confirm the cancelled bag stayed off-chain)'
  if (CANCEL && !checkEnv.wallet_signers_available.includes('agentic')) {
    // Cancellation uses the agentic signer; without a configured agentic wallet
    // the Stage 3 deploy would error before bag-create and the test would look
    // like a vacuous pass. The operator ASKED for cancellation, so this is
    // BLOCKED (couldn't run), not a silent SKIP and not a clean PASS. (#123)
    stage3Verdict = 'BLOCKED'
    stage3BlockedReason = 'cancellation could not run — no agentic wallet configured (runbook §1.1)'
    log(
      'Stage 3 BLOCKED — cancellation runs through the agentic signer, but no agentic ' +
        'wallet is configured (signers=' +
        JSON.stringify(checkEnv.wallet_signers_available) +
        '). Set up ~/.config/ton/config.json (see docs/v0.8/e2e-runbook.md §1.1).',
    )
  } else if (CANCEL) {
    lastStages = `stage1:PASS,stage2:${dnsVerdict},render:${renderVerdict},stage3:RUNNING`
    stage3Verdict = await stage3Cancel() // 'PASS' | 'BLOCKED' (FAIL throws)
  } else {
    log('Stage 3 SKIPPED (set E2E_CANCEL=1 to run the cancellation hygiene check).')
  }

  const stages =
    `stage1:PASS,stage2:${dnsVerdict},render:${renderVerdict},stage3:${stage3Verdict}`

  if (dnsVerdict === 'BLOCKED' || renderVerdict === 'BLOCKED' || stage3Verdict === 'BLOCKED') {
    const which = [
      dnsVerdict === 'BLOCKED' ? 'DNS landing (TONAPI could not confirm storage==bag_id)' : null,
      renderVerdict === 'BLOCKED' ? 'render (gateway did not serve HTTP 200)' : null,
      stage3Verdict === 'BLOCKED' ? stage3BlockedReason : null,
    ]
      .filter(Boolean)
      .join(' + ')
    log(`BLOCKED (exit 2) — ${which}; this is NOT a clean PASS. See the stage logs above.`)
    emitVerdict({ verdict: 'BLOCKED', scope: 'full-e2e', stages, detail: which, seed: lastSeedStatus })
    process.exitCode = 2
    return
  }
  emitVerdict({ verdict: 'PASS', scope: 'full-e2e', stages, seed: lastSeedStatus })
}

if (require.main === module) {
  main().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write(`E2E FAILED: ${msg}\n`)
    // Mirror the PASS/BLOCKED verdict line on stdout so CI parses one format
    // for every terminal state (#122). Exit 1 is reserved for a true FAIL.
    // `lastStages` carries the per-stage breakdown; the in-progress stage that
    // threw is rewritten RUNNING→FAIL so the failing stage is explicit.
    emitVerdict({
      verdict: 'FAIL',
      scope: 'e2e',
      stages: lastStages.replace(/RUNNING/g, 'FAIL'),
      detail: msg.slice(0, 200),
      seed: lastSeedStatus,
    })
    process.exit(1)
  })
}

// Exported for unit tests (test/e2e-dns-landing.test.ts). The `require.main`
// guard above keeps `main()` from running when this file is `require`d.
// pollTonapiStorageMatch is exported so a regression test can lock the #139
// settle-window (it must NOT early-stop on the first stale read). (#146)
module.exports = { assessDnsLanding, assessCancellation, pollTonapiStorageMatch }
