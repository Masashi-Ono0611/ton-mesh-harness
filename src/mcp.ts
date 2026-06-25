#!/usr/bin/env node
// ton-mesh-harness-mcp — MCP server for AI agents.
//
// Spec: docs/v0.8/mcp-core-requirements.md §F1 (server binary), §F2 (tools),
// §F3 (progress notifications), §F4 (cancellation), §F5 (error contract).
//
// Wires the kit's SDK to the Model Context Protocol so an agent can call:
//   mesh_check_env  — pre-flight readiness probe
//   mesh_deploy     — bag creation core (rc2 scope; DNS deferred to S2.5)
//
// Transport: stdio only (per §NF4). Stdout is MCP JSON-RPC framing; all
// human / debug output goes to stderr.
//
// Uses the LOW-LEVEL `Server` + `setRequestHandler` API (not the high-level
// `McpServer.registerTool` helper) because the helper validates input via
// the registered zod schema BEFORE our callback runs — that converts
// strict-object schema violations into plain-text MCP errors instead of
// our F5 `{code, message, severity, ...}` structured payload. The low-
// level path lets us own validation and emit F5 errors uniformly.

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { checkEnv } from './sdk/check'
import { deploy, SdkError } from './sdk/deploy'
import { status } from './sdk/status'
import { siteRecord } from './sdk/site-record'
import {
  ALL_TOOLS,
  MESH_CHECK_ENV_TOOL,
  MESH_DEPLOY_TOOL,
  MESH_SITE_RECORD_TOOL,
  MESH_STATUS_TOOL,
} from './sdk/json-schemas'
import { DeployOptionsSchema } from './sdk/schemas'

import { MESH_HARNESS_VERSION as SERVER_VERSION } from './version'

const SERVER_NAME = 'ton-mesh-harness-mcp'

// ─────────────────────────────────────────────────────────────────────────────
// Result helpers (F5 structured error contract)
// ─────────────────────────────────────────────────────────────────────────────

type CallToolResult = Record<string, unknown> & {
  content: Array<{ type: 'text'; text: string }>
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

function structuredOk(payload: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  }
}

function structuredErr(err: unknown): CallToolResult {
  const payload =
    err instanceof SdkError
      ? {
          code: err.code,
          message: err.message,
          severity: err.severity,
          ...(err.fixHint ? { fix_hint: err.fixHint } : {}),
          ...(err.data ? { data: err.data } : {}),
        }
      : {
          code: 'ERR_INTERNAL',
          message: err instanceof Error ? err.message : String(err),
          severity: 'fatal',
        }
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: true,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool descriptors — sourced from src/sdk/json-schemas.ts so the JSON Schema
// snapshot test ([V1] #11) is the contract authority. Descriptions live here
// so the [V4] red-team test's discoverability heuristic surfaces them.
// ─────────────────────────────────────────────────────────────────────────────

const CHECK_ENV_DESCRIPTION =
  'Pre-flight readiness probe for ton-mesh-harness. Call BEFORE mesh_deploy to surface fixable problems early. Reports: daemon binary install state, network reachability (TONAPI / TonConnect manifest), UDP port 17555 availability, wallet signers available (tonconnect / agentic via @ton/mcp shared config), disk free, source_dir validity, and any blocking issues with fix hints.'

const DEPLOY_DESCRIPTION =
  'Deploy a static site to .ton by uploading a build directory to TON Storage AND writing the .ton DNS STORAGE record (the bag pointer). Censorship-resistant — no server, no CDN, no domain registrar. NOTE: this writes the STORAGE record only, NOT the site/ADNL record — so <domain>.ton is NOT browser-openable via the ton.run gateway after this call (it 404s); a storage-only domain renders only in a TON-DNS-native client while a reachable node seeds the bag. To get a browser-openable <domain>.ton(.run) URL, additionally set a site/ADNL record via mesh_site_record and run a public gateway. Supports two signing modes: human-signed (TonConnect — agent surfaces a wallet URL via awaiting_signature.data.signing_url) and agentic (autonomous signing via a key in ~/.config/ton/config.json, shared with @ton/mcp). End-to-end since v0.8.0-rc3; real on-chain dns_tx_hash since rc4 (resolved via Toncenter v3 transactionsByMessage). Returns bag_id, dns_tx_hash, daemon_api_url, daemon_pid (when keep_alive=true), seed_status, and next_actions (which includes the storage-vs-site viewability breadcrumb when a domain is set).'

const STATUS_DESCRIPTION =
  'One-shot snapshot of a bag\'s network state. Given a bag_id (and optionally a .ton domain), queries TONAPI to report whether the bag is propagated, its current size + file count, and — when a domain is passed — whether the on-chain DNS storage record points at this bag. Use AFTER a mesh_deploy with keep_alive=false to check propagation status without keeping a daemon alive. Network failures absorb into bag_accessible=false rather than throwing, so the answer is always a clean snapshot, never a partial-state error.'

const SITE_RECORD_DESCRIPTION =
  'Build a Tonkeeper sign link that sets ONLY the `site` (dns_adnl_address) DNS record for a .ton domain you own — no bag upload, no storage record write, no daemon, no TonConnect. Use this to point a domain at a resident rldp-http-proxy ADNL identity (so `<domain>.ton` opens in TON Browser) WITHOUT re-deploying or overwriting the storage/bag record. Given { domain, site_adnl (64-hex ADNL), testnet? }, resolves the domain NFT via TONAPI and returns the change_dns_record body (BOC, base64url) plus a tonkeeper_deeplink (https://app.tonkeeper.com/transfer/...). Nothing is broadcast — the deeplink writes the record once a wallet signs it, so the agent should surface tonkeeper_deeplink to the human holding the domain.'

// ─────────────────────────────────────────────────────────────────────────────
// Server bootstrap (low-level handlers)
// ─────────────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } },
)

// tools/list — surface both GA tools with their JSON Schemas from
// src/sdk/json-schemas.ts (the snapshot-tested authority).
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: MESH_CHECK_ENV_TOOL.name,
        description: CHECK_ENV_DESCRIPTION,
        inputSchema: MESH_CHECK_ENV_TOOL.input,
      },
      {
        name: MESH_DEPLOY_TOOL.name,
        description: DEPLOY_DESCRIPTION,
        inputSchema: MESH_DEPLOY_TOOL.input,
      },
      {
        name: MESH_STATUS_TOOL.name,
        description: STATUS_DESCRIPTION,
        inputSchema: MESH_STATUS_TOOL.input,
      },
      {
        name: MESH_SITE_RECORD_TOOL.name,
        description: SITE_RECORD_DESCRIPTION,
        inputSchema: MESH_SITE_RECORD_TOOL.input,
      },
    ],
  }
})

// tools/call — dispatch by name. Validation lives INSIDE each branch using
// the strict zod schemas, so unknown-key typos and shape violations return
// `ERR_INVALID_INPUT` per F5 rather than the SDK's plain-text validator
// errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.setRequestHandler(CallToolRequestSchema, async (request: any, extra: any) => {
  const name: string = request.params.name
  const args: unknown = request.params.arguments ?? {}

  switch (name) {
    case 'mesh_check_env':
      return handleCheckEnv(args)
    case 'mesh_deploy':
      return handleDeploy(args, extra)
    case 'mesh_status':
      return handleStatus(args)
    case 'mesh_site_record':
      return handleSiteRecord(args)
    default:
      return structuredErr(
        new SdkError('ERR_INVALID_INPUT', `Unknown tool: ${name}`, { severity: 'fatal' }),
      )
  }
})

async function handleStatus(args: unknown): Promise<CallToolResult> {
  try {
    const result = await status(args)
    return structuredOk(result)
  } catch (err) {
    return structuredErr(err)
  }
}

// ─── mesh_site_record ────────────────────────────────────────────────────
//
// siteRecord() owns input validation (zod → SdkError(ERR_INVALID_INPUT)) and
// NFT resolution (→ SdkError(ERR_NO_DOMAIN)). It builds a deeplink but never
// broadcasts, so there is no daemon lifecycle to manage and no signing handoff
// — a plain one-shot like status().
async function handleSiteRecord(args: unknown): Promise<CallToolResult> {
  try {
    const result = await siteRecord(args)
    return structuredOk(result)
  } catch (err) {
    return structuredErr(err)
  }
}

// ─── mesh_check_env ────────────────────────────────────────────────────

async function handleCheckEnv(args: unknown): Promise<CallToolResult> {
  // checkEnv() owns input validation and wraps ZodError → SdkError(ERR_INVALID_INPUT)
  // itself (per the v0.8 SDK error contract). Don't pre-parse here — that
  // would double-validate AND swallow the SDK's wrapping.
  try {
    const result = await checkEnv(args as Parameters<typeof checkEnv>[0])
    return structuredOk(result)
  } catch (err) {
    return structuredErr(err)
  }
}

// ─── mesh_deploy ───────────────────────────────────────────────────────
//
// Drive the SDK deploy() generator. Forward each event as a
// notifications/progress message and return the terminal DeployResult.
//
// F4 caveat: when the MCP client sends notifications/cancelled, the SDK
// transport SUPPRESSES the response (per @modelcontextprotocol/sdk's
// protocol.js abort handling — once signal fires, the request is
// considered fire-and-forget). So our ERR_CANCELLED payload with
// `may_have_published` etc is built but the client never sees it. F4's
// honest semantics in MCP context: cancellation is fire-and-forget; if
// the client cares about post-cancel state, it should re-call
// mesh_check_env after to see if the daemon is still running.

async function handleDeploy(
  args: unknown,
  extra: { signal: AbortSignal; sendNotification: (n: unknown) => Promise<void>; _meta?: { progressToken?: string | number } },
): Promise<CallToolResult> {
  try {
    // MCP contract enforcement: the JSON Schema we advertise via
    // tools/list requires `wallet` to be a structured object union
    // (no bare-string CLI shortcut). The SDK's `deploy()` is more
    // permissive — it lifts `"Tonkeeper"` into `{kind: "tonconnect",
    // connector: "Tonkeeper"}` for CLI backwards-compat via
    // parseWalletInput(). Without this strict pre-parse, a non-
    // compliant MCP client could send a string wallet and silently
    // get past the contract. Both this path AND the SDK's own
    // ZodError wrap (src/sdk/deploy.ts::normalize) include
    // `data.zod_issues` for diagnostics — the explicit MCP gate
    // here fires first for malformed input, so its zod_issues
    // (rooted at the structured-object union) are the ones
    // surfaced.
    //
    // Codex pre-GA review round 4 caught the dropped strictness
    // from the rc7 dedup refactor — restoring with a clarified
    // contract role.
    let parsed
    try {
      parsed = DeployOptionsSchema.parse(args)
    } catch (err) {
      if (err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError') {
        throw new SdkError(
          'ERR_INVALID_INPUT',
          `Invalid mesh_deploy input: ${(err as Error).message}`,
          {
            severity: 'fatal',
            data: { zod_issues: (err as { issues?: unknown }).issues },
          },
        )
      }
      throw err
    }

    // The MCP server can't OWN a long-lived daemon (it would orphan it on
    // server shutdown), so `detached` (≡ legacy keep_alive:true) is still
    // rejected. But `service` mode (#37) hands the daemon to launchd /
    // systemd, so the OS owns the lifecycle — that IS allowed via MCP.
    const effectiveMode =
      parsed.daemon_mode === 'embedded' && parsed.keep_alive ? 'detached' : parsed.daemon_mode
    if (effectiveMode === 'detached') {
      throw new SdkError(
        'ERR_INVALID_INPUT',
        'daemon_mode "detached" (a.k.a. keep_alive:true) is not supported via MCP — the server ' +
          'has no per-call daemon-tracking surface and would orphan the daemon on shutdown. Use ' +
          'daemon_mode "service" (hands ownership to launchd/systemd) or "embedded" (one-shot).',
        { severity: 'fatal' },
      )
    }

    const progressToken: string | number | undefined = extra._meta?.progressToken
    const send = extra.sendNotification
    const signal = extra.signal

    let result: unknown
    let progressIndex = 0
    const totalPhases = 9 // env_check..done per F3
    // `parsed` already passed the strict MCP gate above. deploy()
    // will normalize() it (idempotent on a fully-typed DeployOptions).
    for await (const ev of deploy(parsed, { signal })) {
      if (progressToken !== undefined) {
        progressIndex++
        try {
          await send({
            method: 'notifications/progress',
            params: {
              progressToken,
              progress: progressIndex,
              total: totalPhases,
              message: `[${ev.phase}] ${ev.message}`,
              // _meta carries the structured event so agentic consumers
              // can branch on `phase` and read `data.signing_url` etc.
              // Human-only clients ignore _meta.
              _meta: {
                phase: ev.phase,
                ...(ev.percent !== undefined ? { percent: ev.percent } : {}),
                ...((ev as { data?: unknown }).data ? { data: (ev as { data: unknown }).data } : {}),
              },
            },
          })
        } catch {
          // Progress is advisory — never fail the deploy because the
          // notification couldn't be sent (transport dropped, etc.).
        }
      }
      if (ev.phase === 'done') result = ev.data
    }

    if (result === undefined) {
      throw new SdkError(
        'ERR_INTERNAL',
        'deploy() generator completed without yielding a `done` event.',
        { severity: 'fatal' },
      )
    }

    return structuredOk(result)
  } catch (err) {
    return structuredErr(err)
  }
}

// Assert at startup that ALL_TOOLS still has exactly the tools we wire above;
// if a new tool is added to the SDK without wiring here, fail loud.
if (ALL_TOOLS.length !== 4) {
  process.stderr.write(
    `ton-mesh-harness-mcp: ALL_TOOLS has ${ALL_TOOLS.length} entries; expected 4 (mesh_check_env + mesh_deploy + mesh_status + mesh_site_record). ` +
      `Wire any new tools in src/mcp.ts before shipping.\n`,
  )
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect stdio + run
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Opt-in HTTP transport (#33): `--http <addr>` replaces stdio (mutually
  // exclusive). stdio stays the default for local-host MCP clients.
  const httpIdx = process.argv.indexOf('--http')
  if (httpIdx !== -1) {
    const { parseHttpAddr, runHttpTransport } = await import('./mcp-http.js')
    await runHttpTransport(server, parseHttpAddr(process.argv[httpIdx + 1]))
    return
  }
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  process.stderr.write(
    `ton-mesh-harness-mcp: fatal startup error: ${err instanceof Error ? err.message : String(err)}\n`,
  )
  process.exit(1)
})
