import { describe, expect, it } from 'vitest'
import {
  ALL_TOOLS,
  SOVEREIGN_CHECK_ENV_TOOL,
  SOVEREIGN_DEPLOY_TOOL,
  SUPPLEMENTARY_SCHEMAS,
  SCHEMA_VERSION,
} from '../src/sdk/json-schemas'

/**
 * Snapshot tests — any zod change that shifts the public MCP `tools/list`
 * shape fails here. Update intentionally with
 * `npx vitest run test/sdk-json-schemas.test.ts -u`.
 */
describe('SDK JSON Schemas (V1 snapshot)', () => {
  it('ships exactly the two GA tools with the kit minor as SCHEMA_VERSION', () => {
    expect(SCHEMA_VERSION).toBe('0.8.0')
    expect(ALL_TOOLS.map((t) => t.name).sort()).toEqual([
      'sovereign_check_env',
      'sovereign_deploy',
    ])
  })

  it('sovereign_deploy schemas (input + output)', () => {
    expect(SOVEREIGN_DEPLOY_TOOL.input).toMatchSnapshot()
    expect(SOVEREIGN_DEPLOY_TOOL.output).toMatchSnapshot()
  })

  it('sovereign_check_env schemas (input + output)', () => {
    expect(SOVEREIGN_CHECK_ENV_TOOL.input).toMatchSnapshot()
    expect(SOVEREIGN_CHECK_ENV_TOOL.output).toMatchSnapshot()
  })

  it('supplementary schemas (WalletSpec, DeployEvent, ErrorPayload)', () => {
    expect(SUPPLEMENTARY_SCHEMAS.WalletSpec).toMatchSnapshot()
    expect(SUPPLEMENTARY_SCHEMAS.DeployEvent).toMatchSnapshot()
    expect(SUPPLEMENTARY_SCHEMAS.ErrorPayload).toMatchSnapshot()
  })
})
