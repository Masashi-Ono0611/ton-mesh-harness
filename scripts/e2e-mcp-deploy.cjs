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

const AGENTIC = process.env.E2E_AUTO_SIGN === '1'
const TONCONNECT = process.env.E2E_TONCONNECT === '1'
const ARMED = AGENTIC || TONCONNECT
const CANCEL = process.env.E2E_CANCEL === '1'
const DOMAIN = process.env.E2E_MAINNET_DOMAIN || null
// Opt-in render confirmation (#118): after a domain deploy, check whether the
// domain has a site (ADNL) record and, if so, fetch its ton.run gateway URL,
// assert HTTP 200, and surface the URL for the human to confirm the rendered
// content. A storage-only deploy (the mesh_deploy default) has no site record,
// so this emits BLOCKED, never PASS — it cannot render via ton.run.
const VERIFY_RENDER = process.env.E2E_VERIFY_RENDER === '1'

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

function leakedDaemons() {
  try {
    const out = execSync('ps -A -o pid,command 2>/dev/null', { encoding: 'utf8' })
    return out
      .split('\n')
      .filter((l) => /tonutils-storage|storage-daemon/.test(l) && !/e2e-mcp-deploy|grep/.test(l))
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
async function tonapiResolveJson(domain) {
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
    const r = await fetch(`https://tonapi.io/v2/dns/${encodeURIComponent(cleanDomain)}/resolve`, {
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
async function tonapiResolveStorage(domain) {
  const j = await tonapiResolveJson(domain)
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
async function pollTonapiStorageMatch(domain, expectedBag, tries, intervalMs) {
  const want = String(expectedBag || '').toLowerCase()
  let lastStorage = null
  for (let i = 0; i < tries; i++) {
    const storage = await tonapiResolveStorage(domain)
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
  log(`Stage 2: deploying ${FIXTURE_DIR} → domain=${DOMAIN ?? '(storage-only, dns_tx_hash will be null)'} on MAINNET`)
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
        testnet: false,
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
      if (url && !signingUrlShown && !String(url).includes('restored-session')) {
        signingUrlShown = true
        renderSigningUrl(url)
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

  if (!DOMAIN) return 'PASS'

  // Gate on GROUND TRUTH (TONAPI resolve `storage` == bag_id), NOT on a
  // non-null dns_tx_hash. A null hash on an otherwise-`done` deploy still
  // means the change_dns_record landed — the old non-null assertion
  // false-FAILed a fully-successful mainnet deploy on 2026-06-25 (#117).
  // Bounded budget: ≤4 tries × (8s fetch + 3s gap) ≈ 41s worst case, so a
  // worst-case 5-min mesh_deploy + this post-check stays under the gated
  // harness timeout in test/mcp-e2e.test.ts (raised to 8 min) (Codex P2).
  const { matched, lastStorage } = await pollTonapiStorageMatch(DOMAIN, sc.bag_id, 4, 3_000)
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
  const resolved = await tonapiResolveJson(domain)
  const sites = resolved && Array.isArray(resolved.sites) ? resolved.sites : []
  const hint =
    sites.length === 0
      ? ' TONAPI shows no site (ADNL) record — likely a storage-only deploy; set one via mesh_site_record + run a gateway.'
      : ' TONAPI shows a site record, so the rldp-http-proxy may still be settling or be unreachable.'
  log(`Stage 2b: BLOCKED — gateway ${gatewayUrl} returned HTTP ${status || 'no-response'}.${hint}`)
  return { verdict: 'BLOCKED', reason: `gateway ${gatewayUrl} HTTP ${status || 'no-response'}` }
}

async function stage3Cancel() {
  log('Stage 3: cancellation hygiene check')
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
        domain: null,
        wallet: { kind: 'agentic' },
        testnet: false,
        keep_alive: false,
      },
      _meta: { progressToken },
    },
  })

  // Cancel as soon as the deploy emits its first progress (mid-flight).
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (srv.frames().some((f) => f.method === 'notifications/progress')) break
    await wait(100)
  }
  send(srv.child, {
    jsonrpc: '2.0',
    method: 'notifications/cancelled',
    params: { requestId, reason: 'e2e cancellation test' },
  })
  log('Stage 3: sent notifications/cancelled mid-flight')
  await wait(3000)

  try {
    srv.child.kill()
  } catch {
    /* ignore */
  }
  await wait(1500)

  const leaked = leakedDaemons()
  if (leaked.length > 0) {
    throw new Error(`Stage 3: leaked daemon process(es) after cancel:\n${leaked.join('\n')}`)
  }
  log('Stage 3: no leaked tonutils-storage / storage-daemon process — clean')
}

// Coarse stage progress, updated by main() before each throwable stage so the
// FAIL verdict (emitted from the top-level catch, outside main's scope) can
// still report which stage failed — otherwise FAIL is the one terminal state
// with no `stages=` breakdown (#122 / Codex P2). The in-progress stage is
// `RUNNING`; the catch rewrites it to `FAIL`.
let lastStages = 'stage1:RUNNING'

/**
 * Emit the single machine-readable verdict line (#122). One grep-able line so
 * CI can tell PASS / SKIP / BLOCKED / FAIL apart and a stage-1-only run is
 * distinguishable from a full E2E (via `scope` + per-stage `stages`), instead
 * of every outcome collapsing into exit 0 vs exit 1.
 *   verdict: PASS | SKIP | BLOCKED | FAIL
 *   scope:   stage1-only | full-e2e
 *   stages:  comma list like `stage1:PASS,stage2:BLOCKED,render:SKIP,stage3:SKIP`
 */
function emitVerdict({ verdict, scope, stages, detail }) {
  let line = `VERDICT verdict=${verdict} scope=${scope}`
  if (stages) line += ` stages=${stages}`
  // Collapse CR/LF (e.g. the Stage 3 leak list is newline-joined) + quotes so
  // the verdict stays a single grep-able line (#122 / Codex P2).
  if (detail) line += ` detail="${String(detail).replace(/[\r\n]+/g, '; ').replace(/"/g, "'")}"`
  log(line)
}

async function main() {
  prepareSourceDir()
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
  const dnsVerdict = await stage2Deploy(srv, checkEnv) // 'PASS' | 'BLOCKED' (FAIL throws)
  try {
    srv.child.kill()
  } catch {
    /* ignore */
  }

  // Stage 2b — opt-in render confirmation (#118). Uses TONAPI + the gateway
  // over HTTP, so it runs after the MCP server is torn down. SKIP unless armed.
  let renderVerdict = 'SKIP'
  if (VERIFY_RENDER && DOMAIN) {
    renderVerdict = (await stage2bRenderConfirm(DOMAIN)).verdict // 'PASS' | 'BLOCKED'
  } else if (VERIFY_RENDER && !DOMAIN) {
    log('Stage 2b SKIPPED — E2E_VERIFY_RENDER=1 needs E2E_MAINNET_DOMAIN to check a site record.')
  }

  let stage3Verdict = 'SKIP'
  if (CANCEL) {
    lastStages = `stage1:PASS,stage2:${dnsVerdict},render:${renderVerdict},stage3:RUNNING`
    await stage3Cancel() // throws (FAIL) on a leaked daemon
    stage3Verdict = 'PASS'
  } else {
    log('Stage 3 SKIPPED (set E2E_CANCEL=1 to run the cancellation hygiene check).')
  }

  const stages =
    `stage1:PASS,stage2:${dnsVerdict},render:${renderVerdict},stage3:${stage3Verdict}`

  if (dnsVerdict === 'BLOCKED' || renderVerdict === 'BLOCKED') {
    const which = [
      dnsVerdict === 'BLOCKED' ? 'DNS landing (TONAPI could not confirm storage==bag_id)' : null,
      renderVerdict === 'BLOCKED' ? 'render (gateway did not serve HTTP 200)' : null,
    ]
      .filter(Boolean)
      .join(' + ')
    log(`BLOCKED (exit 2) — ${which}; this is NOT a clean PASS. See the stage logs above.`)
    emitVerdict({ verdict: 'BLOCKED', scope: 'full-e2e', stages, detail: which })
    process.exitCode = 2
    return
  }
  emitVerdict({ verdict: 'PASS', scope: 'full-e2e', stages })
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
    })
    process.exit(1)
  })
}

// Exported for unit tests (test/e2e-dns-landing.test.ts). The `require.main`
// guard above keeps `main()` from running when this file is `require`d.
module.exports = { assessDnsLanding }
