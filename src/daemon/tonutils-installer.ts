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

const TONUTILS_VERSION = 'v1.4.1'

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
  // Pinned SHA-256 hashes for xssnick/tonutils-storage v1.4.1.
  // Computed 2026-05-12 by downloading each release asset and
  // running `shasum -a 256`. Codex pre-GA review round 11 self-audit
  // (supply-chain integrity). Bump in lockstep with `version`.
  expectedSha256: {
    'darwin-arm64': '59698433588726413a4cb47d5ccdee61b74160e1281851dcf3936f4ed10fb1d3',
    'darwin-x64':   'e974a64bcc461c90c0b9a550218d56c404741a183badfa5fe2dc014228475d52',
    'linux-arm64':  '20b0552fc1e29237626d7c6157f72d7f5e6d9f92d55870cb7b08908b0b14f5cb',
    'linux-x64':    '4bfb878321644e93b7eb6a9d7e2475b6b23899d3e28d369ee6a049ddbd01dc0b',
    'win32-x64':    '90fbabe36b29a35da92825a953cc485e663c68dd8e2019551feef4d8d103fb78',
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
