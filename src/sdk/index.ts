/**
 * Internal SDK re-export bundle.
 *
 * NOT a published external entry — `package.json` ships only `dist/cli.js`
 * + `dist/mcp.js` (when GA lands) as bin endpoints. The SDK is consumed
 * INTERNALLY by both binaries (CLI renders, MCP server forwards to MCP
 * progress notifications). External SDK consumption (`import { deploy }
 * from 'ton-sovereign-deploy/sdk'`) is a v0.8.x consideration once the
 * contract has stabilised.
 *
 * Modules:
 * - `schemas`: zod source of truth for all I/O contracts ([F2] #13).
 * - `check`: programmatic environment probe ([S1] #6).
 * - `json-schemas`: JSON Schema artefacts for MCP `tools/list` ([V1] #11).
 * - `deploy`: runtime deploy SDK — bag-creation core ([S2] #7).
 *   DNS write + watch + site-auto integration follow in [S2.5] / [S2.6].
 */

export * from './schemas'
export * from './check'
export * from './json-schemas'
export * from './deploy'
