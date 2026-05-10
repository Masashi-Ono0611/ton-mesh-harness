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
// DNS record keys
// -----------------------------------------------------------------------
// TON DNS record keys are SHA256(<name>) as a 256-bit integer.
// "storage" → dns_storage_address (magic 0x7473)
// "site"    → dns_adnl_address    (magic 0xad01) — the record TON Browser /
//             rldp-http-proxy hosts (e.g. piracy.ton, tonnet-sync-check.ton)
// See: https://github.com/ton-blockchain/TEPs/blob/master/text/0081-dns-standard.md

function recordKey(name: string): bigint {
  const hash = createHash('sha256').update(name).digest()
  return BigInt('0x' + hash.toString('hex'))
}

function storageRecordKey(): bigint { return recordKey('storage') }
function siteRecordKey(): bigint { return recordKey('site') }

// -----------------------------------------------------------------------
// dns_storage_address (0x7473) — points the domain at a TON Storage bag
// Layout: magic:uint16 + bag_id:bits256
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
// dns_adnl_address (0xad01) — points the domain at an ADNL identity
// Layout: magic:uint16 + adnl_addr:bits256 + flags:uint8 (flags <= 1)
// flags = 0 here (no proto_list); browsers and rldp-http-proxy default to
// HTTP-over-RLDP. Ref: TEP-0081 §"DNS records".
// -----------------------------------------------------------------------

const ADNL_HEX_RE = /^[0-9a-f]{64}$/i

function normalizeAdnlHex(adnlHex: string): Buffer {
  // Accept both lower- and upper-case `0x` / `0X` prefixes.
  const cleaned = /^0x/i.test(adnlHex) ? adnlHex.slice(2) : adnlHex
  if (!ADNL_HEX_RE.test(cleaned)) {
    throw new Error(
      `Invalid ADNL address: expected 64 hex chars (256-bit), got ${JSON.stringify(adnlHex)}`,
    )
  }
  return Buffer.from(cleaned, 'hex')
}

export function buildDnsAdnlRecord(adnlHex: string, flags: number = 0): Cell {
  // TEP-0081: `dns_adnl_address#ad01 adnl_addr:bits256 flags:(## 8)`
  // `proto_list:flags . 0?ProtoList`. flags=1 means a proto_list must follow.
  // v0.6 supports flags=0 only (no proto list); rldp-http-proxy and TON
  // Browser default to HTTP-over-RLDP in that case. Building a flags=1 cell
  // without a proto_list ref would produce a malformed record, so reject it.
  if (flags !== 0) {
    throw new Error(`Invalid ADNL flags: only flags=0 is supported in v0.6 (got ${flags})`)
  }
  const adnlBuf = normalizeAdnlHex(adnlHex)

  return beginCell()
    .storeUint(0xad01, 16)   // magic: dns_adnl_address
    .storeBuffer(adnlBuf)    // 256-bit ADNL identity
    .storeUint(flags, 8)     // flags = 0 → no proto list
    .endCell()
}

// -----------------------------------------------------------------------
// change_dns_record transaction body
// Op: 0x4eb1f0f9
// Layout: op(32) + queryId(64) + key(256) + flag(1=set, 0=delete) + value(ref)
// -----------------------------------------------------------------------

function buildChangeDnsRecordBodyForKey(key: bigint, valueCell: Cell): Cell {
  return beginCell()
    .storeUint(0x4eb1f0f9, 32)   // op: change_dns_record
    .storeUint(0, 64)             // queryId = 0
    .storeUint(key, 256)          // DNS record key (SHA256 of record name)
    .storeBit(1)                  // flag: 1 = set (0 = delete)
    .storeRef(valueCell)          // value cell (ref)
    .endCell()
}

export function buildChangeDnsRecordBody(bagId: string): Cell {
  return buildChangeDnsRecordBodyForKey(storageRecordKey(), buildDnsStorageRecord(bagId))
}

export function buildChangeDnsSiteRecordBody(adnlHex: string, flags: number = 0): Cell {
  return buildChangeDnsRecordBodyForKey(siteRecordKey(), buildDnsAdnlRecord(adnlHex, flags))
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

// TONAPI `/v2/dns/{domain}/resolve` shape — observed live on 2026-05-10:
//   "storage": "<hex bag id>"               // string, not object
//   "sites":   ["<hex adnl>", ...] | []
// The earlier code expected `storage: { bag_id: "..." }` (a v0.2-era schema)
// and consequently never matched — every deploy timed out at the polling
// step even though the on-chain write had succeeded. v0.6.2 fix: accept the
// current string shape, defensively also accept the legacy object shape so a
// future schema flip doesn't bite us again.
interface TonApiDnsRecord {
  storage?: string | { bag_id?: string }
  sites?: string[]
}

export function extractStorageBagId(data: TonApiDnsRecord | null | undefined): string | null {
  const s = data?.storage
  if (!s) return null
  if (typeof s === 'string') return s.toLowerCase()
  if (typeof s.bag_id === 'string') return s.bag_id.toLowerCase()
  return null
}

async function getDnsResolved(domain: string, testnet = false): Promise<TonApiDnsRecord | null> {
  const cleanDomain = domain.endsWith('.ton') ? domain : `${domain}.ton`
  const url = `${getNetworkConfig(testnet).tonapiUrl}/v2/dns/${encodeURIComponent(cleanDomain)}/resolve`

  try {
    return await httpsGet<TonApiDnsRecord>(url, { timeout: 5_000 })
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
    const data = await getDnsResolved(domain, testnet)
    const current = extractStorageBagId(data)
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

// -----------------------------------------------------------------------
// Site record propagation poller
// TONAPI's resolver is known to be flaky for `dns_adnl_address` records
// (`sites: []` for famous .ton domains we cross-checked via on-chain
// `dnsresolve` — see docs/v0.6/sites-record-discovery.md). When it works,
// `data.sites` is an array of ADNL hex strings; when it lies, we surface a
// "verify manually" hint instead of looping forever.
// -----------------------------------------------------------------------

export async function pollDnsSiteRecord(
  domain: string,
  expectedAdnlHex: string,
  timeoutMs = 180_000,
  intervalMs = 10_000,
  testnet = false,
): Promise<boolean> {
  const spinner = ora('Waiting for site record to propagate...').start()
  const deadline = Date.now() + timeoutMs
  const expected = expectedAdnlHex.toLowerCase().replace(/^0x/, '')

  while (Date.now() < deadline) {
    const data = await getDnsResolved(domain, testnet)
    const sites = (data?.sites ?? []).map((s) => s.toLowerCase().replace(/^0x/, ''))
    if (sites.includes(expected)) {
      spinner.succeed('Site record confirmed on-chain!')
      return true
    }
    await sleep(intervalMs)
  }

  spinner.warn(
    'Site record not yet visible via TONAPI — TONAPI is known to lag/lie for `sites` records. The on-chain transaction may already be settled.',
  )
  console.log(chalk.dim('  Verify on-chain: node scripts/dns-probe.cjs (or open the .ton domain in TON Browser)'))
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
