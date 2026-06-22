import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Address, Cell } from '@ton/ton'

// Partial mock: replace only getDomainNftAddress (network) — keep the real
// buildChangeDnsSiteRecordBody so the body cell / deeplink is genuinely built.
const mocks = vi.hoisted(() => ({
  getNftMock: vi.fn(),
}))

vi.mock('../src/dns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/dns')>()
  return { ...actual, getDomainNftAddress: mocks.getNftMock }
})

// siteRecord pulls dns-helpers → resolve-tx → @ton/walletkit, whose ESM
// packaging trips Node's directory-import resolver at raw-source test time
// (prod bundles it via tsup noExternal). siteRecord never broadcasts, so it
// doesn't use resolve-tx — stub it to cut the import chain, matching
// test/sdk-dns-helpers.test.ts.
vi.mock('../src/sdk/resolve-tx', () => ({
  resolveTxHashFromMessageHash: vi.fn(),
}))

import { siteRecord } from '../src/sdk/site-record'
import { SdkError } from '../src/sdk/deploy'

const NFT = Address.parse('EQBiljuUGzy22nyjVFMUThBvf7BIOpfU6ZQXDWXsWadybwPe')
const ADNL = 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516'

describe('siteRecord()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => vi.restoreAllMocks())

  it('rejects a non-hex ADNL with ERR_INVALID_INPUT (before any network call)', async () => {
    await expect(siteRecord({ domain: 'x.ton', site_adnl: 'deadbeef' })).rejects.toThrowError(
      SdkError,
    )
    expect(mocks.getNftMock).not.toHaveBeenCalled()
  })

  it('rejects a missing domain with ERR_INVALID_INPUT', async () => {
    await expect(siteRecord({ site_adnl: ADNL } as never)).rejects.toThrowError(SdkError)
  })

  it('resolves the NFT and builds a site-only deeplink whose bin round-trips to the body', async () => {
    mocks.getNftMock.mockResolvedValueOnce(NFT)
    const r = await siteRecord({ domain: 'mysite.ton', site_adnl: ADNL })
    expect(r.domain).toBe('mysite.ton')
    expect(r.record).toBe('site')
    expect(r.nft_address).toBe(NFT.toString({ testOnly: false }))
    expect(r.site_adnl).toBe(ADNL)
    expect(r.amount_nano).toBe('20000000')

    const url = new URL(r.tonkeeper_deeplink)
    expect(url.host).toBe('app.tonkeeper.com')
    const bin = url.searchParams.get('bin')!
    expect(bin).toBe(r.body_boc_base64url)
    const decoded = Cell.fromBoc(Buffer.from(bin, 'base64url'))[0]
    expect(decoded.beginParse().loadUint(32)).toBe(0x4eb1f0f9) // change_dns_record op
  })

  it('canonicalizes a 0x-prefixed uppercase ADNL to lowercase, no prefix', async () => {
    mocks.getNftMock.mockResolvedValueOnce(NFT)
    const r = await siteRecord({ domain: 'mysite.ton', site_adnl: '0x' + ADNL.toUpperCase() })
    expect(r.site_adnl).toBe(ADNL)
  })

  it('accepts an uppercase 0X prefix (Codex P3 regression)', async () => {
    mocks.getNftMock.mockResolvedValueOnce(NFT)
    const r = await siteRecord({ domain: 'mysite.ton', site_adnl: '0X' + ADNL })
    expect(r.site_adnl).toBe(ADNL)
  })

  it('appends .ton when the domain lacks the suffix', async () => {
    mocks.getNftMock.mockResolvedValueOnce(NFT)
    const r = await siteRecord({ domain: 'mysite', site_adnl: ADNL })
    expect(r.domain).toBe('mysite.ton')
  })

  it('maps NFT resolution failure to ERR_NO_DOMAIN', async () => {
    mocks.getNftMock.mockRejectedValueOnce(new Error('Not found'))
    await expect(siteRecord({ domain: 'nope.ton', site_adnl: ADNL })).rejects.toMatchObject({
      code: 'ERR_NO_DOMAIN',
    })
  })

  it('encodes the NFT in testnet form when testnet=true', async () => {
    mocks.getNftMock.mockResolvedValue(NFT)
    const main = await siteRecord({ domain: 'mysite.ton', site_adnl: ADNL, testnet: false })
    const test = await siteRecord({ domain: 'mysite.ton', site_adnl: ADNL, testnet: true })
    expect(test.nft_address).not.toBe(main.nft_address)
    expect(test.nft_address).toBe(NFT.toString({ testOnly: true }))
  })
})
