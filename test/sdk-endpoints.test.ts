import { describe, expect, it } from 'vitest'
import { TONCENTER_ENDPOINTS, tonviewerTxUrl } from '../src/sdk/endpoints'

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
})
