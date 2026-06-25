/**
 * Authoritative ON-CHAIN read of a `.ton` domain's `storage` DNS record, used
 * to confirm a deploy landed when TONAPI's (flaky, cache-lagged) `/dns/resolve`
 * propagation poll times out (#119).
 *
 * It calls the domain NFT's `dnsresolve` get-method via Toncenter — independent
 * of TONAPI — and parses the returned `dns_storage_address#7473 bag:bits256`
 * record. Crucially this verifies the NFT's record itself, NOT the signing
 * wallet's transaction: a resolved wallet tx only proves the wallet broadcast
 * was indexed, not that the `change_dns_record` action succeeded (e.g. a
 * non-owner wallet's tx still indexes while the DNS never changes).
 *
 * Encoding proven against masashi-ono0611.ton on 2026-06-26:
 *   dnsresolve(`\0` slice, sha256("storage")) → (8, dns_storage_address#7473 bag:bits256)
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { Address, beginCell } from '@ton/core'
import { TonClient } from '@ton/ton'
import { createHash } from 'node:crypto'
import type { AgenticNetwork } from './agentic-config'
import { TONCENTER_ENDPOINTS } from './endpoints'

/** sha256("storage") as a 256-bit int — the TON DNS record key for storage. */
const STORAGE_RECORD_KEY = BigInt('0x' + createHash('sha256').update('storage').digest('hex'))

/** TEP-81 `dns_storage_address` magic prefix. */
const DNS_STORAGE_MAGIC = 0x7473

/**
 * Resolve the domain NFT's on-chain `storage` record to its bag id (lowercased
 * 64-hex), or `null` on any error / missing-or-non-storage record. Best-effort:
 * never throws — the caller treats `null` as "could not confirm on-chain".
 */
export async function resolveStorageRecordOnChain(args: {
  nftAddress: Address
  network: AgenticNetwork
  toncenterApiKey?: string
}): Promise<string | null> {
  try {
    const client = new TonClient({
      endpoint: `${TONCENTER_ENDPOINTS[args.network]}/api/v2/jsonRPC`,
      apiKey: args.toncenterApiKey,
    })
    // subdomain = a single `\0` (8 zero bits) → the domain's OWN records.
    const subdomain = beginCell().storeUint(0, 8).endCell()
    const res = await client.runMethod(args.nftAddress, 'dnsresolve', [
      { type: 'slice', cell: subdomain },
      { type: 'int', value: STORAGE_RECORD_KEY },
    ])
    res.stack.readNumber() // resolved bits (8 for the self record) — not asserted
    const value = res.stack.readCellOpt()
    if (!value) return null
    const cs = value.beginParse()
    if (cs.remainingBits < 16 + 256) return null
    if (cs.loadUint(16) !== DNS_STORAGE_MAGIC) return null // not a dns_storage_address record
    return cs.loadUintBig(256).toString(16).padStart(64, '0')
  } catch {
    return null
  }
}

/**
 * True iff the domain's on-chain `storage` record points at `expectedBag`.
 * `null`-safe (a failed on-chain read is `false`, never a throw).
 */
export async function storageRecordMatchesOnChain(args: {
  nftAddress: Address
  network: AgenticNetwork
  expectedBag: string
  toncenterApiKey?: string
}): Promise<boolean> {
  const onChain = await resolveStorageRecordOnChain(args)
  return onChain !== null && onChain === args.expectedBag.toLowerCase()
}
