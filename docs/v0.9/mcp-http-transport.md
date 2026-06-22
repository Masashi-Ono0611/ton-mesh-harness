# MCP HTTP transport (#33)

`ton-mesh-harness-mcp` speaks **stdio by default** — the right transport for
local-host MCP clients (Claude Code desktop, Cursor, etc.): single
process, no network listener, no auth surface.

`--http <addr>` opts into a **Streamable-HTTP** MCP endpoint for remote /
reverse-proxied agent runtimes. stdio and HTTP are mutually exclusive
(`--http` replaces stdio).

## When to use which

| | stdio (default) | `--http` |
|---|---|---|
| Local Claude Code / Cursor | ✅ | — |
| Self-hosted agent platform behind a reverse proxy | — | ✅ |
| Kit on a Linux box, agent elsewhere | — | ✅ |
| Browser-based MCP clients (when they emerge) | — | ✅ (with CORS) |

## Usage

```bash
# Loopback, no auth — safe local default:
npx ton-mesh-harness-mcp --http :8765
#   → http://127.0.0.1:8765/mcp

# Explicit host:
npx ton-mesh-harness-mcp --http 127.0.0.1:8765

# Exposed bind — REQUIRES a bearer token (refuses to start otherwise):
MCP_HTTP_TOKEN=$(openssl rand -hex 32) \
  npx ton-mesh-harness-mcp --http 0.0.0.0:8765
```

The endpoint is `POST/GET/DELETE /mcp`. Responses are plain JSON
(`enableJsonResponse`), so a basic HTTP client works without SSE parsing.
The MCP session id is returned in the `mcp-session-id` response header on
`initialize`; send it back on subsequent requests.

## Authentication

- `MCP_HTTP_TOKEN` — when set, **every** request must carry
  `Authorization: Bearer <token>` (else `401`).
- A **non-loopback** bind (anything but `127.0.0.1` / `::1` / `localhost`)
  **requires** `MCP_HTTP_TOKEN` — the server refuses to start without it.
  Loopback binds may run tokenless (only this machine can reach them).

## CORS

Off by default. Set `MCP_HTTP_CORS_ORIGINS` to a comma-separated allow-list
to enable it for browser clients:

```bash
MCP_HTTP_CORS_ORIGINS="https://my-agent.example,https://localhost:3000" \
  MCP_HTTP_TOKEN=… npx ton-mesh-harness-mcp --http 0.0.0.0:8765
```

Only listed origins get `Access-Control-Allow-Origin`; preflight
(`OPTIONS`) is answered only for them.

## Threat model

- **No TLS** — out of scope. Terminate TLS at a reverse proxy (nginx,
  Caddy, Cloudflare Tunnel) in front of the kit; never expose a raw
  non-loopback bind to the internet.
- **DNS-rebinding protection** is on: the `Host` header is pinned to the
  bind address, so a malicious page can't drive `localhost` via a victim's
  browser.
- **Single client / single instance** per the MCP spec; the kit's
  process-level `ERR_BUSY` gate already serializes concurrent
  `mesh_deploy` calls, which applies equally over HTTP.
- The bearer token is the only authn — treat it like a password (rotate
  it, keep it out of shell history / logs, prefer an env file).

## Out of scope

TLS termination (reverse proxy), WebSocket transport (not in the MCP
spec), multi-client fan-out on one instance.
