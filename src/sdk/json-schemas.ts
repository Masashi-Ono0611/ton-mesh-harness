/**
 * JSON Schema export of the public zod schemas — what the MCP `tools/list`
 * response will surface to agent clients.
 *
 * The schemas are generated at module-load time and frozen so a snapshot
 * test ([V1] #11 / `test/sdk-json-schemas.test.ts`) can lock the contract
 * shape: any accidental drift in zod definitions fails the snapshot.
 *
 * Run `npx vitest run test/sdk-json-schemas.test.ts -u` to update the
 * snapshot when an intentional schema change ships.
 */

import { zodToJsonSchema } from 'zod-to-json-schema'
import {
  CheckEnvOptionsSchema,
  CheckEnvResultSchema,
  DeployOptionsSchema,
  DeployResultSchema,
  DeployEventSchema,
  ErrorPayloadSchema,
  WalletSpecSchema,
} from './schemas'

/**
 * Opaque JSON Schema type. We deliberately don't inline the full structural
 * type from `zod-to-json-schema` — its inferred shape against our deeply
 * nested discriminated unions (DeployEventSchema has 9 phase variants)
 * caused tsc to OOM at type-check time.
 */
export type JsonSchema = Record<string, unknown>

export interface ToolJsonSchema {
  /** Stable tool name as it appears in MCP `tools/list`. */
  name: string
  /** Generated JSON Schema for the tool's input. */
  input: JsonSchema
  /** Generated JSON Schema for the tool's output (success path). */
  output: JsonSchema
}

const SCHEMA_VERSION = '0.8.0'

// `zodToJsonSchema` is typed as accepting a `ZodType<any, ZodTypeDef, any>`,
// which our complex schemas (z.discriminatedUnion of strict objects with
// refines) don't structurally match — tsc chokes (OOM) trying to infer.
// We cast `schema as never` so type inference doesn't walk the union.
//
// This is safe at runtime: zod-to-json-schema@^3.25.2's implementation
// reads `schema._def.typeName` and switches on it, so the declared
// parameter type is too strict for the cases we hand it.
const toJson = (schema: unknown, name: string): JsonSchema =>
  zodToJsonSchema(schema as never, { name, target: 'jsonSchema7' }) as unknown as JsonSchema

export const SOVEREIGN_DEPLOY_TOOL: ToolJsonSchema = {
  name: 'sovereign_deploy',
  input: toJson(DeployOptionsSchema, 'DeployOptions'),
  output: toJson(DeployResultSchema, 'DeployResult'),
}

export const SOVEREIGN_CHECK_ENV_TOOL: ToolJsonSchema = {
  name: 'sovereign_check_env',
  input: toJson(CheckEnvOptionsSchema, 'CheckEnvOptions'),
  output: toJson(CheckEnvResultSchema, 'CheckEnvResult'),
}

export const ALL_TOOLS: readonly ToolJsonSchema[] = [SOVEREIGN_DEPLOY_TOOL, SOVEREIGN_CHECK_ENV_TOOL]

export const SUPPLEMENTARY_SCHEMAS = {
  WalletSpec: toJson(WalletSpecSchema, 'WalletSpec'),
  DeployEvent: toJson(DeployEventSchema, 'DeployEvent'),
  ErrorPayload: toJson(ErrorPayloadSchema, 'ErrorPayload'),
}

export { SCHEMA_VERSION }
