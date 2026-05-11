/**
 * Public SDK entry — what `import { ... } from 'ton-sovereign-deploy/sdk'`
 * exposes to npm consumers.
 *
 * Stability contract:
 *
 *  - Exports added here are subject to semver. Removing or renaming
 *    requires a major bump.
 *  - The CLI (`dist/cli.js`) and MCP server (`dist/mcp.js`) consume
 *    these same symbols internally — the surfaces stay aligned by
 *    construction.
 *  - We intentionally re-export from focused submodules rather than
 *    `export * from './sdk/index'` to keep the public surface
 *    enumerable in one file.
 *
 * Usage:
 *
 *    import {
 *      checkEnv,
 *      deploy,
 *      status,
 *      type DeployOptions,
 *    } from 'ton-sovereign-deploy/sdk'
 *
 *    const result = await checkEnv()
 *    if (!result.ready) {
 *      // surface result.blocking[].fix_hint to the user
 *      return
 *    }
 *
 *    for await (const ev of deploy({
 *      source_dir: './dist',
 *      domain: 'myprotocol.ton',
 *      wallet: { kind: 'tonconnect', connector: 'Tonkeeper' },
 *    })) {
 *      // handle event by ev.phase ...
 *    }
 */

// ─── Core SDK functions ──────────────────────────────────────────────────────
export { checkEnv } from './sdk/check'
export { deploy, SdkError } from './sdk/deploy'
export { status } from './sdk/status'

// ─── Public types ────────────────────────────────────────────────────────────
export {
  CheckEnvOptionsSchema,
  CheckEnvResultSchema,
  DeployOptionsSchema,
  DeployResultSchema,
  DeployEventSchema,
  ErrorPayloadSchema,
  ErrCodeSchema,
  StatusOptionsSchema,
  StatusResultSchema,
  WalletSpecSchema,
  parseWalletInput,
  type CheckEnvOptions,
  type CheckEnvResult,
  type DeployOptions,
  type DeployResult,
  type DeployEvent,
  type DeployPhase,
  type ErrCode,
  type ErrorPayload,
  type StatusOptions,
  type StatusResult,
  type WalletSpec,
} from './sdk/schemas'

// ─── Tool descriptors for MCP / discovery ────────────────────────────────────
export {
  ALL_TOOLS,
  SOVEREIGN_CHECK_ENV_TOOL,
  SOVEREIGN_DEPLOY_TOOL,
  SOVEREIGN_STATUS_TOOL,
  SUPPLEMENTARY_SCHEMAS,
  SCHEMA_VERSION,
  type ToolJsonSchema,
  type JsonSchema,
} from './sdk/json-schemas'

// ─── Logger (opt-in observability) ───────────────────────────────────────────
export { createSdkLogger, type SdkLogger } from './sdk/log'

// ─── Version ─────────────────────────────────────────────────────────────────
export { SOVEREIGN_DEPLOY_VERSION } from './version'
