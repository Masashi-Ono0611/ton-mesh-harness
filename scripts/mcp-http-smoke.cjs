#!/usr/bin/env node
/**
 * HTTP-transport smoke (#33) — spawns `dist/mcp.js --http :PORT`, then over
 * HTTP does initialize → notifications/initialized → tools/list and asserts
 * serverInfo + the three tool names. Mirrors scripts/mcp-smoke.cjs (stdio).
 *
 * Exits 0 on success, 1 on any failure with a descriptive stderr message.
 */

const { spawn } = require('node:child_process')
const http = require('node:http')
const path = require('node:path')

const SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'mcp.js')
const HOST = '127.0.0.1'
const PORT = 18765
const MCP_PATH = '/mcp'
const TIMEOUT_MS = 15_000

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function post(body, sessionId) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body), 'utf8')
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        path: MCP_PATH,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            sessionId: res.headers['mcp-session-id'],
            text: Buffer.concat(chunks).toString('utf8'),
          }),
        )
      },
    )
    req.on('error', reject)
    req.end(payload)
  })
}

// enableJsonResponse → plain JSON; but tolerate an SSE-framed body too.
function parseBody(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return JSON.parse(trimmed)
  for (const line of trimmed.split('\n')) {
    const s = line.trim()
    if (s.startsWith('data:')) return JSON.parse(s.slice(5).trim())
  }
  throw new Error(`unparseable body: ${text.slice(0, 200)}`)
}

async function waitForListen(deadline) {
  while (Date.now() < deadline) {
    try {
      const r = await post({ jsonrpc: '2.0', id: 0, method: 'ping' }).catch(() => null)
      if (r) return // server answered (any status)
    } catch {
      /* not up yet */
    }
    await wait(200)
  }
  throw new Error('HTTP server did not start listening in time')
}

async function main() {
  const child = spawn(process.execPath, [SERVER_PATH, '--http', `:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.on('data', (d) => (stderr += d.toString('utf8')))

  try {
    await waitForListen(Date.now() + TIMEOUT_MS)

    const initRes = await post({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'http-smoke', version: '0.0.0' } },
    })
    if (!initRes.status || initRes.status >= 400) {
      throw new Error(`initialize HTTP ${initRes.status}; body=${initRes.text.slice(0, 200)}; stderr=${stderr.slice(0, 200)}`)
    }
    const init = parseBody(initRes.text)
    if (init.result?.serverInfo?.name !== 'ton-sovereign-mcp') {
      throw new Error(`initialize.serverInfo.name unexpected: ${JSON.stringify(init.result?.serverInfo)}`)
    }
    const sessionId = initRes.sessionId
    if (!sessionId) throw new Error('no mcp-session-id returned from initialize')

    await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId)

    const listRes = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, sessionId)
    const list = parseBody(listRes.text)
    const names = (list.result?.tools ?? []).map((t) => t.name).sort()
    const expected = [
      'sovereign_check_env',
      'sovereign_deploy',
      'sovereign_site_record',
      'sovereign_status',
    ]
    if (JSON.stringify(names) !== JSON.stringify(expected)) {
      throw new Error(`tools/list mismatch: expected ${expected.join(', ')} got ${names.join(', ')}`)
    }

    process.stdout.write(
      `MCP HTTP smoke OK — http://${HOST}:${PORT}${MCP_PATH}; serverInfo=${init.result.serverInfo.name}; ` +
        `session=${String(sessionId).slice(0, 8)}…; tools=${names.join(', ')}\n`,
    )
  } finally {
    try {
      child.kill()
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  process.stderr.write(`MCP HTTP smoke FAILED: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
