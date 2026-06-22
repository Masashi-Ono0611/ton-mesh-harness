#!/usr/bin/env node
/**
 * End-to-end tarball install + run smoke. Packs the kit (no publish),
 * installs the tarball into a fresh sandbox package, and runs the
 * bin + a require() through the published surface.
 *
 * This catches a class of bugs that the dev-tree smokes can't see:
 *
 *  - Missing entries in `package.json::files` (e.g. the rc5
 *    `templates/` omission).
 *  - Bin scripts that work from a `dist/` checkout but fail from a
 *    `node_modules/<pkg>/dist/` install (e.g. wrong relative require
 *    paths, missing peer deps surfaced at install time).
 *  - LICENSE / README packaging.
 *  - SDK + MCP server + CLI all resolvable from a consumer's
 *    `node_modules/.bin/` and `require()`.
 *
 * The script is self-contained and idempotent — it creates and
 * destroys its own tmpdir on each run.
 *
 * Exits 0 on success, 1 on first failure with stderr context.
 */

const { execFileSync, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const PKG = require(path.join(REPO_ROOT, 'package.json'))

const log = (msg) => process.stdout.write(`  ${msg}\n`)
const fail = (msg) => {
  process.stderr.write(`tarball smoke FAILED: ${msg}\n`)
  process.exit(1)
}

let sandbox = ''
let tarballPath = ''

function cleanup() {
  if (sandbox && fs.existsSync(sandbox)) {
    fs.rmSync(sandbox, { recursive: true, force: true })
  }
  if (tarballPath && fs.existsSync(tarballPath)) {
    fs.unlinkSync(tarballPath)
  }
}
process.on('exit', cleanup)
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

// ─── 1. npm pack ──────────────────────────────────────────────────────────
log(`packing ${PKG.name}@${PKG.version}…`)
let tarballName
try {
  // Use --json so the output is machine-parseable even if npm changes
  // its banner format. The result is an array with one entry.
  const json = execFileSync('npm', ['pack', '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const parsed = JSON.parse(json)
  tarballName = parsed[0]?.filename
  if (!tarballName) fail('npm pack --json returned no filename')
  tarballPath = path.join(REPO_ROOT, tarballName)
  if (!fs.existsSync(tarballPath)) fail(`tarball not at ${tarballPath}`)
} catch (err) {
  fail(`npm pack failed: ${err.message}`)
}

// ─── 2. Install into a fresh sandbox ─────────────────────────────────────
sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'tonsd-smoke-'))
log(`installing into ${sandbox}…`)
fs.writeFileSync(
  path.join(sandbox, 'package.json'),
  JSON.stringify({ name: 'tonsd-smoke', version: '0.0.0', private: true }, null, 2),
)
const install = spawnSync('npm', ['install', tarballPath], {
  cwd: sandbox,
  encoding: 'utf8',
  stdio: 'pipe',
})
if (install.status !== 0) {
  fail(
    `npm install failed (status=${install.status})\n` +
      `stdout: ${install.stdout?.slice(0, 500)}\n` +
      `stderr: ${install.stderr?.slice(0, 500)}`,
  )
}

// ─── 3. Verify shipped files are present ─────────────────────────────────
const installedRoot = path.join(sandbox, 'node_modules', PKG.name)
const expectedFiles = [
  'LICENSE',
  'README.md',
  'package.json',
  'dist/cli.js',
  'dist/mcp.js',
  'dist/sdk.js',
  'dist/sdk.d.ts',
  'skills/mesh-deploy.md',
  'templates/github-workflow.yml',
  'templates/github-workflow-agentic.yml',
  'templates/.well-known/mcp.json',
]
for (const rel of expectedFiles) {
  const p = path.join(installedRoot, rel)
  if (!fs.existsSync(p)) fail(`expected file not in tarball: ${rel}`)
}
log(`${expectedFiles.length} expected files present`)

// ─── 4. Run the CLI binary ───────────────────────────────────────────────
log('running installed CLI bin (--version + --help)…')
const cliBin = path.join(sandbox, 'node_modules', '.bin', 'ton-mesh-harness')
if (!fs.existsSync(cliBin)) fail(`bin not at ${cliBin}`)
const ver = spawnSync(process.execPath, [cliBin, '--version'], { encoding: 'utf8' })
if (ver.status !== 0) {
  fail(`bin --version failed (status=${ver.status}): ${ver.stderr}`)
}
if (ver.stdout.trim() !== PKG.version) {
  fail(`bin --version mismatch: got "${ver.stdout.trim()}", expected "${PKG.version}"`)
}
const help = spawnSync(process.execPath, [cliBin, '--help'], { encoding: 'utf8' })
if (help.status !== 0) fail(`bin --help failed (status=${help.status})`)
for (const flag of ['--wallet-mode', '--domain', '--watch']) {
  if (!help.stdout.includes(flag)) fail(`bin --help missing ${flag}`)
}

// ─── 5. require() the SDK from the install ──────────────────────────────
log('require()-ing SDK from installed package…')
const sdkProbe = spawnSync(
  process.execPath,
  [
    '-e',
    `
      const sdk = require('${PKG.name}');
      const keys = Object.keys(sdk).sort().join(',');
      if (typeof sdk.deploy !== 'function') { console.error('deploy missing'); process.exit(1); }
      if (typeof sdk.checkEnv !== 'function') { console.error('checkEnv missing'); process.exit(1); }
      if (typeof sdk.status !== 'function') { console.error('status missing'); process.exit(1); }
      if (sdk.MESH_HARNESS_VERSION !== '${PKG.version}') {
        console.error('version drift: ' + sdk.MESH_HARNESS_VERSION);
        process.exit(1);
      }
      process.stdout.write(keys + '\\n');
    `,
  ],
  { cwd: sandbox, encoding: 'utf8' },
)
if (sdkProbe.status !== 0) {
  fail(`SDK require() failed: ${sdkProbe.stderr || sdkProbe.stdout}`)
}
const keyCount = sdkProbe.stdout.trim().split(',').length
log(`SDK exposes ${keyCount} symbols via require('${PKG.name}')`)

// ─── 6. require() the MCP server's serverInfo via a quick probe ──────────
//        (We don't run the full MCP server here — that lives in
//        mcp-smoke.cjs. We just confirm the bin is launchable.)
log('checking MCP bin is launchable…')
const mcpBin = path.join(sandbox, 'node_modules', '.bin', 'ton-mesh-harness-mcp')
if (!fs.existsSync(mcpBin)) fail(`mcp bin not at ${mcpBin}`)
// Spawn + kill quickly; success = no immediate crash on require chain.
const mcp = spawnSync(process.execPath, [mcpBin], {
  encoding: 'utf8',
  input: '',
  timeout: 2_000,
  killSignal: 'SIGTERM',
})
if (mcp.error && !['ETIMEDOUT', 'ENOENT'].includes(mcp.error.code)) {
  fail(`mcp bin crashed on load: ${mcp.error.code} ${mcp.stderr}`)
}
// stderr contains the noisy startup banner if any; we just need it
// to have started.

process.stdout.write(
  `tarball smoke OK — ${PKG.name}@${PKG.version}; bin + sdk + ${expectedFiles.length} files verified\n`,
)
