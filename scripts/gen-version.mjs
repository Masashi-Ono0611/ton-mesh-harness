#!/usr/bin/env node
// scripts/gen-version.mjs — generate src/version.ts from package.json#version.
//
// package.json is the SINGLE SOURCE OF TRUTH for the kit version. This script
// mirrors that version into src/version.ts (the generated module the CLI / MCP
// / SDK import) so the two can never drift. The `build` script regenerates it
// before bundling, so the published artifact always carries package.json's
// version; CI runs this with `--check` to fail any commit whose src/version.ts
// is out of sync (e.g. a release that bumped package.json but forgot to
// regenerate).
//
// Modes:
//   node scripts/gen-version.mjs           write src/version.ts (no-op if current)
//   node scripts/gen-version.mjs --check   exit 1 if src/version.ts is stale
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = join(root, 'package.json')
const versionPath = join(root, 'src/version.ts')

const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'))
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`gen-version: package.json#version is not valid semver: ${JSON.stringify(version)}`)
  process.exit(1)
}

const content = `/**
 * AUTO-GENERATED — DO NOT EDIT.
 *
 * Mirrors \`package.json#version\`, written by \`scripts/gen-version.mjs\`.
 * package.json is the single source of truth; this generated module lets the
 * CLI / MCP / SDK import the version without reading package.json at runtime
 * (the published bundle has no package.json on its import path). To change the
 * version, bump \`package.json#version\` and run \`bun run gen:version\` — the
 * \`build\` script regenerates it too, and CI fails if this file drifts.
 *
 * NO \`console.*\` IN THIS FILE — lint-enforced.
 */
export const MESH_HARNESS_VERSION = '${version}'
`

const check = process.argv.includes('--check')
let current = null
try {
  current = readFileSync(versionPath, 'utf8')
} catch {
  current = null
}

if (check) {
  if (current !== content) {
    console.error(
      `gen-version: src/version.ts is out of sync with package.json#version (${version}).\n` +
        `Run \`bun run gen:version\` and commit src/version.ts.`,
    )
    process.exit(1)
  }
  console.log(`gen-version: src/version.ts in sync (${version})`)
} else if (current === content) {
  console.log(`gen-version: src/version.ts already current (${version})`)
} else {
  writeFileSync(versionPath, content)
  console.log(`gen-version: wrote src/version.ts (${version})`)
}
