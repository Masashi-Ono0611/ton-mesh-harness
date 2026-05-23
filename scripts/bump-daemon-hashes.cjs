#!/usr/bin/env node
/**
 * scripts/bump-daemon-hashes.cjs  (#32)
 *
 * Recompute and patch the pinned `expectedSha256` hashes for a SPEC-shaped
 * daemon installer after its version constant is bumped. Replaces the
 * error-prone manual "curl + shasum × 5 platforms, paste hex" ritual.
 *
 * Usage:
 *   node scripts/bump-daemon-hashes.cjs <installer-file> [--check]
 *
 *   <installer-file>  src/daemon/tonutils-installer.ts
 *                     src/daemon/rldp-http-proxy-installer.ts
 *   --check           dry-run: print the diff, write nothing. Exit 0 if all
 *                     hashes already match, 2 if a bump is needed.
 *
 * Scope: SPEC-shaped installers only (a single `assetMap`, an arrow
 * `downloadUrl: (version, asset) => `…``, and per-platform 64-hex literals).
 * The legacy ton-core `installer.ts` has a different dual-map shape and is
 * out of scope — bump it manually.
 *
 * Written as a portable `.cjs` (matching scripts/mcp-smoke.cjs) — parsing
 * the TS source and patching hex in-place is far more robust in Node than
 * in bash. Uses `curl` for downloads (follows GitHub's asset redirects).
 *
 * Exit codes: 0 ok / up-to-date · 1 error (bad args, 404, invalid hex) ·
 * 2 (--check only) a bump is needed.
 */

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFile } = require('node:child_process')

const HEX64 = /^[0-9a-f]{64}$/

function fail(msg) {
  process.stderr.write(`bump-daemon-hashes: ${msg}\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const target = args.find((a) => !a.startsWith('--'))
if (!target) {
  fail('usage: node scripts/bump-daemon-hashes.cjs <installer-file> [--check]')
}
const filePath = path.resolve(target)
if (!fs.existsSync(filePath)) fail(`no such file: ${filePath}`)
const src = fs.readFileSync(filePath, 'utf8')

// ── Parse: version constant ──────────────────────────────────────────────
// Match the first `const <NAME_WITH_VERSION> = 'v…'` (TONUTILS_VERSION /
// DEFAULT_VERSION). rldp's exported const derives from DEFAULT_VERSION.
const versionMatch = src.match(/const\s+[A-Z_]*VERSION[A-Z_]*\s*=\s*'([^']+)'/)
if (!versionMatch) fail('could not find a `const …VERSION… = \'v…\'` declaration')
const version = versionMatch[1]

// ── Parse: assetMap (key → asset filename) ───────────────────────────────
function parseObjectBlock(label) {
  const start = src.indexOf(`${label}:`)
  if (start === -1) return null
  const open = src.indexOf('{', start)
  if (open === -1) return null
  let depth = 0
  let end = -1
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return null
  const body = src.slice(open + 1, end)
  const out = {}
  for (const m of body.matchAll(/'([^']+)'\s*:\s*'([^']*)'/g)) {
    out[m[1]] = m[2]
  }
  return out
}

const assetMap = parseObjectBlock('assetMap')
if (!assetMap || Object.keys(assetMap).length === 0) {
  fail('could not parse assetMap')
}

// ── Parse: downloadUrl template ──────────────────────────────────────────
const urlMatch = src.match(/downloadUrl:\s*\([^)]*\)\s*=>\s*\n?\s*`([^`]+)`/)
if (!urlMatch) fail('could not parse `downloadUrl: (version, asset) => `…``')
const urlTemplate = urlMatch[1]
const buildUrl = (asset) =>
  urlTemplate.replace(/\$\{version\}/g, version).replace(/\$\{asset\}/g, asset)

// ── Parse: existing pinned hashes (literal `'<key>': '<64hex>'`) ──────────
const existing = {}
for (const m of src.matchAll(/'([a-z0-9-]+)'\s*:\s*'([0-9a-f]{64})'/g)) {
  existing[m[1]] = m[2]
}

// ── Download + hash each platform asset (concurrently) ───────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    execFile('curl', ['-fsSL', '-o', dest, url], (err, _stdout, stderr) => {
      if (err) reject(new Error(`curl failed (${url}): ${stderr || err.message}`))
      else resolve()
    })
  })
}

function sha256File(p) {
  const h = crypto.createHash('sha256')
  h.update(fs.readFileSync(p))
  return h.digest('hex')
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daemon-hashes-'))
  const platforms = Object.keys(assetMap)

  process.stderr.write(`bump-daemon-hashes: ${path.basename(filePath)} @ ${version}\n`)

  const results = await Promise.allSettled(
    platforms.map(async (key) => {
      const asset = assetMap[key]
      const url = buildUrl(asset)
      const dest = path.join(tmpDir, asset)
      await download(url, dest)
      const hash = sha256File(dest)
      if (!HEX64.test(hash)) throw new Error(`computed hash is not 64 lowercase hex: ${hash}`)
      return { key, hash }
    }),
  )

  const computed = {}
  const failures = []
  results.forEach((r, i) => {
    const key = platforms[i]
    if (r.status === 'fulfilled') computed[key] = r.value.hash
    else failures.push(`${key} (${assetMap[key]}): ${r.reason.message}`)
  })

  fs.rmSync(tmpDir, { recursive: true, force: true })

  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} asset(s) failed:\n  ${failures.join('\n  ')}\n`)
    fail('aborting — no partial patch written')
  }

  // ── Diff ────────────────────────────────────────────────────────────────
  let changed = 0
  for (const key of platforms) {
    const was = existing[key]
    const now = computed[key]
    if (was === now) {
      process.stdout.write(`  = ${key}  ${now}\n`)
    } else {
      changed++
      process.stdout.write(`  ~ ${key}\n      old: ${was ?? '(none)'}\n      new: ${now}\n`)
    }
  }

  if (changed === 0) {
    process.stdout.write('\nAll hashes already match — nothing to do.\n')
    process.exit(0)
  }

  if (CHECK) {
    process.stdout.write(`\n--check: ${changed} hash(es) would change. Re-run without --check to patch.\n`)
    process.exit(2)
  }

  // ── Patch: replace each platform's 64-hex literal in place ───────────────
  let patched = src
  for (const key of platforms) {
    const re = new RegExp(`('${key}'\\s*:\\s*')[0-9a-f]{64}(')`, 'g')
    patched = patched.replace(re, `$1${computed[key]}$2`)
  }
  fs.writeFileSync(filePath, patched)
  process.stdout.write(`\nPatched ${changed} hash(es) in ${path.basename(filePath)}.\n`)
  process.exit(0)
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
