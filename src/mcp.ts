#!/usr/bin/env node
// ton-sovereign-mcp — MCP server for AI agents.
//
// Spec: docs/v0.8/mcp-core-requirements.md §F1 (server binary), §F2 (tools),
// §F3 (progress notifications), §F4 (cancellation), §F5 (error contract).
//
// Wires the kit's SDK to the Model Context Protocol so an agent can call:
//   sovereign_check_env  — pre-flight readiness probe
//   sovereign_deploy     — bag creation core (rc2 scope; DNS deferred to S2.5)
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
import {
  ALL_TOOLS,
  SOVEREIGN_CHECK_ENV_TOOL,
  SOVEREIGN_DEPLOY_TOOL,
} from './sdk/json-schemas'
import { CheckEnvOptionsSchema, DeployOptionsSchema } from './sdk/schemas'

const SERVER_NAME = 'ton-sovereign-mcp'
const SERVER_VERSION = '0.8.0-rc5'

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
  'Pre-flight readiness probe for ton-sovereign-deploy. Call BEFORE sovereign_deploy to surface fixable problems early. Reports: daemon binary install state, network reachability (TONAPI / TonConnect manifest), UDP port 17555 availability, wallet signers available (tonconnect / agentic via @ton/mcp shared config), disk free, source_dir validity, and any blocking issues with fix hints.'

const DEPLOY_DESCRIPTION =
  'Deploy a static site to .ton by uploading a build directory to TON Storage. Censorship-resistant — no server, no CDN, no domain registrar. Supports two signing modes: human-signed (TonConnect — agent surfaces a wallet URL) and agentic (autonomous signing via a key in ~/.config/ton/config.json, shared with @ton/mcp). v0.8.0-rc2 bag-creation only; .ton DNS write currently chained by the CLI (SDK DNS support lands at GA). Returns bag_id, daemon_api_url, daemon_pid (when keep_alive=true), and seed_status.'

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
        name: SOVEREIGN_CHECK_ENV_TOOL.name,
        description: CHECK_ENV_DESCRIPTION,
        inputSchema: SOVEREIGN_CHECK_ENV_TOOL.input,
      },
      {
        name: SOVEREIGN_DEPLOY_TOOL.name,
        description: DEPLOY_DESCRIPTION,
        inputSchema: SOVEREIGN_DEPLOY_TOOL.input,
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
    case 'sovereign_check_env':
      return handleCheckEnv(args)
    case 'sovereign_deploy':
      return handleDeploy(args, extra)
    default:
      return structuredErr(
        new SdkError('ERR_INVALID_INPUT', `Unknown tool: ${name}`, { severity: 'fatal' }),
      )
  }
})

// ─── sovereign_check_env ────────────────────────────────────────────────────

async function handleCheckEnv(args: unknown): Promise<CallToolResult> {
  try {
    const parsed = CheckEnvOptionsSchema.parse(args)
    const result = await checkEnv(parsed)
    return structuredOk(result)
  } catch (err) {
    // zod parse errors surface as ZodError; map to F5 ERR_INVALID_INPUT.
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError') {
      return structuredErr(
        new SdkError('ERR_INVALID_INPUT', `Invalid sovereign_check_env input: ${(err as Error).message}`, {
          severity: 'fatal',
          data: { zod_issues: (err as { issues?: unknown }).issues },
        }),
      )
    }
    return structuredErr(err)
  }
}

// ─── sovereign_deploy ───────────────────────────────────────────────────────
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
// sovereign_check_env after to see if the daemon is still running.

async function handleDeploy(
  args: unknown,
  extra: { signal: AbortSignal; sendNotification: (n: unknown) => Promise<void>; _meta?: { progressToken?: string | number } },
): Promise<CallToolResult> {
  try {
    const parsed = DeployOptionsSchema.parse(args)

    // rc2 hardening: MCP server does NOT track keep-alive daemons. If the
    // client requests keep_alive=true via MCP, the kit would orphan a
    // daemon on server shutdown. Reject until daemon tracking lands
    // (post-rc2 follow-up).
    if (parsed.keep_alive) {
      throw new SdkError(
        'ERR_INVALID_INPUT',
        'keep_alive=true is not yet supported via MCP — the server has no per-call daemon-tracking surface. Use the CLI (which owns the daemon) or call sovereign_deploy with keep_alive=false.',
        { severity: 'fatal' },
      )
    }

    const progressToken: string | number | undefined = extra._meta?.progressToken
    const send = extra.sendNotification
    const signal = extra.signal

    let result: unknown
    let progressIndex = 0
    const totalPhases = 9 // env_check..done per F3
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
    if (err && typeof err === 'object' && (err as { name?: string }).name === 'ZodError') {
      return structuredErr(
        new SdkError('ERR_INVALID_INPUT', `Invalid sovereign_deploy input: ${(err as Error).message}`, {
          severity: 'fatal',
          data: { zod_issues: (err as { issues?: unknown }).issues },
        }),
      )
    }
    return structuredErr(err)
  }
}

// Assert at startup that ALL_TOOLS still has exactly the two GA tools we
// wire above; if [D5] adds a new tool to the SDK without wiring here,
// the smoke test should fail loud.
if (ALL_TOOLS.length !== 2) {
  process.stderr.write(
    `ton-sovereign-mcp: ALL_TOOLS has ${ALL_TOOLS.length} entries; expected 2 for v0.8.0-rc2. ` +
      `Wire any new tools in src/mcp.ts before shipping.\n`,
  )
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect stdio + run
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  process.stderr.write(
    `ton-sovereign-mcp: fatal startup error: ${err instanceof Error ? err.message : String(err)}\n`,
  )
  process.exit(1)
})
