// rldp-http-proxy installer (ton-blockchain/ton C++ binary).
//
// Mirrors the structure of `tonutils-installer.ts`. v0.7 ships this as part
// of the auto-spawn site-host flow (`--site auto`); the binary publishes a
// .ton domain over HTTP-over-RLDP without the user having to follow
// `docs/v0.6/byo-rldp-http-proxy.md` manually.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { BIN_DIR, chmodExecutable, downloadFile, removeQuarantine } from './installer-utils'

// Pin to the v2026.04-1 tag whose asset names we surveyed during planning.
// Override via env var `RLDP_HTTP_PROXY_VERSION` if a future release shifts
// naming and we want to opt in without bumping our pin.
const DEFAULT_VERSION = 'v2026.04-1'
export const RLDP_HTTP_PROXY_VERSION =
  process.env.RLDP_HTTP_PROXY_VERSION?.trim() || DEFAULT_VERSION

const VERSION_FILE = path.join(BIN_DIR, '.rldp-http-proxy-version')

// ton-blockchain/ton release asset naming. Surveyed against tag v2026.04-1:
// the published assets cover linux-{arm64,x86_64}, mac-{arm64,x86-64},
// and a single .exe for Windows x86_64.
const ASSET_MAP: Record<string, string> = {
  'darwin-arm64': 'rldp-http-proxy-mac-arm64',
  'darwin-x64':   'rldp-http-proxy-mac-x86-64',
  'linux-arm64':  'rldp-http-proxy-linux-arm64',
  'linux-x64':    'rldp-http-proxy-linux-x86_64',
  'win32-x64':    'rldp-http-proxy.exe',
}

export interface RldpHttpProxyPaths {
  binDir: string
  daemon: string
  versionFile: string
}

export function getRldpHttpProxyPaths(): RldpHttpProxyPaths {
  const isWindows = process.platform === 'win32'
  return {
    binDir: BIN_DIR,
    daemon: path.join(BIN_DIR, isWindows ? 'rldp-http-proxy.exe' : 'rldp-http-proxy'),
    versionFile: VERSION_FILE,
  }
}

export interface EnsureRldpHttpProxyBinaryOptions {
  // Suppress human-readable download progress so `--json-output` callers
  // don't get banner text on stdout. Routed to stderr otherwise.
  silent?: boolean
}

/**
 * Idempotently install the rldp-http-proxy binary at the expected version.
 * No-ops when already installed.
 */
export function ensureRldpHttpProxyBinary(opts: EnsureRldpHttpProxyBinaryOptions = {}): void {
  mkdirSync(BIN_DIR, { recursive: true })

  const paths = getRldpHttpProxyPaths()
  const currentVersion = existsSync(paths.versionFile)
    ? readFileSync(paths.versionFile, 'utf8').trim()
    : ''

  if (currentVersion === RLDP_HTTP_PROXY_VERSION && existsSync(paths.daemon)) {
    return
  }

  const key = `${process.platform}-${process.arch}`
  const asset = ASSET_MAP[key]
  if (!asset) {
    throw new Error(
      `rldp-http-proxy has no published asset for ${key} (TON Core releases). ` +
      `Supported: ${Object.keys(ASSET_MAP).join(', ')}. ` +
      `Workaround: run rldp-http-proxy yourself and use --site-adnl <hex> instead ` +
      `of --site auto. See docs/v0.6/byo-rldp-http-proxy.md.`,
    )
  }

  const url = `https://github.com/ton-blockchain/ton/releases/download/${RLDP_HTTP_PROXY_VERSION}/${asset}`

  if (!opts.silent) {
    process.stderr.write(`  Downloading rldp-http-proxy (${RLDP_HTTP_PROXY_VERSION})…\n`)
  }
  downloadFile(url, paths.daemon)
  chmodExecutable(paths.daemon)
  removeQuarantine(paths.daemon)

  writeFileSync(paths.versionFile, RLDP_HTTP_PROXY_VERSION)
}
