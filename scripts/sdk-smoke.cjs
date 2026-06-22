#!/usr/bin/env node
/**
 * Portable SDK smoke test — require()s `dist/sdk.js` directly and
 * asserts the public surface is intact:
 *
 *   - Both function entry points (checkEnv, deploy, status) are present
 *     and typed as functions.
 *   - SdkError class is importable.
 *   - Every zod schema we advertise (CheckEnvOptions, DeployOptions,
 *     StatusOptions, DeployEvent, ErrorPayload, WalletSpec, and their
 *     Result variants) is present and is a zod schema (`.parse` is a
 *     function).
 *   - DeployOptionsSchema.parse({...minimal}) round-trips with the
 *     expected defaults (validates the wallet discriminator + defaults
 *     work via the published bundle).
 *   - MESH_HARNESS_VERSION matches package.json::version.
 *
 * The CI matrix runs this alongside cli-smoke.cjs + mcp-smoke.cjs so
 * an accidental drop from src/sdk.ts surfaces immediately.
 *
 * Exits 0 on success, 1 on first failure with a clear message.
 */

const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const SDK_PATH = path.join(REPO_ROOT, 'dist', 'sdk.js')
const PKG = require(path.join(REPO_ROOT, 'package.json'))

function assert(cond, msg) {
  if (!cond) {
    process.stderr.write(`SDK smoke FAILED: ${msg}\n`)
    process.exit(1)
  }
}

const sdk = require(SDK_PATH)

// 1. Function entry points
for (const name of ['checkEnv', 'deploy', 'status', 'siteRecord']) {
  assert(typeof sdk[name] === 'function', `expected sdk.${name} to be a function`)
}

// 2. SdkError
assert(typeof sdk.SdkError === 'function', 'SdkError must be exported as a class')
try {
  const err = new sdk.SdkError('ERR_INTERNAL', 'smoke', { severity: 'fatal' })
  assert(err.code === 'ERR_INTERNAL', 'SdkError.code roundtrip broken')
} catch (e) {
  assert(false, `SdkError instantiation failed: ${e.message}`)
}

// 3. Schemas — every exported *Schema should have .parse and .safeParse
const schemaNames = [
  'CheckEnvOptionsSchema',
  'CheckEnvResultSchema',
  'DeployOptionsSchema',
  'DeployResultSchema',
  'DeployEventSchema',
  'ErrorPayloadSchema',
  'ErrCodeSchema',
  'StatusOptionsSchema',
  'StatusResultSchema',
  'SiteRecordOptionsSchema',
  'SiteRecordResultSchema',
  'WalletSpecSchema',
]
for (const name of schemaNames) {
  const s = sdk[name]
  assert(s !== undefined, `missing schema export: ${name}`)
  assert(typeof s.parse === 'function', `${name}.parse missing — not a zod schema?`)
  assert(typeof s.safeParse === 'function', `${name}.safeParse missing`)
}

// 4. Round-trip DeployOptionsSchema with minimal input
const parsed = sdk.DeployOptionsSchema.parse({
  source_dir: './fake',
  wallet: { kind: 'tonconnect', connector: 'Tonkeeper' },
})
assert(parsed.wallet.kind === 'tonconnect', 'parsed wallet.kind wrong')
assert(parsed.keep_alive === false, 'keep_alive default should be false')
assert(parsed.testnet === false, 'testnet default should be false')

// 5. Tool descriptors
assert(Array.isArray(sdk.ALL_TOOLS), 'ALL_TOOLS must be an array')
assert(sdk.ALL_TOOLS.length === 4, `ALL_TOOLS length expected 4, got ${sdk.ALL_TOOLS.length}`)
const toolNames = sdk.ALL_TOOLS.map((t) => t.name).sort()
const expected = [
  'mesh_check_env',
  'mesh_deploy',
  'mesh_site_record',
  'mesh_status',
]
assert(
  JSON.stringify(toolNames) === JSON.stringify(expected),
  `tool names mismatch: ${toolNames.join(',')}`,
)

// 6. Version pin matches package.json
assert(
  sdk.MESH_HARNESS_VERSION === PKG.version,
  `version drift: sdk=${sdk.MESH_HARNESS_VERSION}, package.json=${PKG.version}`,
)

// 7. Logger
assert(typeof sdk.createSdkLogger === 'function', 'createSdkLogger must be exported')
const logger = sdk.createSdkLogger('mesh:smoke')
assert(typeof logger.debug === 'function', 'logger.debug missing')
assert(typeof logger.info === 'function', 'logger.info missing')
assert(typeof logger.warn === 'function', 'logger.warn missing')

// 8. parseWalletInput helper
assert(typeof sdk.parseWalletInput === 'function', 'parseWalletInput must be exported')
const w = sdk.parseWalletInput('Tonkeeper')
assert(w.kind === 'tonconnect', 'parseWalletInput should lift string → tonconnect')

process.stdout.write(
  `SDK smoke OK — version=${sdk.MESH_HARNESS_VERSION}; ` +
    `tools=${toolNames.join(', ')}; ` +
    `schemas=${schemaNames.length}; ` +
    `exports=${Object.keys(sdk).length}\n`,
)
