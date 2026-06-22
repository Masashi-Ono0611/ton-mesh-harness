import { describe, it, expect } from 'vitest'
import { Address, Cell } from '@ton/ton'
import { buildTonkeeperTransferDeeplink, toBase64Url } from '../src/deeplink'
import { buildChangeDnsSiteRecordBody } from '../src/dns'

const SAMPLE_ADNL = 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516'
// A real-shaped mainnet contract address (raw form → parsed below).
const SAMPLE_NFT = Address.parse('EQDrjaLahLkMB-hMCmkzOyBuHJ139ZUYmPHu6RRBKnbdLIYI')

describe('toBase64Url', () => {
  it('produces URL-safe output with no padding', () => {
    // 0xff 0xfe 0xfd → standard base64 "//79" → url-safe "__79", no '='.
    expect(toBase64Url(Buffer.from([0xff, 0xfe, 0xfd]))).toBe('__79')
  })

  it('round-trips back to the original bytes', () => {
    const buf = Buffer.from('the quick brown fox jumps over', 'utf8')
    const encoded = toBase64Url(buf)
    expect(encoded).not.toMatch(/[+/=]/)
    const decoded = Buffer.from(encoded, 'base64url')
    expect(decoded.equals(buf)).toBe(true)
  })

  it('handles empty input', () => {
    expect(toBase64Url(Buffer.alloc(0))).toBe('')
  })
})

describe('buildTonkeeperTransferDeeplink', () => {
  const body = buildChangeDnsSiteRecordBody(SAMPLE_ADNL)

  it('uses the Tonkeeper transfer universal-link base', () => {
    const url = buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 20_000_000n, body })
    expect(url.startsWith('https://app.tonkeeper.com/transfer/')).toBe(true)
  })

  it('embeds the bounceable, url-safe NFT address in the path', () => {
    const url = buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 20_000_000n, body })
    const path = new URL(url).pathname.split('/').pop()!
    const expected = SAMPLE_NFT.toString({ urlSafe: true, bounceable: true, testOnly: false })
    expect(path).toBe(expected)
  })

  it('sets amount (nano) and a body `bin` param', () => {
    const url = new URL(buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 20_000_000n, body }))
    expect(url.searchParams.get('amount')).toBe('20000000')
    expect(url.searchParams.get('bin')).toBeTruthy()
  })

  it('the `bin` param decodes back to the exact message body cell', () => {
    const url = new URL(buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 20_000_000n, body }))
    const bin = url.searchParams.get('bin')!
    const decoded = Cell.fromBoc(Buffer.from(bin, 'base64url'))[0]
    expect(decoded.equals(body)).toBe(true)
    // And it is genuinely a change_dns_record for the `site` key.
    const slice = decoded.beginParse()
    expect(slice.loadUint(32)).toBe(0x4eb1f0f9)
  })

  it('does not percent-encode the url-safe query (bin stays raw base64url)', () => {
    const url = buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 20_000_000n, body })
    const rawBin = url.split('bin=')[1]
    expect(rawBin).not.toMatch(/%/)
    expect(rawBin).not.toMatch(/[+/=]/)
  })

  it('encodes the address in testnet form when testnet=true', () => {
    const main = buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 20_000_000n, body })
    const test = buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 20_000_000n, body, testnet: true })
    expect(test).not.toBe(main)
    const testPath = new URL(test).pathname.split('/').pop()!
    expect(testPath).toBe(SAMPLE_NFT.toString({ urlSafe: true, bounceable: true, testOnly: true }))
  })

  it('rejects a non-positive amount', () => {
    expect(() => buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: 0n, body })).toThrow(/positive/)
    expect(() => buildTonkeeperTransferDeeplink({ to: SAMPLE_NFT, amountNano: -1n, body })).toThrow(/positive/)
  })
})
