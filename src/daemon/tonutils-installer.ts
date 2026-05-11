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
