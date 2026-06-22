// scripts/build.ts — bundle the CLI + MCP + SDK with Bun, replacing tsup.
//
// Mirrors the previous tsup config 1:1:
//   - entries: src/cli.ts, src/mcp.ts, src/sdk.ts
//   - format: CJS, target: node (engines node>=18); the published bins run
//     on plain Node, never Bun — consumers use `npx` / `node`.
//   - externalize every declared runtime dependency EXCEPT @ton/walletkit,
//     which is INLINED. @ton/walletkit ships dist/cjs/utils/mnemonic.mjs with
//     a bare directory import ('../errors') that Node 22+ rejects under the
//     strict ESM resolver (ERR_UNSUPPORTED_DIR_IMPORT, shipped broken in
//     rc2-rc4). Bundling resolves the import at build time so the CLI / MCP
//     load on Node 22 / 24. tsup did this via noExternal: ['@ton/walletkit'].
//
// The externals list is DERIVED from package.json (dependencies +
// peerDependencies, minus the inline set) so it never drifts when a dep is
// added. Type declarations are emitted separately by `tsc -p
// tsconfig.build.json` (the build:types script) — Bun does not emit .d.ts.

import { readFileSync, rmSync, watch } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

// @ton/walletkit MUST be inlined (see header); everything else stays external.
const INLINE = new Set(['@ton/walletkit'])
const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
].filter((name) => !INLINE.has(name))

const isWatch = process.argv.includes('--watch')

async function build(): Promise<boolean> {
  rmSync(dist, { recursive: true, force: true })
  const result = await Bun.build({
    entrypoints: [join(root, 'src/cli.ts'), join(root, 'src/mcp.ts'), join(root, 'src/sdk.ts')],
    outdir: dist,
    target: 'node',
    format: 'cjs',
    external,
  })
  if (!result.success) {
    for (const message of result.logs) console.error(message)
    if (!isWatch) process.exit(1)
    return false
  }
  console.log(`✓ bun build → dist/ (${result.outputs.length} files, ${external.length} externals)`)
  return true
}

await build()

if (isWatch) {
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(join(root, 'src'), { recursive: true }, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      build().catch((err) => console.error(err))
    }, 100)
  })
  console.log('watching src/ for changes …')
}
