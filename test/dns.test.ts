import { describe, it, expect } from 'vitest'
import {
  buildDnsStorageRecord,
  buildChangeDnsRecordBody,
  buildDnsAdnlRecord,
  buildChangeDnsSiteRecordBody,
} from '../src/dns'

const SAMPLE_BAG_ID = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
const SAMPLE_ADNL = 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516'

describe('buildDnsStorageRecord', () => {
  it('returns a cell with 0x7473 magic prefix', () => {
    const cell = buildDnsStorageRecord(SAMPLE_BAG_ID)
    // First 16 bits should be 0x7473 = 29811
    const slice = cell.beginParse()
    expect(slice.loadUint(16)).toBe(0x7473)
  })

  it('embeds the bag ID bytes after the magic prefix', () => {
    const cell = buildDnsStorageRecord(SAMPLE_BAG_ID)
    const slice = cell.beginParse()
    slice.loadUint(16) // skip magic
    const bagIdBuf = slice.loadBuffer(32)
    expect(bagIdBuf.toString('hex')).toBe(SAMPLE_BAG_ID)
  })

  it('throws on invalid bag ID length', () => {
    expect(() => buildDnsStorageRecord('deadbeef')).toThrow('Invalid bag ID length')
  })
})

describe('buildChangeDnsRecordBody', () => {
  it('starts with op 0x4eb1f0f9', () => {
    const cell = buildChangeDnsRecordBody(SAMPLE_BAG_ID)
    const slice = cell.beginParse()
    expect(slice.loadUint(32)).toBe(0x4eb1f0f9)
  })

  it('has queryId = 0', () => {
    const cell = buildChangeDnsRecordBody(SAMPLE_BAG_ID)
    const slice = cell.beginParse()
    slice.loadUint(32) // op
    expect(slice.loadUintBig(64)).toBe(0n)
  })

  it('encodes SHA256("storage") as record key', () => {
    const { createHash } = require('crypto')
    const expectedKey = BigInt('0x' + createHash('sha256').update('storage').digest('hex'))

    const cell = buildChangeDnsRecordBody(SAMPLE_BAG_ID)
    const slice = cell.beginParse()
    slice.loadUint(32)       // op
    slice.loadUintBig(64)    // queryId
    const key = slice.loadUintBig(256)
    expect(key).toBe(expectedKey)
  })

  it('includes a value ref cell', () => {
    const cell = buildChangeDnsRecordBody(SAMPLE_BAG_ID)
    expect(cell.refs.length).toBe(1)
  })

  it('can be serialized to BoC', () => {
    const cell = buildChangeDnsRecordBody(SAMPLE_BAG_ID)
    const boc = cell.toBoc()
    expect(boc.length).toBeGreaterThan(0)
  })
})

describe('buildDnsAdnlRecord', () => {
  it('returns a cell with 0xad01 magic prefix', () => {
    const cell = buildDnsAdnlRecord(SAMPLE_ADNL)
    const slice = cell.beginParse()
    expect(slice.loadUint(16)).toBe(0xad01)
  })

  it('embeds the ADNL identity bytes after the magic prefix', () => {
    const cell = buildDnsAdnlRecord(SAMPLE_ADNL)
    const slice = cell.beginParse()
    slice.loadUint(16) // skip magic
    const adnlBuf = slice.loadBuffer(32)
    expect(adnlBuf.toString('hex')).toBe(SAMPLE_ADNL)
  })

  it('encodes flags as a single uint8 trailer (default 0)', () => {
    const cell = buildDnsAdnlRecord(SAMPLE_ADNL)
    const slice = cell.beginParse()
    slice.loadUint(16)        // magic
    slice.loadBuffer(32)      // adnl
    expect(slice.loadUint(8)).toBe(0)
  })

  it('rejects flags = 1 in v0.6 (proto_list path is unsupported)', () => {
    // TEP-0081 requires a proto_list cell to follow when flags=1; building
    // without it would produce a malformed record. v0.6 ships flags=0 only.
    expect(() => buildDnsAdnlRecord(SAMPLE_ADNL, 1)).toThrow(/Invalid ADNL flags/)
  })

  it('strips an optional 0x prefix (lowercase)', () => {
    const cell = buildDnsAdnlRecord('0x' + SAMPLE_ADNL)
    const slice = cell.beginParse()
    slice.loadUint(16)
    expect(slice.loadBuffer(32).toString('hex')).toBe(SAMPLE_ADNL)
  })

  it('strips an optional 0X prefix (uppercase)', () => {
    const cell = buildDnsAdnlRecord('0X' + SAMPLE_ADNL.toUpperCase())
    const slice = cell.beginParse()
    slice.loadUint(16)
    expect(slice.loadBuffer(32).toString('hex')).toBe(SAMPLE_ADNL)
  })

  it('rejects non-hex / wrong-length input', () => {
    expect(() => buildDnsAdnlRecord('deadbeef')).toThrow(/Invalid ADNL/)
    expect(() => buildDnsAdnlRecord('z'.repeat(64))).toThrow(/Invalid ADNL/)
  })

  it('rejects out-of-range flags', () => {
    expect(() => buildDnsAdnlRecord(SAMPLE_ADNL, 2)).toThrow(/Invalid ADNL flags/)
    expect(() => buildDnsAdnlRecord(SAMPLE_ADNL, -1)).toThrow(/Invalid ADNL flags/)
  })
})

describe('buildChangeDnsSiteRecordBody', () => {
  it('starts with op 0x4eb1f0f9', () => {
    const cell = buildChangeDnsSiteRecordBody(SAMPLE_ADNL)
    const slice = cell.beginParse()
    expect(slice.loadUint(32)).toBe(0x4eb1f0f9)
  })

  it('encodes SHA256("site") as record key', () => {
    const { createHash } = require('crypto')
    const expectedKey = BigInt('0x' + createHash('sha256').update('site').digest('hex'))

    const cell = buildChangeDnsSiteRecordBody(SAMPLE_ADNL)
    const slice = cell.beginParse()
    slice.loadUint(32)       // op
    slice.loadUintBig(64)    // queryId
    const key = slice.loadUintBig(256)
    expect(key).toBe(expectedKey)
  })

  it('value ref carries the dns_adnl_address cell', () => {
    const cell = buildChangeDnsSiteRecordBody(SAMPLE_ADNL)
    expect(cell.refs.length).toBe(1)
    const ref = cell.refs[0].beginParse()
    expect(ref.loadUint(16)).toBe(0xad01)
    expect(ref.loadBuffer(32).toString('hex')).toBe(SAMPLE_ADNL)
    expect(ref.loadUint(8)).toBe(0)
  })

  it('storage and site keys are different', () => {
    const storage = buildChangeDnsRecordBody(SAMPLE_BAG_ID)
    const site = buildChangeDnsSiteRecordBody(SAMPLE_ADNL)
    const storageSlice = storage.beginParse()
    storageSlice.loadUint(32); storageSlice.loadUintBig(64)
    const storageKey = storageSlice.loadUintBig(256)
    const siteSlice = site.beginParse()
    siteSlice.loadUint(32); siteSlice.loadUintBig(64)
    const siteKey = siteSlice.loadUintBig(256)
    expect(storageKey).not.toBe(siteKey)
  })
})
