import { describe, expect, it } from 'vitest'
import {
  siteGatewayUrl,
  storageOnlyViewabilityHint,
  TONCENTER_ENDPOINTS,
  tonviewerTxUrl,
} from '../src/sdk/endpoints'

describe('endpoints', () => {
  describe('TONCENTER_ENDPOINTS', () => {
    it('mainnet matches @ton/mcp default', () => {
      expect(TONCENTER_ENDPOINTS.mainnet).toBe('https://toncenter.com')
    })
    it('testnet matches @ton/mcp default', () => {
      expect(TONCENTER_ENDPOINTS.testnet).toBe('https://testnet.toncenter.com')
    })
  })

  describe('tonviewerTxUrl', () => {
    const hash64 = '0x' + 'ab'.repeat(32)

    it('mainnet by default', () => {
      expect(tonviewerTxUrl(hash64)).toBe(
        `https://tonviewer.com/transaction/${'ab'.repeat(32)}`,
      )
    })

    it('testnet flag → testnet subdomain', () => {
      expect(tonviewerTxUrl(hash64, true)).toBe(
        `https://testnet.tonviewer.com/transaction/${'ab'.repeat(32)}`,
      )
    })

    it('strips a leading 0x', () => {
      const url = tonviewerTxUrl('0xdeadbeef')
      expect(url).toBe('https://tonviewer.com/transaction/deadbeef')
    })

    it('strips a leading 0X (upper-case)', () => {
      const url = tonviewerTxUrl('0XCAFE1234')
      expect(url).toBe('https://tonviewer.com/transaction/CAFE1234')
    })

    it('accepts bare hex without prefix', () => {
      const url = tonviewerTxUrl('feedface')
      expect(url).toBe('https://tonviewer.com/transaction/feedface')
    })
  })

  describe('siteGatewayUrl (#118 — moved here from output.ts)', () => {
    it('appends .run to a full .ton domain', () => {
      expect(siteGatewayUrl('mysite.ton')).toBe('https://mysite.ton.run')
    })
    it('normalizes a shorthand label to <label>.ton.run', () => {
      expect(siteGatewayUrl('mysite')).toBe('https://mysite.ton.run')
    })
    it('keeps a subdomain', () => {
      expect(siteGatewayUrl('app.mysite.ton')).toBe('https://app.mysite.ton.run')
    })
    it('lowercases a cased .TON suffix (#118 / Codex P3)', () => {
      expect(siteGatewayUrl('Example.TON')).toBe('https://example.ton.run')
    })
  })

  describe('storageOnlyViewabilityHint (#118)', () => {
    it('describes the storage-only write + the would-be ton.run URL (mainnet)', () => {
      const hint = storageOnlyViewabilityHint({ domain: 'masashi-ono0611.ton', seedStatus: 'seeding' })
      expect(hint).toContain('did NOT write a site (ADNL) record')
      expect(hint).toContain('not browser-openable')
      expect(hint).toContain('https://masashi-ono0611.ton.run')
      expect(hint).toContain('mesh_site_record')
    })

    it('does not assert the current site state (a prior site record is left intact) (#118 / Codex P2)', () => {
      const hint = storageOnlyViewabilityHint({ domain: 'x.ton', seedStatus: 'seeding' })
      // describes what THIS call did, conditions browsability on "Without a site record"
      expect(hint).toContain('Without a site record')
      expect(hint).toContain('left intact')
    })

    it('omits the mainnet-only ton.run URL for a testnet deploy (#118 / Codex P2)', () => {
      const hint = storageOnlyViewabilityHint({ domain: 'x.ton', seedStatus: 'seeding', testnet: true })
      expect(hint).toContain('did NOT write a site (ADNL) record')
      expect(hint).not.toContain('.ton.run')
      expect(hint).toContain('mainnet-only')
      expect(hint).toContain('mesh_site_record')
    })

    it('adds a "nothing seeding" note when the daemon is stopped', () => {
      const hint = storageOnlyViewabilityHint({ domain: 'x.ton', seedStatus: 'stopped' })
      expect(hint).toContain('seed_status=stopped')
      expect(hint).toContain('not retrievable')
    })

    it('omits the seeding note when still seeding', () => {
      const hint = storageOnlyViewabilityHint({ domain: 'x.ton', seedStatus: 'seeding' })
      expect(hint).not.toContain('seed_status=stopped')
    })
  })
})
