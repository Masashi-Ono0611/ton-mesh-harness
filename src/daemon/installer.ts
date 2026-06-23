import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { daemonHashKey, getBinaryName, getPlatformKey } from './platform'
import { getNetworkConfig } from '../network'
import { BIN_DIR, chmodExecutable, downloadFile, removeQuarantine, verifyFileSha256 } from './installer-utils'

const TON_RELEASE_TAG = 'v2026.02-1'
const VERSION_FILE = path.join(BIN_DIR, '.version')

// Pinned SHA-256 hashes for ton-blockchain/ton v2026.02-1
// storage-daemon + storage-daemon-cli assets.
// Computed 2026-05-12 by downloading each release asset and running
// `shasum -a 256`. Codex r11 self-audit class — supply-chain integrity.
// Bump in lockstep with TON_RELEASE_TAG.
//
// NOTE: Windows shares a single x86_64 asset (storage-daemon.exe /
// storage-daemon-cli.exe) — no per-arch Windows binaries are
// published. The `win32-x64` key below covers all Windows users;
// `getBinaryName` returns the suffix-free `.exe` filename for them.
/** @internal Exported for the #101 regression test (TOFU-gap guard). */
export const STORAGE_DAEMON_HASHES: Record<string, string> = {
  'darwin-arm64': '95c4c64c9f754e338485453f8cb0a06cd69252656087b86774cf30c4e9e46ad8',
  'darwin-x64':   '3b76eb65e73efebcd49f389f953375f76814814e874b26249669985de1814ecb',
  'linux-arm64':  '16ac0f16e2edf7451c0a8523250993982c7da8d4b5615f8369f9103f7399ef54',
  'linux-x64':    '25ebe6ecb5fa2a17625c7baf161405eb96b8036600a94e22af318c9dae8c6d32',
  'win32-x64':    '16f1f19e00f9b0bd359fa396e905104cf503e18791d52c49181ade830284c2cd',
}
/** @internal Exported for the #101 regression test (TOFU-gap guard). */
export const STORAGE_DAEMON_CLI_HASHES: Record<string, string> = {
  'darwin-arm64': '92109afc7c4d6df8387ff65104b10f266a0e1d1a0144ed50f8665636101db576',
  'darwin-x64':   '326df3cbe3abcdfa650e2e06a99e9d1211a5f861a395b32e25f53713384d8a04',
  'linux-arm64':  '6fb53f5ed9eb2497edc3b47d2112660e68194ff7b8f2c128a0c2605c556e87dd',
  'linux-x64':    'cd4df90d89be4a77170836a01a224723ce693dfae4e0cfdbf8aac34bcc3f046f',
  'win32-x64':    '08a96a3a1e25b96566915cd03ffd236489187c71efa6a19ad86715bd1fddea4c',
}

export interface DaemonPaths {
  binDir: string
  daemon: string
  cli: string
  mainnetConfig: string
  testnetConfig: string
  versionFile: string
}

/**
 * Get all daemon-related file paths
 */
export function getDaemonPaths(): DaemonPaths {
  return {
    binDir: BIN_DIR,
    daemon: path.join(BIN_DIR, 'storage-daemon'),
    cli: path.join(BIN_DIR, 'storage-daemon-cli'),
    mainnetConfig: path.join(BIN_DIR, 'global.config.json'),
    testnetConfig: path.join(BIN_DIR, 'testnet-global.config.json'),
    versionFile: VERSION_FILE,
  }
}

export interface EnsureBinariesOptions {
  /** Suppress the download banner. Use when stdout must stay JSON-clean. */
  silent?: boolean
}

/**
 * Ensure daemon binaries (storage-daemon + storage-daemon-cli) are
 * installed and up-to-date. Also downloads the appropriate network
 * config JSON if missing. Idempotent.
 *
 * All progress banners go to STDERR so `--json-output` stdout stays
 * parseable (matches the convention `tonutils-installer.ts` /
 * `rldp-http-proxy-installer.ts` use via `installer-utils`).
 */
export function ensureBinaries(useTestnet = false, opts: EnsureBinariesOptions = {}): void {
  mkdirSync(BIN_DIR, { recursive: true })
  const banner = opts.silent ? () => {} : (msg: string) => process.stderr.write(msg)

  // Resolve the platform + hash-lookup key UP FRONT — before the cache check —
  // so an unsupported/unrunnable platform is rejected on every call, not only
  // on a fresh install. Windows ships a single x86-64 asset for every arch (see
  // getBinaryName), so daemonHashKey maps 64-bit ARM Windows onto the x64 hash
  // (same file, runs under x64 emulation) and throws for 32-bit Windows, which
  // cannot run an x64 binary. Hoisting this out of the `needsBinaries` block
  // means a stale cache on a 32-bit machine still gets a clean error instead of
  // a later runtime exec failure.
  const platformKey = getPlatformKey()
  const hashKey = daemonHashKey(platformKey)

  const paths = getDaemonPaths()
  const currentVersion = existsSync(VERSION_FILE)
    ? readFileSync(VERSION_FILE, 'utf8').trim()
    : ''

  const needsBinaries =
    currentVersion !== TON_RELEASE_TAG ||
    !existsSync(paths.daemon) ||
    !existsSync(paths.cli)

  if (needsBinaries) {
    const daemonAsset = getBinaryName('storage-daemon')
    const cliAsset = getBinaryName('storage-daemon-cli')
    const base = `https://github.com/ton-blockchain/ton/releases/download/${TON_RELEASE_TAG}`

    banner(`  Downloading storage-daemon (${TON_RELEASE_TAG})…\n`)
    downloadFile(`${base}/${daemonAsset}`, paths.daemon)
    // SHA-256 integrity check BEFORE chmod+x. Codex r11 self-audit
    // class — protects against compromised GitHub release asset /
    // MITM'd CDN / typo-squat (same threat model as the tonutils +
    // rldp-http-proxy installers).
    verifyFileSha256({
      name: 'storage-daemon',
      version: TON_RELEASE_TAG,
      platformKey,
      filePath: paths.daemon,
      expected: STORAGE_DAEMON_HASHES[hashKey],
    })
    chmodExecutable(paths.daemon)

    banner(`  Downloading storage-daemon-cli…\n`)
    downloadFile(`${base}/${cliAsset}`, paths.cli)
    verifyFileSha256({
      name: 'storage-daemon-cli',
      version: TON_RELEASE_TAG,
      platformKey,
      filePath: paths.cli,
      expected: STORAGE_DAEMON_CLI_HASHES[hashKey],
    })
    chmodExecutable(paths.cli)

    removeQuarantine(paths.daemon)
    removeQuarantine(paths.cli)

    writeFileSync(VERSION_FILE, TON_RELEASE_TAG)
  }

  // Config JSON (download if missing)
  if (!existsSync(paths.mainnetConfig)) {
    banner(`  Downloading mainnet config…\n`)
    downloadFile(getNetworkConfig(false).daemonConfigUrl, paths.mainnetConfig)
  }
  if (useTestnet && !existsSync(paths.testnetConfig)) {
    banner(`  Downloading testnet config…\n`)
    downloadFile(getNetworkConfig(true).daemonConfigUrl, paths.testnetConfig)
  }
}
