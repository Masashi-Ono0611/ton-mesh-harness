import { spawnSync } from 'child_process'
import { readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { Address, beginCell, Cell } from '@ton/ton'
import { getDaemonPaths } from './daemon'
import { getNetworkConfig } from './network'
import { httpsGet } from './utils/http'
import type { DaemonHandle } from './daemon'

// -----------------------------------------------------------------------
// On-chain provider contract — TL-B
// -----------------------------------------------------------------------
//
// new_storage_contract#107c49ef query_id:uint64 info:(^TorrentInfo)
//   microchunk_hash:uint256 expected_rate:Coins expected_max_span:uint32
//   = NewStorageContract;
//
// Source: storage/storage-daemon/smartcont/{storage-provider,constants}.fc
// (verified against ton-blockchain/ton @ v2026.04-1)

export const OP_OFFER_STORAGE_CONTRACT = 0x107c49ef

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
    .filter(p => p.accept_new_contracts && p.rate_per_mb_day > 10 && p.max_span >= 3600)
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
// Self-generated contract message BOC
// -----------------------------------------------------------------------
//
// Bypasses `storage-daemon-cli new-contract-message`, whose --max-span arg
// is parsed as uint8 (cap 255s) due to a copy-paste bug in line 681 of
// storage-daemon-cli.cpp. The on-chain contract takes uint32, so we build
// the BOC ourselves and let the caller choose any span up to 2^32 - 1.

export interface OfferContractArgs {
  queryId: bigint                    // uint64, caller-chosen (e.g. unix seconds)
  torrentInfo: Cell                  // TorrentInfo cell from `storage-daemon-cli get-meta`
  microchunkHash: Buffer             // 32 bytes, from daemon `get … --json`
  expectedRateNanoPerMbDay: bigint   // Coins
  expectedMaxSpanSeconds: number     // uint32
}

/**
 * Build the offer-storage-contract message body (the inbound message a client
 * sends to a Storage Provider master contract).
 *
 * The returned Cell is the message BODY. Wrap it in an internal-message
 * envelope (or hand it straight to TON Connect, which expects body BOCs).
 */
export function buildOfferStorageContractMessage(args: OfferContractArgs): Cell {
  if (args.microchunkHash.length !== 32) {
    throw new Error(`microchunkHash must be 32 bytes (got ${args.microchunkHash.length})`)
  }
  if (!Number.isInteger(args.expectedMaxSpanSeconds) || args.expectedMaxSpanSeconds < 1) {
    throw new Error(`expectedMaxSpanSeconds must be a positive integer (got ${args.expectedMaxSpanSeconds})`)
  }
  if (args.expectedMaxSpanSeconds > 0xffff_ffff) {
    throw new Error(`expectedMaxSpanSeconds exceeds uint32 max (got ${args.expectedMaxSpanSeconds})`)
  }
  if (args.queryId < 0n || args.queryId > 0xffff_ffff_ffff_ffffn) {
    throw new Error(`queryId out of uint64 range (got ${args.queryId})`)
  }
  if (args.expectedRateNanoPerMbDay < 0n) {
    throw new Error(`expectedRateNanoPerMbDay must be non-negative (got ${args.expectedRateNanoPerMbDay})`)
  }

  const microchunkBig = BigInt('0x' + args.microchunkHash.toString('hex'))

  return beginCell()
    .storeUint(OP_OFFER_STORAGE_CONTRACT, 32)
    .storeUint(args.queryId, 64)
    .storeRef(args.torrentInfo)
    .storeUint(microchunkBig, 256)
    .storeCoins(args.expectedRateNanoPerMbDay)
    .storeUint(args.expectedMaxSpanSeconds, 32)
    .endCell()
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

  // Use --rate + --max-span instead of --provider <addr> (P2P lookup):
  //   - --provider <addr> requires a live ADNL connection which times out unreliably
  //   - --rate / --max-span uint8 bug in daemon v2026.02-1 caps max-span at 255 seconds
  //   - We cap max-span at 200 (uint8-safe) → ~3 minute minimum contract duration
  const MAX_SPAN_SECONDS = 200  // uint8-safe cap (daemon bug: accepts 0-255 only)
  const result = spawnSync(
    paths.cli,
    [
      '-v', '0',
      '-I', `127.0.0.1:${daemon.cliPort}`,
      '-k', join(keyDir, 'client'),
      '-p', join(keyDir, 'server.pub'),
      '-c', `new-contract-message ${bagId} ${outFile} --rate ${provider.ratePerMbDay} --max-span ${MAX_SPAN_SECONDS}`,
    ],
    { encoding: 'utf8', timeout: 30_000 }
  )

  const output = (result.stderr ?? '') + (result.stdout ?? '')
  if (result.status !== 0 || !readFileExists(outFile)) {
    throw new Error(
      `Failed to generate provider contract message (exit ${result.status ?? 'timeout'}):\n${output}`
    )
  }

  const boc = readFileSync(outFile)
  try { unlinkSync(outFile) } catch { /* ignore */ }

  // Amount = storage cost + 0.3 TON buffer for contract deployment fees
  // Span is capped at MAX_SPAN_SECONDS (200s) due to daemon uint8 bug
  const sizeMb = Math.max(sizeBytes / 1_000_000, 0.1)
  const spanDays = MAX_SPAN_SECONDS / 86400  // ~0.00231 days
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
