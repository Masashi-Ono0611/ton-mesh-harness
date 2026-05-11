// rldp-http-proxy installer (ton-blockchain/ton C++ binary).
//
// Mirrors the structure of `tonutils-installer.ts`. v0.7 ships this as part
// of the auto-spawn site-host flow (`--site auto`); the binary publishes a
// .ton domain over HTTP-over-RLDP without the user having to follow
// `docs/v0.6/byo-rldp-http-proxy.md` manually.

import {
  installBinary,
  resolveBinaryPaths,
  type BinaryInstallerSpec,
  type BinaryPaths,
  type InstallBinaryOptions,
} from './installer-utils'

// Pin to the v2026.04-1 tag whose asset names we surveyed during planning.
// Override via env var `RLDP_HTTP_PROXY_VERSION` if a future release shifts
// naming and we want to opt in without bumping our pin.
const DEFAULT_VERSION = 'v2026.04-1'
export const RLDP_HTTP_PROXY_VERSION =
  process.env.RLDP_HTTP_PROXY_VERSION?.trim() || DEFAULT_VERSION

// ton-blockchain/ton release asset naming. Surveyed against tag v2026.04-1:
// the published assets cover linux-{arm64,x86_64}, mac-{arm64,x86-64},
// and a single .exe for Windows x86_64.
const SPEC: BinaryInstallerSpec = {
  name: 'rldp-http-proxy',
  version: RLDP_HTTP_PROXY_VERSION,
  exeName: 'rldp-http-proxy',
  versionFileName: '.rldp-http-proxy-version',
  assetMap: {
    'darwin-arm64': 'rldp-http-proxy-mac-arm64',
    'darwin-x64':   'rldp-http-proxy-mac-x86-64',
    'linux-arm64':  'rldp-http-proxy-linux-arm64',
    'linux-x64':    'rldp-http-proxy-linux-x86_64',
    'win32-x64':    'rldp-http-proxy.exe',
  },
  downloadUrl: (version, asset) =>
    `https://github.com/ton-blockchain/ton/releases/download/${version}/${asset}`,
  unsupportedHint:
    'Workaround: run rldp-http-proxy yourself and use --site-adnl <hex> ' +
    'instead of --site auto. See docs/v0.6/byo-rldp-http-proxy.md.',
}

export type RldpHttpProxyPaths = BinaryPaths
export type EnsureRldpHttpProxyBinaryOptions = InstallBinaryOptions

export function getRldpHttpProxyPaths(): RldpHttpProxyPaths {
  return resolveBinaryPaths(SPEC)
}

/**
 * Idempotently install the rldp-http-proxy binary at the expected version.
 * No-ops when already installed.
 */
export function ensureRldpHttpProxyBinary(opts: EnsureRldpHttpProxyBinaryOptions = {}): void {
  installBinary(SPEC, opts)
}
