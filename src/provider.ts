import { spawnSync } from 'child_process'
import { readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { Address } from '@ton/ton'
import { getDaemonPaths } from './daemon'
import { getNetworkConfig } from './network'
import { httpsGet } from './utils/http'
import type { DaemonHandle } from './daemon'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface Provider {
  address: string
  ratePerMbDay: number  // nanoTON per MB per day
  maxSpan: number       // seconds per contract
}

export interface ContractMessage {
  bocBase64: string
  amountNano: bigint
  providerAddress: Address
  spanDays: number
  rateTonPerGbYear: number
}

// -----------------------------------------------------------------------
// Provider discovery
// -----------------------------------------------------------------------

interface TonApiProvider {
  address: string
  accept_new_contracts: boolean
  rate_per_mb_day: number
  max_span: number
  minimal_file_size: number
  maximal_file_size: number
}

export async function fetchProviders(testnet = false): Promise<Provider[]> {
  const url = `${getNetworkConfig(testnet).tonapiUrl}/v2/storage/providers`
  const data = await httpsGet<{ providers: TonApiProvider[] }>(url, { timeout: 10_000 })
  return data.providers
    .filter(p => p.accept_new_contracts && p.rate_per_mb_day > 0 && p.max_span >= 3600)
    .map(p => ({
      address: p.address,
      ratePerMbDay: p.rate_per_mb_day,
      maxSpan: p.max_span,
    }))
    .sort((a, b) => a.ratePerMbDay - b.ratePerMbDay)
}

export function selectCheapestProvider(providers: Provider[]): Provider {
  if (providers.length === 0) {
    throw new Error('No active storage providers found on the network.')
  }
  return providers[0]
}

// -----------------------------------------------------------------------
// Bag size query
// -----------------------------------------------------------------------

interface DaemonBagInfo {
  total_size?: number
  downloaded_size?: number
}

export function getBagSizeBytes(bagId: string, daemon: DaemonHandle): number {
  const paths = getDaemonPaths()
  const keyDir = join(daemon.dbDir, 'cli-keys')
  const result = spawnSync(
    paths.cli,
    [
      '-v', '0',
      '-I', `127.0.0.1:${daemon.cliPort}`,
      '-k', join(keyDir, 'client'),
      '-p', join(keyDir, 'server.pub'),
      '-c', `get ${bagId} --json`,
    ],
    { encoding: 'utf8', timeout: 10_000 }
  )
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  try {
    // daemon outputs JSON after some boilerplate — find the first '{...}'
    const match = output.match(/\{[\s\S]*\}/)
    if (match) {
      const info: DaemonBagInfo = JSON.parse(match[0])
      return info.total_size ?? 0
    }
  } catch { /* fall through */ }
  return 0
}

// -----------------------------------------------------------------------
// Contract message generation
// -----------------------------------------------------------------------

export function generateContractMessage(
  bagId: string,
  sizeBytes: number,
  provider: Provider,
  daemon: DaemonHandle,
): ContractMessage {
  const paths = getDaemonPaths()
  const keyDir = join(daemon.dbDir, 'cli-keys')
  const outFile = join(tmpdir(), `ton-contract-${randomBytes(8).toString('hex')}.boc`)

  const result = spawnSync(
    paths.cli,
    [
      '-v', '0',
      '-I', `127.0.0.1:${daemon.cliPort}`,
      '-k', join(keyDir, 'client'),
      '-p', join(keyDir, 'server.pub'),
      '-c', `new-contract-message ${bagId} ${outFile} --provider ${provider.address}`,
    ],
    { encoding: 'utf8', timeout: 30_000 }
  )

  if (result.status !== 0 || !readFileExists(outFile)) {
    throw new Error(
      `Failed to generate provider contract message:\n${result.stderr ?? result.stdout}`
    )
  }

  const boc = readFileSync(outFile)
  try { unlinkSync(outFile) } catch { /* ignore */ }

  // Amount = storage cost + 0.3 TON buffer for contract deployment fees
  const sizeMb = Math.max(sizeBytes / 1_000_000, 0.1)
  const spanDays = Math.max(provider.maxSpan / 86400, 1)
  const storageCostNano = BigInt(Math.ceil(sizeMb * provider.ratePerMbDay * spanDays))
  const bufferNano = 300_000_000n  // 0.3 TON
  const amountNano = storageCostNano + bufferNano

  const rateTonPerGbYear = (provider.ratePerMbDay * 1000 / 1e9) * 365

  return {
    bocBase64: boc.toString('base64'),
    amountNano,
    providerAddress: Address.parse(provider.address),
    spanDays,
    rateTonPerGbYear,
  }
}

function readFileExists(path: string): boolean {
  try { readFileSync(path); return true } catch { return false }
}
