import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression guard for the #139 fix (#146).
 *
 * Stage 3's on-chain prevention check reads TONAPI over a SETTLE WINDOW
 * (pollTonapiStorageMatch — 6 tries × 5s) rather than a single early read,
 * precisely so a failed-cancel broadcast that lands a few seconds late is
 * OBSERVED and reported FAIL/BLOCKED instead of being missed and false-PASSing.
 * The pure assessCancellation tests take `afterStorage` as a direct input, so
 * they never exercise how it is DERIVED. Reverting `tries: 6 → 1` would
 * re-introduce the #139 false-PASS with the whole suite still green — unless
 * this test locks the window.
 */
const require = createRequire(import.meta.url)
const { pollTonapiStorageMatch } = require('../scripts/e2e-mcp-deploy.cjs') as {
  pollTonapiStorageMatch: (
    domain: string,
    expectedBag: string,
    tries: number,
    intervalMs: number,
    testnet?: boolean,
  ) => Promise<{ matched: boolean; lastStorage: string | null }>
}

const BAG = '4a0130acfe6c658eac2d8cf3451251c2a037c05d528ae96d62b81347a73dd258'
const STALE = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef0'

afterEach(() => vi.unstubAllGlobals())

describe('pollTonapiStorageMatch — #139 settle-window regression (#146)', () => {
  it('does NOT early-stop on a stale read; catches a bag that lands a few reads later', async () => {
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls++
        // First two reads return the STALE pre-existing bag; the third returns
        // the expected bag (a failed-cancel broadcast landing a few seconds
        // late). A single early read — the pre-#139 bug — would see STALE and
        // false-PASS "prevented".
        const storage = calls >= 3 ? BAG : STALE
        return { ok: true, json: async () => ({ storage }) }
      }),
    )

    const res = await pollTonapiStorageMatch('x.ton', BAG, 6, 1, false)

    expect(res.matched).toBe(true)
    expect(calls).toBeGreaterThanOrEqual(3) // kept polling past the stale reads
  })

  it('returns matched:false with the last stale value when the bag never lands (the "prevented" case)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ storage: STALE }) })),
    )

    const res = await pollTonapiStorageMatch('x.ton', BAG, 3, 1, false)

    expect(res.matched).toBe(false)
    expect(res.lastStorage).toBe(STALE)
  })

  it('matched:false with lastStorage null when TONAPI never resolves (→ BLOCKED upstream)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    )

    const res = await pollTonapiStorageMatch('x.ton', BAG, 3, 1, false)

    expect(res.matched).toBe(false)
    expect(res.lastStorage).toBe(null)
  })
})
