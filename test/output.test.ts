import { describe, it, expect } from 'vitest'
import { buildUrls, siteGatewayUrl, exportAsJson, type DeployResult } from '../src/output'

describe('output', () => {
  describe('buildUrls', () => {
    it('should generate the ton:// URI for a bag ID', () => {
      const bagId = 'a3f9c82e1b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1'
      const result = buildUrls(bagId)

      expect(result.tonUrl).toBe(`ton://${bagId}`)
    })

    it('should NOT advertise a raw-bag ton.run gateway URL', () => {
      // Public gateways do not serve a raw bag id on-demand (ton.run/<bag>
      // returns 404 — verified 2026-06-21). buildUrls must not hand the
      // caller a dead link; the gateway URL only exists via a .ton domain.
      const result = buildUrls('abc123') as { tonUrl: string; fallbackUrl?: string }
      expect(result.fallbackUrl).toBeUndefined()
      expect(JSON.stringify(result)).not.toContain('ton.run')
    })
  })

  describe('siteGatewayUrl', () => {
    it('maps a .ton domain to its ton.run SITE gateway URL', () => {
      // The ton.run site gateway resolves dns_adnl_address over RLDP, so a
      // site-record deploy is browser-openable at <domain>.ton.run. (#70)
      expect(siteGatewayUrl('mysite.ton')).toBe('https://mysite.ton.run')
    })

    it('handles a subdomain', () => {
      expect(siteGatewayUrl('app.mysite.ton')).toBe('https://app.mysite.ton.run')
    })

    it('normalizes a shorthand domain (no .ton suffix) like the DNS path', () => {
      // The DNS path resolves `mysite` as `mysite.ton`, so the gateway URL must
      // match the written record — not `mysite.run`. (#70 Codex review)
      expect(siteGatewayUrl('mysite')).toBe('https://mysite.ton.run')
    })
  })

  describe('exportAsJson', () => {
    it('should export DeployResult as valid JSON', () => {
      const result: DeployResult = {
        bagId: 'abc123',
        tonUrl: 'ton://abc123',
      }

      const json = exportAsJson(result)
      const parsed = JSON.parse(json)

      expect(parsed).toEqual(result)
    })

    it('should include DNS records when present', () => {
      const result: DeployResult = {
        bagId: 'abc123',
        tonUrl: 'ton://abc123',
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
