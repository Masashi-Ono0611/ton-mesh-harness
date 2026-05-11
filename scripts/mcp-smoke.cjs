#!/usr/bin/env node
/**
 * Portable MCP smoke test — spawns `dist/mcp.js`, sends initialize +
 * notifications/initialized + tools/list via stdio JSON-RPC, parses
 * the responses, asserts on serverInfo + both tool names.
 *
 * Replaces the prior bash + `timeout` + `grep` recipe — `timeout` is
 * GNU coreutils and not available by default on macOS GitHub runners,
 * so this is the CI-portable version.
 *
 * Exits 0 on success, 1 on any failure with a descriptive message
 * routed to stderr.
 */

const { spawn } = require('node:child_process')
const path = require('node:path')

const SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'mcp.js')
const TIMEOUT_MS = 10_000

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
      /* not a complete JSON line — ignore */
    }
  }
  return out
}

async function main() {
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

  let resolved = false
  const done = new Promise((resolve, reject) => {
    const onExit = (code) => {
      if (resolved) return
      resolved = true
      if (code !== 0 && code !== null) {
        reject(new Error(`server exited with code ${code}; stderr=${stderrBuf}`))
      } else {
        resolve()
      }
    }
    child.on('exit', onExit)
    child.on('error', (err) => {
      if (!resolved) {
        resolved = true
        reject(err)
      }
    })
  })

  // initialize
  send(child, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'ci-smoke', version: '0.0.0' },
    },
  })

  // notifications/initialized (handshake completes)
  await wait(200)
  send(child, { jsonrpc: '2.0', method: 'notifications/initialized' })
  await wait(200)

  // tools/list
  send(child, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })

  // tools/call sovereign_check_env — exercises the actual dispatch path,
  // not just the metadata surface. source_dir:null skips the build-dir
  // probe so we don't need a fixture directory. The result is the
  // structured CheckEnvResult; we'll inspect `ready` etc.
  send(child, {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'sovereign_check_env',
      arguments: { source_dir: null },
    },
  })

  // Wait up to TIMEOUT_MS for id=1 + id=2 + id=3 responses to land.
  const deadline = Date.now() + TIMEOUT_MS
  let init
  let list
  let callRes
  while (Date.now() < deadline) {
    const frames = parseFrames(stdoutBuf)
    init = init ?? frames.find((f) => f.id === 1)
    list = list ?? frames.find((f) => f.id === 2)
    callRes = callRes ?? frames.find((f) => f.id === 3)
    if (init && list && callRes) break
    await wait(100)
  }

  // Stop the server cleanly.
  try {
    child.stdin.end()
  } catch {
    /* ignore */
  }
  try {
    child.kill()
  } catch {
    /* ignore */
  }
  await done.catch(() => {
    /* expected when we kill() */
  })

  // Assertions.
  if (!init) throw new Error(`no initialize response within ${TIMEOUT_MS}ms; stdout=${stdoutBuf.slice(0, 500)} stderr=${stderrBuf.slice(0, 500)}`)
  if (init.result?.serverInfo?.name !== 'ton-sovereign-mcp') {
    throw new Error(`initialize.serverInfo.name unexpected: ${JSON.stringify(init.result?.serverInfo)}`)
  }
  if (!list) throw new Error(`no tools/list response within ${TIMEOUT_MS}ms`)
  const names = (list.result?.tools ?? []).map((t) => t.name).sort()
  const expected = ['sovereign_check_env', 'sovereign_deploy', 'sovereign_status']
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`tools/list mismatch: expected ${expected.join(', ')} got ${names.join(', ')}`)
  }
  if (!callRes) throw new Error(`no tools/call response within ${TIMEOUT_MS}ms`)
  // The server returns a structured payload via `structuredContent` (per
  // our F5 contract). For sovereign_check_env, expect a CheckEnvResult
  // with `ready: boolean`. Any TONAPI / disk / port probe failure makes
  // `ready` false, but the shape MUST be present.
  const sc = callRes.result?.structuredContent
  if (!sc || typeof sc.ready !== 'boolean') {
    throw new Error(`sovereign_check_env structuredContent missing or shape unexpected: ${JSON.stringify(callRes.result).slice(0, 300)}`)
  }
  if (!Array.isArray(sc.blocking) || !Array.isArray(sc.warnings)) {
    throw new Error(`sovereign_check_env blocking/warnings arrays missing`)
  }
  if (sc.ready !== (sc.blocking.length === 0)) {
    throw new Error(`sovereign_check_env ready ⇔ blocking.length === 0 invariant broken`)
  }

  process.stdout.write(
    `MCP smoke OK — initialize.serverInfo.name=${init.result.serverInfo.name}, ` +
      `tools=${names.join(', ')}, ` +
      `check_env.ready=${sc.ready}\n`,
  )
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((err) => {
  process.stderr.write(`MCP smoke FAILED: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
