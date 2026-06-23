import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { type Server as HttpServer } from 'node:http'
import { connect, type Socket, type AddressInfo } from 'node:net'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { runHttpTransport } from '../src/mcp-http'

function newServer(): Server {
  return new Server({ name: 'test', version: '0.0.0' }, { capabilities: { tools: {} } })
}

function portOf(s: HttpServer): number {
  const a = s.address() as AddressInfo | null
  if (!a || typeof a !== 'object') throw new Error('server not listening')
  return a.port
}

// Minimal GET that resolves to { status } — used as a liveness probe. Times out
// rather than hanging if the server never replies.
function get(port: number, path: string): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const req: Socket = connect({ host: '127.0.0.1', port }, () => {
      req.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`)
    })
    req.setTimeout(3000, () => req.destroy(new Error('probe timeout')))
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c as Buffer))
    req.on('error', reject)
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      const status = Number.parseInt(text.match(/^HTTP\/1\.1 (\d+)/)?.[1] ?? '0', 10)
      resolve({ status })
    })
  })
}

describe('runHttpTransport — request-stream resilience (#95)', () => {
  let httpServer: HttpServer | undefined
  // Hermetic env: a stray MCP_HTTP_TOKEN would 401 the POST before the body is
  // read (defeating the abort test); MCP_HTTP_CORS_ORIGINS would alter routing.
  let savedToken: string | undefined
  let savedCors: string | undefined

  beforeEach(() => {
    savedToken = process.env.MCP_HTTP_TOKEN
    savedCors = process.env.MCP_HTTP_CORS_ORIGINS
    delete process.env.MCP_HTTP_TOKEN
    delete process.env.MCP_HTTP_CORS_ORIGINS
  })

  afterEach(async () => {
    if (savedToken === undefined) delete process.env.MCP_HTTP_TOKEN
    else process.env.MCP_HTTP_TOKEN = savedToken
    if (savedCors === undefined) delete process.env.MCP_HTTP_CORS_ORIGINS
    else process.env.MCP_HTTP_CORS_ORIGINS = savedCors
    if (httpServer) {
      await new Promise<void>((r) => httpServer!.close(() => r()))
      httpServer = undefined
    }
  })

  it('survives a POST whose body is reset mid-stream (no unhandled rejection / crash)', async () => {
    // Bind :0 and read the OS-assigned port back off the returned server — no
    // free-port probe, so no close→rebind TOCTOU that could flake on EADDRINUSE.
    httpServer = await runHttpTransport(newServer(), { host: '127.0.0.1', port: 0 })
    const port = portOf(httpServer)

    // Sanity: the server is up and routes a non-/mcp path to 404 (this check
    // runs before auth, so it holds regardless of token config).
    const before = await get(port, '/healthz-probe')
    expect(before.status).toBe(404)

    // Open a raw socket, announce a large body, send a few bytes, then RESET
    // the connection (destroy) so the request stream errors mid-body. Before
    // the fix this rejected the handler's fire-and-forget promise and crashed
    // the process under Node's default --unhandled-rejections=throw.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('abort test timed out')), 2000)
      timer.unref?.()
      const done = () => {
        clearTimeout(timer)
        resolve()
      }
      const sock: Socket = connect({ host: '127.0.0.1', port }, () => {
        sock.write(
          `POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n` +
            `Content-Type: application/json\r\nContent-Length: 1000\r\n\r\n`,
        )
        sock.write('{"part') // far fewer than the promised 1000 bytes
        // Reset the connection on the next tick so the server has begun reading.
        setTimeout(() => sock.destroy(), 30)
      })
      // A reset on our own side may surface as ECONNRESET; that's expected.
      sock.on('error', done)
      sock.on('close', done)
    })

    // Give the event loop a tick for any (now-absorbed) rejection to fire.
    await new Promise((r) => setTimeout(r, 50))

    // The server must STILL be listening and answering — proof it did not crash.
    const after = await get(port, '/healthz-probe')
    expect(after.status).toBe(404)
  })

  it('returns the live http.Server handle so callers can close it', async () => {
    httpServer = await runHttpTransport(newServer(), { host: '127.0.0.1', port: 0 })
    expect(httpServer.listening).toBe(true)
  })
})
