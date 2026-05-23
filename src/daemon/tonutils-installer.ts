// tonutils-storage daemon installer (xssnick / Go).
// Sibling of installer.ts (TON Core daemon installer); we keep both around
// so users can opt in to either backend via --daemon-backend.

import {
  installBinary,
  resolveBinaryPaths,
  type BinaryInstallerSpec,
  type BinaryPaths,
  type InstallBinaryOptions,
} from './installer-utils'

const TONUTILS_VERSION = 'v1.5.0'

// xssnick/tonutils-storage release asset naming. Note: the project's asset
// names don't follow Node's `process.platform-process.arch` convention
// directly — Mac uses `mac-amd64`/`mac-arm64`, Linux uses `linux-amd64`/
// `linux-arm64`, Windows uses `x64.exe`. ARM64 Windows is not published.
const SPEC: BinaryInstallerSpec = {
  name: 'tonutils-storage',
  version: TONUTILS_VERSION,
  exeName: 'tonutils-storage',
  versionFileName: '.tonutils-version',
  assetMap: {
    'darwin-arm64': 'tonutils-storage-mac-arm64',
    'darwin-x64':   'tonutils-storage-mac-amd64',
    'linux-arm64':  'tonutils-storage-linux-arm64',
    'linux-x64':    'tonutils-storage-linux-amd64',
    'win32-x64':    'tonutils-storage-x64.exe',
  },
  // Pinned SHA-256 hashes for xssnick/tonutils-storage v1.5.0.
  // Computed 2026-05-23 via `scripts/bump-daemon-hashes.cjs` (#32) from each
  // release asset (supply-chain integrity). Bump in lockstep with `version`.
  expectedSha256: {
    'darwin-arm64': '6c2f67817deda79595746be672f1e5cd12a578154029a72e53742192b7427f03',
    'darwin-x64':   'dcf0f82d8df4f265868f8123c158dde0dbc6162ac2364a74b138019341e6e9f6',
    'linux-arm64':  '039ffca391ec82a46fcfcb3d8a75a28e048a56fd4cf070aae370f6d0981c8d2f',
    'linux-x64':    'bb080f0b0918721fbeca5af20d5e5dba64d387228758c00887254cbf2feccb2f',
    'win32-x64':    '9d21ed2c283e50b2f5be7c8ef5ccf685353ed94bb4439475e4190f4db0e0bd20',
  },
  downloadUrl: (version, asset) =>
    `https://github.com/xssnick/tonutils-storage/releases/download/${version}/${asset}`,
  unsupportedHint:
    'Workaround: pass --daemon-backend=ton-core to use the TON Core daemon instead.',
}

export type TonutilsPaths = BinaryPaths
export type EnsureTonutilsBinaryOptions = InstallBinaryOptions

export function getTonutilsPaths(): TonutilsPaths {
  return resolveBinaryPaths(SPEC)
}

/**
 * Ensure the tonutils-storage binary is installed and at the expected
 * version. Idempotent — does nothing if the binary is already present
 * with a matching .tonutils-version file.
 */
export function ensureTonutilsBinary(opts: EnsureTonutilsBinaryOptions = {}): void {
  installBinary(SPEC, opts)
}
