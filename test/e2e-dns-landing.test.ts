import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

/**
 * Unit tests for the e2e gate's DNS-landing verdict (#117).
 *
 * The driver is a CommonJS script (scripts/e2e-mcp-deploy.cjs); we pull the
 * pure `assessDnsLanding` helper out of it via createRequire. The script's
 * `require.main === module` guard keeps `main()` from running on import.
 */
const require = createRequire(import.meta.url)
const { assessDnsLanding, assessCancellation } = require('../scripts/e2e-mcp-deploy.cjs') as {
  assessDnsLanding: (args: {
    domain: string | null
    result: { bag_id?: string; dns_tx_hash?: string | null; next_actions?: { description?: string }[] }
    tonapiMatched: boolean
    lastStorage?: string | null
  }) => { verdict: 'PASS' | 'FAIL' | 'BLOCKED'; reason: string }
  assessCancellation: (args: {
    leaked: string[]
    cancelledBag: string | null
    afterStorage: string | null
    cancelledPreBroadcast: boolean
  }) => { verdict: 'PASS' | 'FAIL' | 'BLOCKED'; reason: string }
}

const BAG = '4a0130acfe6c658eac2d8cf3451251c2a037c05d528ae96d62b81347a73dd258'
const OTHER = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef0'

describe('assessDnsLanding (e2e DNS-landing gate, #117)', () => {
  it('PASS when TONAPI confirmed the bag even though dns_tx_hash is null (the 2026-06-25 false-negative)', () => {
    const r = assessDnsLanding({
      domain: 'masashi-ono0611.ton',
      result: {
        bag_id: BAG,
        dns_tx_hash: null,
        next_actions: [{ description: 'DNS write submitted via TonConnect. Signed-message BOC (NOT the on-chain tx hash): te6…' }],
      },
      tonapiMatched: true,
    })
    expect(r.verdict).toBe('PASS')
  })

  it('PASS when TONAPI confirmed the bag and a non-null hash is present', () => {
    const r = assessDnsLanding({
      domain: 'x.ton',
      result: { bag_id: BAG, dns_tx_hash: '0xabc' },
      tonapiMatched: true,
    })
    expect(r.verdict).toBe('PASS')
  })

  it('BLOCKED (not FAIL) when TONAPI only ever returned a STALE different bag but the deploy reached done (Codex P2)', () => {
    const r = assessDnsLanding({
      domain: 'x.ton',
      result: {
        bag_id: BAG,
        dns_tx_hash: null,
        next_actions: [{ description: 'DNS write confirmed on-chain. Tx hash: 0xfeed…' }],
      },
      tonapiMatched: false,
      lastStorage: OTHER,
    })
    expect(r.verdict).toBe('BLOCKED')
  })

  it('BLOCKED when TONAPI was unreachable but the deploy reached done with a DNS-write pointer', () => {
    const r = assessDnsLanding({
      domain: 'x.ton',
      result: {
        bag_id: BAG,
        dns_tx_hash: null,
        next_actions: [{ description: 'DNS write confirmed on-chain. Tx hash: 0xfeed…' }],
      },
      tonapiMatched: false,
      lastStorage: null,
    })
    expect(r.verdict).toBe('BLOCKED')
  })

  it('BLOCKED via a non-null dns_tx_hash when TONAPI did not confirm', () => {
    const r = assessDnsLanding({
      domain: 'x.ton',
      result: { bag_id: BAG, dns_tx_hash: '0xabc', next_actions: [] },
      tonapiMatched: false,
      lastStorage: null,
    })
    expect(r.verdict).toBe('BLOCKED')
  })

  it('FAIL when TONAPI did not confirm AND there is no DNS-write pointer at all', () => {
    const r = assessDnsLanding({
      domain: 'x.ton',
      result: { bag_id: BAG, dns_tx_hash: null, next_actions: [] },
      tonapiMatched: false,
      lastStorage: null,
    })
    expect(r.verdict).toBe('FAIL')
  })

  it('PASS for a storage-only deploy (no domain) regardless of hash', () => {
    const r = assessDnsLanding({
      domain: null,
      result: { bag_id: BAG, dns_tx_hash: null },
      tonapiMatched: false,
    })
    expect(r.verdict).toBe('PASS')
  })
})

describe('assessCancellation (e2e Stage 3 cancellation gate, #123)', () => {
  it('FAIL when a daemon leaked after the cancel (cleanup hygiene)', () => {
    const r = assessCancellation({
      leaked: ['12345 tonutils-storage'],
      cancelledBag: BAG,
      afterStorage: OTHER,
      cancelledPreBroadcast: true,
    })
    expect(r.verdict).toBe('FAIL')
  })

  it('PASS (daemon-hygiene only) when cancelled before a bag was created', () => {
    const r = assessCancellation({
      leaked: [],
      cancelledBag: null,
      afterStorage: null,
      cancelledPreBroadcast: true,
    })
    expect(r.verdict).toBe('PASS')
  })

  it('PASS when no leak and the cancelled bag did NOT become the resolved storage', () => {
    const r = assessCancellation({
      leaked: [],
      cancelledBag: BAG,
      afterStorage: OTHER, // domain still resolves to a different (pre-existing) bag
      cancelledPreBroadcast: true,
    })
    expect(r.verdict).toBe('PASS')
  })

  it('matches the cancelled bag case-insensitively (FAIL on a pre-broadcast landing)', () => {
    const r = assessCancellation({
      leaked: [],
      cancelledBag: BAG.toUpperCase(),
      afterStorage: BAG, // lowercase resolved value equals the (upper) cancelled bag
      cancelledPreBroadcast: true,
    })
    expect(r.verdict).toBe('FAIL')
  })

  it('FAIL when cancelled BEFORE the broadcast yet the bag landed (cancellation failed)', () => {
    const r = assessCancellation({
      leaked: [],
      cancelledBag: BAG,
      afterStorage: BAG,
      cancelledPreBroadcast: true,
    })
    expect(r.verdict).toBe('FAIL')
  })

  it('BLOCKED (not FAIL) when cancelled AFTER the broadcast and the bag landed (may_have_published)', () => {
    const r = assessCancellation({
      leaked: [],
      cancelledBag: BAG,
      afterStorage: BAG,
      cancelledPreBroadcast: false,
    })
    expect(r.verdict).toBe('BLOCKED')
  })

  it('BLOCKED when TONAPI could not resolve the domain to confirm prevention', () => {
    const r = assessCancellation({
      leaked: [],
      cancelledBag: BAG,
      afterStorage: null,
      cancelledPreBroadcast: true,
    })
    expect(r.verdict).toBe('BLOCKED')
  })
})
