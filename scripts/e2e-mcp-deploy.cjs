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
 *     payload with a bag_id; if a domain was given, asserts a non-null
 *     dns_tx_hash.
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
 */

const { spawn, execSync } = require('node:child_process')
const path = require('node:path')

const SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'mcp.js')
const FIXTURE_DIR = path.resolve(__dirname, '..', 'test', 'fixtures', 'minimal-site')
const HANDSHAKE_TIMEOUT_MS = 10_000
const DEPLOY_TIMEOUT_MS = 5 * 60_000 // mainnet deploy: upload + DNS confirm

const AGENTIC = process.env.E2E_AUTO_SIGN === '1'
const TONCONNECT = process.env.E2E_TONCONNECT === '1'
const ARMED = AGENTIC || TONCONNECT
const CANCEL = process.env.E2E_CANCEL === '1'
const DOMAIN = process.env.E2E_MAINNET_DOMAIN || null

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
    params: { name: 'mesh_check_env', arguments: { source_dir: FIXTURE_DIR } },
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
        source_dir: FIXTURE_DIR,
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
  if (DOMAIN && (sc.dns_tx_hash === null || sc.dns_tx_hash === undefined)) {
    throw new Error(`deploy with domain=${DOMAIN} but dns_tx_hash is null — DNS write did not land`)
  }
  log(`Stage 2: deploy DONE — bag_id=${sc.bag_id} dns_tx_hash=${sc.dns_tx_hash ?? '(none)'} seed_status=${sc.seed_status}`)
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
        source_dir: FIXTURE_DIR,
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

async function main() {
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
    log('PASS (stage 1 only).')
    return
  }

  await stage2Deploy(srv, checkEnv)
  try {
    srv.child.kill()
  } catch {
    /* ignore */
  }

  if (CANCEL) {
    await stage3Cancel()
  } else {
    log('Stage 3 SKIPPED (set E2E_CANCEL=1 to run the cancellation hygiene check).')
  }
  log('PASS (full E2E).')
}

main().catch((err) => {
  process.stderr.write(`E2E FAILED: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
