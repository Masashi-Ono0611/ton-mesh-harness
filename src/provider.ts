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
  ratePerMbDay: number       // nanoTON per MB per day
  maxSpan: number            // seconds per contract
  minimalFileSize: number    // bytes; bag must be ≥ this or contract throws 1004
  maximalFileSize: number    // bytes; bag must be ≤ this or contract throws 1005
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

export interface FetchProvidersOptions {
  // When set, only return providers whose accepted file-size range covers
  // sizeBytes. Use this when you already know the bag size — auto-select
  // will then never pick a provider that would throw error::file_too_small
  // (1004) or error::file_too_big (1005) on contract deployment.
  sizeBytes?: number
}

export async function fetchProviders(
  testnet = false,
  opts: FetchProvidersOptions = {},
): Promise<Provider[]> {
  const url = `${getNetworkConfig(testnet).tonapiUrl}/v2/storage/providers`
  const data = await httpsGet<{ providers: TonApiProvider[] }>(url, { timeout: 10_000 })
  return data.providers
    .filter(p => p.accept_new_contracts && p.rate_per_mb_day > 10 && p.max_span >= 3600)
    .filter(p => {
      if (opts.sizeBytes === undefined) return true
      return opts.sizeBytes >= p.minimal_file_size && opts.sizeBytes <= p.maximal_file_size
    })
    .map(p => ({
      address: p.address,
      ratePerMbDay: p.rate_per_mb_day,
      maxSpan: p.max_span,
      minimalFileSize: p.minimal_file_size,
      maximalFileSize: p.maximal_file_size,
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

// Default span when caller does not provide one. 86 400 s = 1 day, a sane
// minimum for production hosting. uint32 max (~136 years) is the upper bound.
export const DEFAULT_SPAN_SECONDS = 86_400

// Span used purely as a sample to extract microchunk_hash + TorrentInfo from
// the daemon CLI's `new-contract-message` output. Capped at the uint8 limit
// because that is what the (buggy) parser accepts; the value itself is
// discarded — we re-emit the BOC ourselves with the caller's chosen span.
const CLI_SAMPLE_SPAN = 200

export function generateContractMessage(
  bagId: string,
  sizeBytes: number,
  provider: Provider,
  daemon: DaemonHandle,
  spanSeconds: number = DEFAULT_SPAN_SECONDS,
): ContractMessage {
  if (!Number.isInteger(spanSeconds) || spanSeconds < 1 || spanSeconds > 0xffff_ffff) {
    throw new Error(
      `Invalid span: ${spanSeconds}. Must be a positive integer ≤ 2^32 - 1 (about 136 years in seconds).`,
    )
  }
  // Reject spans that exceed what the chosen provider advertises — otherwise
  // the user would sign and pay 0.3 TON gas for a contract the provider's
  // on-chain code rejects (`expected_max_span > max_span` ⇒ throw 1009).
  // provider.maxSpan == 0 means we're using a manually-passed address whose
  // params we couldn't resolve from TONAPI; in that case skip the check and
  // let the user proceed at their own risk.
  if (provider.maxSpan > 0 && spanSeconds > provider.maxSpan) {
    throw new Error(
      `Span ${spanSeconds}s exceeds provider's max_span (${provider.maxSpan}s). ` +
      `Pass --span ≤ ${provider.maxSpan} or pick a different provider.`,
    )
  }
  // Reject bags outside the provider's accepted size range — otherwise the
  // contract's recv_internal throws 1004 (file_too_small) or 1005
  // (file_too_big) and the user pays gas for a bounce. Round-4 mainnet soak
  // hit 1004 with a 76 B HTML against minimal_file_size = 1024.
  // provider.{minimalFileSize,maximalFileSize} == 0 means the provider was
  // passed manually and its params couldn't be resolved; skip the check.
  if (provider.minimalFileSize > 0 && sizeBytes < provider.minimalFileSize) {
    throw new Error(
      `Bag is ${sizeBytes} bytes; provider requires ≥ ${provider.minimalFileSize} bytes. ` +
      `Pad your build dir or pick a provider with a smaller minimal_file_size.`,
    )
  }
  if (provider.maximalFileSize > 0 && sizeBytes > provider.maximalFileSize) {
    throw new Error(
      `Bag is ${sizeBytes} bytes; provider accepts ≤ ${provider.maximalFileSize} bytes. ` +
      `Pick a provider with a larger maximal_file_size.`,
    )
  }

  // Step 1 — let the daemon compute the microchunk tree for us. We invoke
  // `new-contract-message` because that is the only daemon path that exposes
  // microchunk_hash. The resulting BOC's span is throwaway (uint8-capped).
  const samplePath = join(tmpdir(), `ton-contract-${randomBytes(8).toString('hex')}.boc`)
  const paths = getDaemonPaths()
  const keyDir = join(daemon.dbDir, 'cli-keys')

  const result = spawnSync(
    paths.cli,
    [
      '-v', '0',
      '-I', `127.0.0.1:${daemon.cliPort}`,
      '-k', join(keyDir, 'client'),
      '-p', join(keyDir, 'server.pub'),
      '-c',
      `new-contract-message ${bagId} ${samplePath} --rate ${provider.ratePerMbDay} --max-span ${CLI_SAMPLE_SPAN}`,
    ],
    { encoding: 'utf8', timeout: 30_000 },
  )

  const output = (result.stderr ?? '') + (result.stdout ?? '')
  if (result.status !== 0 || !readFileExists(samplePath)) {
    throw new Error(
      `Failed to generate provider contract message (exit ${result.status ?? 'timeout'}):\n${output}`,
    )
  }

  const sampleBoc = readFileSync(samplePath)
  try { unlinkSync(samplePath) } catch { /* ignore */ }

  // Step 2 — parse the daemon's output to recover torrentInfo + microchunk_hash
  // (the two values we cannot derive ourselves without re-implementing
  // MicrochunkTree::Builder in TS). We then drop everything else.
  const sampleCell = Cell.fromBoc(sampleBoc)[0]
  const sampleSlice = sampleCell.beginParse()
  const sampleOp = sampleSlice.loadUint(32)
  if (sampleOp !== OP_OFFER_STORAGE_CONTRACT) {
    throw new Error(
      `Unexpected opcode 0x${sampleOp.toString(16)} from daemon — expected 0x107c49ef`,
    )
  }
  sampleSlice.loadUintBig(64)                            // queryId — discarded
  if (sampleCell.refs.length !== 1) {
    throw new Error(`Expected 1 ref (TorrentInfo), got ${sampleCell.refs.length}`)
  }
  const torrentInfo = sampleCell.refs[0]
  const microchunkBig = sampleSlice.loadUintBig(256)
  const microchunkHash = Buffer.from(
    microchunkBig.toString(16).padStart(64, '0'),
    'hex',
  )

  // Step 3 — emit our own BOC with the caller's chosen span. Uses
  // vm::std_boc_serialize-equivalent flags ({ idx: false, crc32: false }) so
  // the wire format matches what TON's network already accepts.
  // queryId mixes ms timestamp with 16 bits of randomness so back-to-back
  // signs (sub-second) don't collide on chain.
  const queryId = (BigInt(Date.now()) << 16n) | BigInt(randomBytes(2).readUInt16BE(0))
  const cell = buildOfferStorageContractMessage({
    queryId,
    torrentInfo,
    microchunkHash,
    expectedRateNanoPerMbDay: BigInt(provider.ratePerMbDay),
    expectedMaxSpanSeconds: spanSeconds,
  })
  const bocBase64 = cell.toBoc({ idx: false, crc32: false }).toString('base64')

  // Step 4 — recompute the message value on the real span. Buffer of 0.3 TON
  // covers contract deployment fees regardless of size.
  const sizeMb = Math.max(sizeBytes / 1_000_000, 0.1)
  const spanDays = spanSeconds / 86_400
  const storageCostNano = BigInt(Math.ceil(sizeMb * provider.ratePerMbDay * spanDays))
  const bufferNano = 300_000_000n
  const amountNano = storageCostNano + bufferNano

  const rateTonPerGbYear = (provider.ratePerMbDay * 1000 / 1e9) * 365

  return {
    bocBase64,
    amountNano,
    providerAddress: Address.parse(provider.address),
    spanDays,
    rateTonPerGbYear,
  }
}

function readFileExists(path: string): boolean {
  try { readFileSync(path); return true } catch { return false }
}
