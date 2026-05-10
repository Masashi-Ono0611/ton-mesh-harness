import { describe, it, expect } from 'vitest'
import { buildUrls, exportAsJson, type DeployResult } from '../src/output'

describe('output', () => {
  describe('buildUrls', () => {
    it('should generate correct URLs for a bag ID', () => {
      const bagId = 'a3f9c82e1b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1'
      const result = buildUrls(bagId)

      expect(result.tonUrl).toBe(`ton://${bagId}`)
      expect(result.fallbackUrl).toBe(`https://ton.run/${bagId}`)
    })

    it('should handle lowercase bag IDs', () => {
      const bagId = 'abc123'
      const result = buildUrls(bagId)

      expect(result.tonUrl).toBe('ton://abc123')
      expect(result.fallbackUrl).toBe('https://ton.run/abc123')
    })
  })

  describe('exportAsJson', () => {
    it('should export DeployResult as valid JSON', () => {
      const result: DeployResult = {
        bagId: 'abc123',
        tonUrl: 'ton://abc123',
        fallbackUrl: 'https://ton.run/abc123',
      }

      const json = exportAsJson(result)
      const parsed = JSON.parse(json)

      expect(parsed).toEqual(result)
    })

    it('should include DNS records when present', () => {
      const result: DeployResult = {
        bagId: 'abc123',
        tonUrl: 'ton://abc123',
        fallbackUrl: 'https://ton.run/abc123',
        dns: {
          domain: 'myprotocol.ton',
          txHash: 'tx123',
        },
      }

      const json = exportAsJson(result)
      const parsed = JSON.parse(json)

      expect(parsed.dns).toEqual({
        domain: 'myprotocol.ton',
        txHash: 'tx123',
      })
    })

  })
})
