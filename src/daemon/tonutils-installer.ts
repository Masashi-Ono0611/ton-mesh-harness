// tonutils-storage daemon installer (xssnick / Go).
// Sibling of installer.ts (TON Core daemon installer); we keep both around
// so users can opt in to either backend via --daemon-backend.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'
import path from 'path'
import os from 'os'

const TONUTILS_VERSION = 'v1.4.1'
const BIN_DIR = path.join(os.homedir(), '.ton-sovereign', 'bin')
const VERSION_FILE = path.join(BIN_DIR, '.tonutils-version')

// xssnick/tonutils-storage release asset naming. Note: the project's asset
// names don't follow Node's `process.platform-process.arch` convention
// directly — Mac uses `mac-amd64`/`mac-arm64`, Linux uses `linux-amd64`/
// `linux-arm64`, Windows uses `x64.exe`. ARM64 Windows is not published.
const ASSET_MAP: Record<string, string> = {
  'darwin-arm64': 'tonutils-storage-mac-arm64',
  'darwin-x64':   'tonutils-storage-mac-amd64',
  'linux-arm64':  'tonutils-storage-linux-arm64',
  'linux-x64':    'tonutils-storage-linux-amd64',
  'win32-x64':    'tonutils-storage-x64.exe',
}

export interface TonutilsPaths {
  binDir: string
  daemon: string
  versionFile: string
}

export function getTonutilsPaths(): TonutilsPaths {
  const isWindows = process.platform === 'win32'
  return {
    binDir: BIN_DIR,
    daemon: path.join(BIN_DIR, isWindows ? 'tonutils-storage.exe' : 'tonutils-storage'),
    versionFile: VERSION_FILE,
  }
}

export interface EnsureTonutilsBinaryOptions {
  // Suppress all human-readable progress messages (download banner). Use
  // when the caller's stdout must remain valid JSON (`--json-output`).
  silent?: boolean
}

/**
 * Ensure the tonutils-storage binary is installed and at the expected
 * version. Idempotent — does nothing if the binary is already present
 * with a matching .tonutils-version file.
 */
export function ensureTonutilsBinary(opts: EnsureTonutilsBinaryOptions = {}): void {
  mkdirSync(BIN_DIR, { recursive: true })

  const paths = getTonutilsPaths()
  const currentVersion = existsSync(paths.versionFile)
    ? readFileSync(paths.versionFile, 'utf8').trim()
    : ''

  if (currentVersion === TONUTILS_VERSION && existsSync(paths.daemon)) {
    return
  }

  const key = `${process.platform}-${process.arch}`
  const asset = ASSET_MAP[key]
  if (!asset) {
    throw new Error(
      `tonutils-storage has no published asset for ${key}. ` +
      `Supported: ${Object.keys(ASSET_MAP).join(', ')}. ` +
      `Workaround: pass --daemon-backend=ton-core to use the TON Core daemon instead.`,
    )
  }

  const url = `https://github.com/xssnick/tonutils-storage/releases/download/${TONUTILS_VERSION}/${asset}`

  if (!opts.silent) {
    // Send to stderr so JSON-output stdout stays parseable even if a future
    // caller wires the wrong silent flag. Codex P2 flagged the previous
    // stdout write as a JSON-mode polluter.
    process.stderr.write(`  Downloading tonutils-storage (${TONUTILS_VERSION})…\n`)
  }
  downloadFile(url, paths.daemon)
  if (process.platform !== 'win32') {
    spawnSync('chmod', ['+x', paths.daemon])
  }
  removeQuarantine(paths.daemon)

  writeFileSync(paths.versionFile, TONUTILS_VERSION)
}

function downloadFile(url: string, dest: string): void {
  const tmp = dest + '.tmp'
  const result = spawnSync('curl', ['-fsSL', '-o', tmp, url], { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Failed to download ${url} (curl exit ${result.status})`)
  }
  // renameSync is portable across darwin/linux/win32; the previous
  // spawnSync('mv', …) silently failed on stock Windows where `mv` is
  // not on PATH (Codex P2).
  renameSync(tmp, dest)
}

function removeQuarantine(filePath: string): void {
  if (process.platform === 'darwin') {
    spawnSync('xattr', ['-c', filePath])
  } else if (process.platform === 'win32') {
    spawnSync('powershell.exe', [
      '-NoProfile', '-NonInteractive',
      '-Command',
      `Unblock-File -LiteralPath "${filePath}"`,
    ])
  }
}
