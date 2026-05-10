import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { getBinaryName } from './platform'
import { getNetworkConfig } from '../network'
import { BIN_DIR, chmodExecutable, downloadFile, removeQuarantine } from './installer-utils'

const TON_RELEASE_TAG = 'v2026.02-1'
const VERSION_FILE = path.join(BIN_DIR, '.version')

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

/**
 * Ensure daemon binaries are installed and up-to-date
 */
export function ensureBinaries(useTestnet = false): void {
  mkdirSync(BIN_DIR, { recursive: true })

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

    process.stdout.write(`  Downloading storage-daemon (${TON_RELEASE_TAG})...\n`)
    downloadFile(`${base}/${daemonAsset}`, paths.daemon)
    chmodExecutable(paths.daemon)

    process.stdout.write(`  Downloading storage-daemon-cli...\n`)
    downloadFile(`${base}/${cliAsset}`, paths.cli)
    chmodExecutable(paths.cli)

    removeQuarantine(paths.daemon)
    removeQuarantine(paths.cli)

    writeFileSync(VERSION_FILE, TON_RELEASE_TAG)
  }

  // Config JSON (download if missing)
  if (!existsSync(paths.mainnetConfig)) {
    process.stdout.write(`  Downloading mainnet config...\n`)
    downloadFile(getNetworkConfig(false).daemonConfigUrl, paths.mainnetConfig)
  }
  if (useTestnet && !existsSync(paths.testnetConfig)) {
    process.stdout.write(`  Downloading testnet config...\n`)
    downloadFile(getNetworkConfig(true).daemonConfigUrl, paths.testnetConfig)
  }
}
