import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { type Server as HttpServer } from 'node:http'
import { connect, type Socket, type AddressInfo } from 'node:net'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { runHttpTransport, computeHostPinning } from '../src/mcp-http'

describe('computeHostPinning — DNS-rebinding Host pinning policy (#100)', () => {
  it('loopback bind: pinning ON, allows loopback variants', () => {
    const r = computeHostPinning({ host: '127.0.0.1', port: 8765 }, undefined)
    expect(r.enableDnsRebindingProtection).toBe(true)
    expect(r.allowedHosts).toContain('127.0.0.1:8765')
    expect(r.allowedHosts).toContain('localhost:8765')
  })

  it('specific non-loopback IP bind: pinning ON, allows that host:port', () => {
    const r = computeHostPinning({ host: '203.0.113.5', port: 8765 }, undefined)
    expect(r.enableDnsRebindingProtection).toBe(true)
    expect(r.allowedHosts).toContain('203.0.113.5:8765')
  })

  it('wildcard bind with NO MCP_HTTP_ALLOWED_HOSTS: pinning DISABLED (bearer is authn)', () => {
    for (const host of ['0.0.0.0', '::', '[::]', '::0', '[::0]']) {
      expect(computeHostPinning({ host, port: 8765 }, undefined).enableDnsRebindingProtection).toBe(false)
    }
    // whitespace-only env is treated as "no explicit hosts"
    expect(computeHostPinning({ host: '0.0.0.0', port: 8765 }, '   ').enableDnsRebindingProtection).toBe(false)
  })

  it('wildcard bind WITH MCP_HTTP_ALLOWED_HOSTS: pinning ON, merges the operator hosts', () => {
    const r = computeHostPinning({ host: '0.0.0.0', port: 8765 }, 'mcp.example.com:8765, 198.51.100.7:8765')
    expect(r.enableDnsRebindingProtection).toBe(true)
    expect(r.allowedHosts).toContain('mcp.example.com:8765')
    expect(r.allowedHosts).toContain('198.51.100.7:8765')
    expect(r.allowedHosts).toContain('127.0.0.1:8765') // loopback still allowed
  })

  it('trims and drops empty MCP_HTTP_ALLOWED_HOSTS entries', () => {
    const r = computeHostPinning({ host: '127.0.0.1', port: 80 }, ' a:1 , , b:2 ,')
    expect(r.allowedHosts).toContain('a:1')
    expect(r.allowedHosts).toContain('b:2')
    expect(r.allowedHosts).not.toContain('')
  })
})

// Integration: a wildcard bind must actually ACCEPT a request whose Host is not
// the bind literal (before #100 the SDK 403'd it as "Invalid Host header").
function portOf(s: HttpServer): number {
  const a = s.address() as AddressInfo | null
  if (!a || typeof a !== 'object') throw new Error('not listening')
  return a.port
}

function rawPost(port: number, hostHeader: string, token: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const sock: Socket = connect({ host: '127.0.0.1', port }, () => {
      const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
      sock.write(
        `POST /mcp HTTP/1.1\r\nHost: ${hostHeader}\r\nAuthorization: Bearer ${token}\r\n` +
          `Content-Type: application/json\r\nAccept: application/json, text/event-stream\r\n` +
          `Content-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`,
      )
    })
    sock.setTimeout(3000, () => sock.destroy(new Error('timeout')))
    const chunks: Buffer[] = []
    sock.on('data', (c) => chunks.push(c as Buffer))
    sock.on('error', reject)
    sock.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      const status = Number.parseInt(text.match(/^HTTP\/1\.1 (\d+)/)?.[1] ?? '0', 10)
      resolve({ status, body: text.split('\r\n\r\n').slice(1).join('\r\n\r\n') })
    })
  })
}

describe('runHttpTransport — wildcard bind accepts a foreign Host (#100, integration)', () => {
  let httpServer: HttpServer | undefined
  const TOKEN = 'test-token-100'
  let savedToken: string | undefined
  let savedHosts: string | undefined

  beforeEach(() => {
    savedToken = process.env.MCP_HTTP_TOKEN
    savedHosts = process.env.MCP_HTTP_ALLOWED_HOSTS
    process.env.MCP_HTTP_TOKEN = TOKEN // required for a non-loopback bind
    delete process.env.MCP_HTTP_ALLOWED_HOSTS
  })
  afterEach(async () => {
    if (savedToken === undefined) delete process.env.MCP_HTTP_TOKEN
    else process.env.MCP_HTTP_TOKEN = savedToken
    if (savedHosts === undefined) delete process.env.MCP_HTTP_ALLOWED_HOSTS
    else process.env.MCP_HTTP_ALLOWED_HOSTS = savedHosts
    if (httpServer) {
      await new Promise<void>((r) => httpServer!.close(() => r()))
      httpServer = undefined
    }
  })

  it('does NOT 403 a request carrying an arbitrary public Host header', async () => {
    httpServer = await runHttpTransport(
      new Server({ name: 'test', version: '0.0.0' }, { capabilities: { tools: {} } }),
      { host: '0.0.0.0', port: 0 },
    )
    const port = portOf(httpServer)
    // Connect over loopback but present a foreign Host, as a remote client would.
    const res = await rawPost(port, '203.0.113.9:' + port, TOKEN)
    // The Host check ran before the fix and returned 403 "Invalid Host header".
    // It must no longer do so for a wildcard bind.
    expect(res.status).not.toBe(403)
    expect(res.body.toLowerCase()).not.toContain('invalid host')
  })

  it('STILL 403s a foreign Host on a loopback bind (pinning stays on — security invariant)', async () => {
    // Loopback is never wildcard, so DNS-rebinding Host pinning must remain on
    // regardless of MCP_HTTP_ALLOWED_HOSTS. Guards against a regression that
    // accidentally disables pinning for non-wildcard binds.
    delete process.env.MCP_HTTP_TOKEN // loopback needs no token
    httpServer = await runHttpTransport(
      new Server({ name: 'test', version: '0.0.0' }, { capabilities: { tools: {} } }),
      { host: '127.0.0.1', port: 0 },
    )
    const port = portOf(httpServer)
    const res = await rawPost(port, '203.0.113.9:' + port, '')
    expect(res.status).toBe(403)
  })
})
