import { createHash } from 'crypto'
import { Address, beginCell, Cell } from '@ton/ton'
import chalk from 'chalk'
import ora from 'ora'
import { httpsGet } from './utils/http'
import { getNetworkConfig } from './network'

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface DnsRegistrationOptions {
  domain: string
  bagId: string
}

export interface DnsCheckResult {
  registered: boolean
  currentBagId?: string
}

// -----------------------------------------------------------------------
// DNS record key
// -----------------------------------------------------------------------

// TON DNS record key for "storage" is SHA256("storage") as a 256-bit integer
function storageRecordKey(): bigint {
  const hash = createHash('sha256').update('storage').digest()
  return BigInt('0x' + hash.toString('hex'))
}

// -----------------------------------------------------------------------
// DNS record value cell
// Cell format: 0x7473 (2 bytes magic) + 256-bit bag ID
// See: https://github.com/ton-blockchain/TEPs/blob/master/text/0081-dns-standard.md
// -----------------------------------------------------------------------

export function buildDnsStorageRecord(bagId: string): Cell {
  const bagIdBuf = Buffer.from(bagId, 'hex')
  if (bagIdBuf.length !== 32) {
    throw new Error(`Invalid bag ID length: expected 32 bytes, got ${bagIdBuf.length}`)
  }

  return beginCell()
    .storeUint(0x7473, 16)   // magic: "ts" = TON Storage
    .storeBuffer(bagIdBuf)   // 256-bit bag ID
    .endCell()
}

// -----------------------------------------------------------------------
// change_dns_record transaction body
// Op: 0x4eb1f0f9
// Layout: op(32) + queryId(64) + key(256) + flag(1=set, 0=delete) + value(ref)
// -----------------------------------------------------------------------

export function buildChangeDnsRecordBody(bagId: string): Cell {
  const key = storageRecordKey()
  const valueCell = buildDnsStorageRecord(bagId)

  return beginCell()
    .storeUint(0x4eb1f0f9, 32)   // op: change_dns_record
    .storeUint(0, 64)             // queryId = 0
    .storeUint(key, 256)          // DNS record key = SHA256("storage")
    .storeBit(1)                  // flag: 1 = set (0 = delete)
    .storeRef(valueCell)          // value cell (ref)
    .endCell()
}

// -----------------------------------------------------------------------
// TONAPI: domain → NFT item address
// GET https://tonapi.io/v2/dns/{domain}  (mainnet)
// GET https://testnet.tonapi.io/v2/dns/{domain}  (testnet)
// -----------------------------------------------------------------------

interface TonApiDnsInfo {
  item?: { address: string }
}

export async function getDomainNftAddress(domain: string, testnet = false): Promise<Address> {
  const cleanDomain = domain.endsWith('.ton') ? domain : `${domain}.ton`
  const url = `${getNetworkConfig(testnet).tonapiUrl}/v2/dns/${encodeURIComponent(cleanDomain)}`

  try {
    const data = await httpsGet<TonApiDnsInfo>(url, { timeout: 10_000 })
    if (!data.item?.address) {
      throw new Error(`Domain "${cleanDomain}" has no NFT item address in TONAPI response`)
    }
    return Address.parse(data.item.address)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Not found')) {
      throw new Error(`Domain "${cleanDomain}" not found. Make sure you own this .ton domain.`)
    }
    throw new Error(`Failed to resolve domain "${cleanDomain}": ${message}`)
  }
}

// -----------------------------------------------------------------------
// Poll TONAPI until DNS record matches our bag ID (or timeout)
// -----------------------------------------------------------------------

interface TonApiDnsRecord {
  storage?: { bag_id?: string }
}

async function getDnsStorageRecord(domain: string, testnet = false): Promise<string | null> {
  const cleanDomain = domain.endsWith('.ton') ? domain : `${domain}.ton`
  const url = `${getNetworkConfig(testnet).tonapiUrl}/v2/dns/${encodeURIComponent(cleanDomain)}/resolve`

  try {
    const data = await httpsGet<TonApiDnsRecord>(url, { timeout: 5_000 })
    return data.storage?.bag_id?.toLowerCase() ?? null
  } catch {
    return null
  }
}

export async function pollDnsRecord(
  domain: string,
  expectedBagId: string,
  timeoutMs = 300_000,
  intervalMs = 10_000,
  testnet = false,
): Promise<boolean> {
  const spinner = ora('Waiting for DNS record to propagate...').start()
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const current = await getDnsStorageRecord(domain, testnet)
    if (current === expectedBagId.toLowerCase()) {
      spinner.succeed('DNS record confirmed on-chain!')
      return true
    }
    await sleep(intervalMs)
  }

  spinner.warn('DNS propagation timed out — the transaction may still be pending.')
  console.log(chalk.dim('  Check manually: ' + getNetworkConfig(testnet).tonapiUrl + '/v2/dns/' + encodeURIComponent(domain) + '/resolve'))
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
