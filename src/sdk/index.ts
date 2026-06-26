/**
 * Internal SDK re-export bundle.
 *
 * NOT a published external entry — `package.json` ships only `dist/cli.js`
 * + `dist/mcp.js` (when GA lands) as bin endpoints. The SDK is consumed
 * INTERNALLY by both binaries (CLI renders, MCP server forwards to MCP
 * progress notifications). External SDK consumption (`import { deploy }
 * from 'ton-mesh-harness/sdk'`) is a v0.8.x consideration once the
 * contract has stabilised.
 *
 * Module roles (post v0.8 refactoring):
 * - `schemas`: zod source of truth for all I/O contracts (F2).
 * - `check`: programmatic environment probe (S1).
 * - `json-schemas`: JSON Schema artefacts for MCP `tools/list` (V1).
 * - `deploy`: top-level deploy orchestrator (S2 + S2.5 + S2.6).
 * - `dns`: TonConnect / agentic DNS write generators (S2.5 / S2.6).
 * - `dns-helpers`: shared post-broadcast pipeline + event builders.
 * - `agentic-config`: strict zod loader for ~/.config/ton/config.json
 *   incl. AES-256-GCM protected-file decode (S2.6).
 * - `agentic-sign`: walletkit Signer + adapter → broadcast (S2.6).
 * - `resolve-tx`: Toncenter v3 tx-hash lookup + TEP-467 normalize (S2.7).
 * - `endpoints`: Toncenter / tonviewer URL constants + helpers (S2.7).
 * - `walletkit-network`: isolated walletkit factory module (Node 22+
 *   dir-import workaround boundary).
 * - `abort`: AbortSignal → ERR_CANCELLED + safeAbort() (S2.7 cleanup).
 * - `version`: the kit's version string, generated from package.json.
 */

export * from './schemas'
export * from './check'
export * from './json-schemas'
export * from './deploy'
