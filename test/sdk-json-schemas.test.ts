import { describe, expect, it } from 'vitest'
import {
  ALL_TOOLS,
  MESH_CHECK_ENV_TOOL,
  MESH_DEPLOY_TOOL,
  MESH_SITE_RECORD_TOOL,
  MESH_STATUS_TOOL,
  SUPPLEMENTARY_SCHEMAS,
  SCHEMA_VERSION,
} from '../src/sdk/json-schemas'
import { MESH_HARNESS_VERSION } from '../src/version'

/**
 * Snapshot tests — any zod change that shifts the public MCP `tools/list`
 * shape fails here. Update intentionally with
 * `bunx vitest run test/sdk-json-schemas.test.ts -u`.
 */
describe('SDK JSON Schemas (V1 snapshot)', () => {
  // #102/#18: SCHEMA_VERSION used to be a hardcoded duplicate of the version
  // string; now it's derived from MESH_HARNESS_VERSION (src/version.ts, which
  // is generated from package.json) so a release bump propagates here for free.
  it('SCHEMA_VERSION matches MESH_HARNESS_VERSION (single source of truth)', () => {
    expect(SCHEMA_VERSION).toBe(MESH_HARNESS_VERSION)
  })

  it('ships exactly the GA tools with the kit minor as SCHEMA_VERSION', () => {
    // SCHEMA_VERSION is derived from MESH_HARNESS_VERSION (src/version.ts,
    // generated from package.json). The exact-match assertion lives in the
    // "matches MESH_HARNESS_VERSION" test above; here we just confirm it's a
    // semver-shaped string so any future release keeps a valid schema version
    // without double-hardcoding.
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+/)
    expect(ALL_TOOLS.map((t) => t.name).sort()).toEqual([
      'mesh_check_env',
      'mesh_deploy',
      'mesh_site_record',
      'mesh_status',
    ])
  })

  it('mesh_deploy schemas (input + output)', () => {
    expect(MESH_DEPLOY_TOOL.input).toMatchSnapshot()
    expect(MESH_DEPLOY_TOOL.output).toMatchSnapshot()
  })

  it('mesh_check_env schemas (input + output)', () => {
    expect(MESH_CHECK_ENV_TOOL.input).toMatchSnapshot()
    expect(MESH_CHECK_ENV_TOOL.output).toMatchSnapshot()
  })

  it('mesh_status schemas (input + output)', () => {
    expect(MESH_STATUS_TOOL.input).toMatchSnapshot()
    expect(MESH_STATUS_TOOL.output).toMatchSnapshot()
  })

  it('mesh_site_record schemas (input + output)', () => {
    expect(MESH_SITE_RECORD_TOOL.input).toMatchSnapshot()
    expect(MESH_SITE_RECORD_TOOL.output).toMatchSnapshot()
  })

  it('supplementary schemas (WalletSpec, DeployEvent, ErrorPayload)', () => {
    expect(SUPPLEMENTARY_SCHEMAS.WalletSpec).toMatchSnapshot()
    expect(SUPPLEMENTARY_SCHEMAS.DeployEvent).toMatchSnapshot()
    expect(SUPPLEMENTARY_SCHEMAS.ErrorPayload).toMatchSnapshot()
  })
})
