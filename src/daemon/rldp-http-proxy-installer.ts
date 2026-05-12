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

const IS_OVERRIDE = RLDP_HTTP_PROXY_VERSION !== DEFAULT_VERSION

// Codex r11 self-audit polish (path C):
// When a user overrides the pinned version via RLDP_HTTP_PROXY_VERSION,
// the installer can't know the upstream hash and falls back to TOFU
// with a stderr warning. Users who care about supply-chain integrity
// can pin the expected hash via RLDP_HTTP_PROXY_SHA256=<hex64>;
// the installer verifies the downloaded binary against it for the
// current platform-arch. Mismatch → standard delete-and-throw.
//
// Format: `RLDP_HTTP_PROXY_SHA256=<64-hex>` — applies to whichever
// platform is downloading. If you need to pin for multiple
// platforms (e.g. a corporate CI matrix), set the env var
// per-job since each job is a single platform-arch.
function userPinnedHashForCurrentPlatform(): Record<string, string> | undefined {
  const raw = process.env.RLDP_HTTP_PROXY_SHA256?.trim()
  if (!raw) return undefined
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    throw new Error(
      `RLDP_HTTP_PROXY_SHA256 must be a 64-char lowercase hex string (got '${raw.slice(0, 80)}')`,
    )
  }
  return { [`${process.platform}-${process.arch}`]: raw.toLowerCase() }
}

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
  // Pinned SHA-256 hashes for ton-blockchain/ton v2026.04-1.
  // Computed 2026-05-12 by downloading each release asset and
  // running `shasum -a 256`. Codex pre-GA review round 11 self-audit
  // (supply-chain integrity). Bump these in lockstep with
  // DEFAULT_VERSION.
  //
  // When RLDP_HTTP_PROXY_VERSION overrides DEFAULT_VERSION, the
  // pinned map (v2026.04-1) doesn't apply — userPinnedHashForCurrentPlatform()
  // reads RLDP_HTTP_PROXY_SHA256 if set, falls back to TOFU if not.
  expectedSha256: IS_OVERRIDE
    ? userPinnedHashForCurrentPlatform()
    : {
        'darwin-arm64': '451f9941c9f4de7df33a39cfd98f1fd063461ae1d1104dd583351efd3ef754ca',
        'darwin-x64':   '0fe6fe3f274a0a1594a407ac95d2710a4356858afb92e00f62cbb6f66424230c',
        'linux-arm64':  'ef6e10d540f2f6b3c628ea01b9dd1beb38e2bb136ba7cedf80c2c7ac3f2ccde4',
        'linux-x64':    '207d8b30c9d2fb177f9260eb2c116c21db9bee846dd16368bbf8862258ac580e',
        'win32-x64':    'f2bbef64810e1a28c9cf3520288da0539c501887276e4b0d1d18e6fe1644e0b6',
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
