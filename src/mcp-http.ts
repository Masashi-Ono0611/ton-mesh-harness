/**
 * Opt-in HTTP transport for ton-mesh-harness-mcp (#33).
 *
 * stdio stays the default (local-host MCP clients). `--http <addr>` binds a
 * Streamable-HTTP MCP endpoint at `/mcp` for remote / reverse-proxied
 * agent runtimes. Single-instance, single-session (per the MCP spec's
 * single-client semantic + the kit's process-level ERR_BUSY gate).
 *
 * Safety posture:
 *  - binds 127.0.0.1 by default; a non-loopback bind REQUIRES MCP_HTTP_TOKEN.
 *  - bearer-token auth enforced whenever MCP_HTTP_TOKEN is set.
 *  - CORS off unless MCP_HTTP_CORS_ORIGINS lists explicit origins.
 *  - DNS-rebinding protection on (Host pinned to the bind addr).
 *  - TLS is out of scope — terminate at a reverse proxy.
 *
 * NOTE: not in src/sdk/, so console/process IO is allowed here.
 */

import { createServer, type Server as HttpServer } from 'node:http'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'

export const MCP_HTTP_PATH = '/mcp'
/** Cap on a single request body — MCP JSON-RPC messages are tiny. */
const MAX_BODY_BYTES = 4 * 1024 * 1024

/** Constant-time bearer-token check (avoids byte-by-byte timing recovery). */
function bearerOk(header: string | undefined, token: string): boolean {
  const got = Buffer.from(header ?? '')
  const want = Buffer.from(`Bearer ${token}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

export interface HttpAddr {
  host: string
  port: number
}

/** Parse `--http` values: `:8765` | `8765` | `127.0.0.1:8765` | `0.0.0.0:8765`. */
export function parseHttpAddr(raw: string): HttpAddr {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) throw new Error('--http requires an address (e.g. --http :8765)')
  let host = '127.0.0.1'
  let portStr = trimmed
  if (trimmed.includes(':')) {
    const idx = trimmed.lastIndexOf(':')
    const h = trimmed.slice(0, idx)
    portStr = trimmed.slice(idx + 1)
    if (h) host = h
  }
  const port = Number.parseInt(portStr, 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid --http address '${raw}' — expected host:port or :port`)
  }
  return { host, port }
}

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost'
}

/**
 * Bind the HTTP transport and connect it to `server`. Resolves once the
 * listener is up (returning the underlying http.Server so callers/tests can
 * close it); the process then stays alive serving requests.
 */
export async function runHttpTransport(server: Server, addr: HttpAddr): Promise<HttpServer> {
  const token = process.env.MCP_HTTP_TOKEN?.trim() || ''
  if (!isLoopback(addr.host) && !token) {
    throw new Error(
      `refusing to bind ${addr.host}: a non-loopback HTTP bind requires MCP_HTTP_TOKEN ` +
        `(bearer auth). Set MCP_HTTP_TOKEN, or bind 127.0.0.1.`,
    )
  }
  const corsOrigins = (process.env.MCP_HTTP_CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
    enableDnsRebindingProtection: true,
    allowedHosts: [`${addr.host}:${addr.port}`, `127.0.0.1:${addr.port}`, `localhost:${addr.port}`],
  })
  await server.connect(transport)

  const httpServer = createServer((req, res) => {
    void (async () => {
      // CORS (off unless an allow-list is configured).
      const origin = req.headers.origin
      if (origin && corsOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, mcp-session-id, mcp-protocol-version',
        )
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS')
        res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id')
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(origin && corsOrigins.includes(origin) ? 204 : 405).end()
        return
      }

      if ((req.url ?? '').split('?')[0] !== MCP_HTTP_PATH) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found')
        return
      }

      // Bearer auth (enforced whenever a token is configured). Constant-time
      // compare so the token can't be recovered byte-by-byte via timing.
      if (token && !bearerOk(req.headers.authorization, token)) {
        res.writeHead(401, { 'www-authenticate': 'Bearer', 'content-type': 'text/plain' }).end('unauthorized')
        return
      }

      // Parse a JSON body for POST; GET/DELETE carry none. Cap the body so a
      // hostile client can't exhaust memory — MCP JSON-RPC messages are small.
      let body: unknown
      if (req.method === 'POST') {
        const chunks: Buffer[] = []
        let size = 0
        let tooLarge = false
        try {
          for await (const c of req) {
            size += (c as Buffer).length
            if (size > MAX_BODY_BYTES) {
              tooLarge = true
              break
            }
            chunks.push(c as Buffer)
          }
        } catch (err) {
          // The request stream errored mid-body — client aborted the POST, or
          // the socket was reset / closed prematurely (ECONNRESET, aborted).
          // The async iterator rejects here; without this catch the rejection
          // escapes the fire-and-forget handler and, under Node's default
          // --unhandled-rejections=throw, takes down the whole server. Swallow
          // it, best-effort 400 if the socket is still writable, and move on.
          if (!res.headersSent) {
            try {
              res.writeHead(400, { 'content-type': 'text/plain' }).end('request aborted')
            } catch {
              /* socket already gone */
            }
          }
          process.stderr.write(
            `ton-mesh-harness-mcp: HTTP request body read aborted: ${err instanceof Error ? err.message : String(err)}\n`,
          )
          return
        }
        if (tooLarge) {
          res.writeHead(413, { 'content-type': 'text/plain' }).end('payload too large')
          req.destroy()
          return
        }
        const raw = Buffer.concat(chunks).toString('utf8')
        if (raw) {
          try {
            body = JSON.parse(raw)
          } catch {
            res.writeHead(400, { 'content-type': 'text/plain' }).end('invalid JSON body')
            return
          }
        }
      }

      try {
        await transport.handleRequest(req, res, body)
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'content-type': 'text/plain' }).end('internal error')
        }
        process.stderr.write(
          `ton-mesh-harness-mcp: HTTP request error: ${err instanceof Error ? err.message : String(err)}\n`,
        )
      }
    })().catch((err) => {
      // Defense in depth: every async path above is already guarded, but a
      // late stream/socket error (e.g. a write after headers, a teardown
      // race) must never surface as an unhandledRejection — that crashes the
      // entire HTTP MCP server. Absorb it here as the last line of defense.
      if (!res.headersSent) {
        try {
          res.writeHead(500, { 'content-type': 'text/plain' }).end('internal error')
        } catch {
          /* socket already gone */
        }
      }
      process.stderr.write(
        `ton-mesh-harness-mcp: HTTP request handler error: ${err instanceof Error ? err.message : String(err)}\n`,
      )
    })
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(addr.port, addr.host, () => resolve())
  })

  process.stderr.write(
    `ton-mesh-harness-mcp: HTTP transport listening on http://${addr.host}:${addr.port}${MCP_HTTP_PATH}` +
      `${token ? ' (bearer auth on)' : ''}${corsOrigins.length ? ` (CORS: ${corsOrigins.join(', ')})` : ''}\n`,
  )
  return httpServer
}
