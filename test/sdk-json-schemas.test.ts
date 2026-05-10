import { describe, expect, it } from 'vitest'
import {
  ALL_TOOLS,
  SOVEREIGN_CHECK_ENV_TOOL,
  SOVEREIGN_DEPLOY_TOOL,
  SUPPLEMENTARY_SCHEMAS,
  SCHEMA_VERSION,
} from '../src/sdk/json-schemas'

/**
 * Snapshot tests for the JSON Schemas the MCP server will surface in
 * `tools/list`. Any accidental zod change that affects the public contract
 * shows up here as a failed snapshot. Update intentionally with
 * `npx vitest run test/sdk-json-schemas.test.ts -u`.
 */
describe('SDK JSON Schemas (V1 snapshot)', () => {
  it('SCHEMA_VERSION is the kit minor version', () => {
    expect(SCHEMA_VERSION).toBe('0.8.0')
  })

  it('exposes exactly the two GA tools (sovereign_deploy + sovereign_check_env)', () => {
    expect(ALL_TOOLS).toHaveLength(2)
    expect(ALL_TOOLS.map((t) => t.name).sort()).toEqual([
      'sovereign_check_env',
      'sovereign_deploy',
    ])
  })

  it('sovereign_deploy input snapshot', () => {
    expect(SOVEREIGN_DEPLOY_TOOL.input).toMatchSnapshot()
  })

  it('sovereign_deploy output snapshot', () => {
    expect(SOVEREIGN_DEPLOY_TOOL.output).toMatchSnapshot()
  })

  it('sovereign_check_env input snapshot', () => {
    expect(SOVEREIGN_CHECK_ENV_TOOL.input).toMatchSnapshot()
  })

  it('sovereign_check_env output snapshot', () => {
    expect(SOVEREIGN_CHECK_ENV_TOOL.output).toMatchSnapshot()
  })

  it('supplementary schema: WalletSpec', () => {
    expect(SUPPLEMENTARY_SCHEMAS.WalletSpec).toMatchSnapshot()
  })

  it('supplementary schema: DeployEvent', () => {
    expect(SUPPLEMENTARY_SCHEMAS.DeployEvent).toMatchSnapshot()
  })

  it('supplementary schema: ErrorPayload', () => {
    expect(SUPPLEMENTARY_SCHEMAS.ErrorPayload).toMatchSnapshot()
  })
})
