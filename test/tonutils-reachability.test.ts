import { describe, expect, it } from 'vitest'
import { parseServerMode } from '../src/daemon/tonutils-process'

/**
 * #68: the kit's only honest deploy-time reachability signal is the
 * tonutils-storage daemon's own port-checker verdict ("server mode: …"),
 * parsed out of its startup log. Public gateways / TONAPI do not index raw
 * self-hosted bags, so they cannot confirm a bag is actually downloadable.
 */
describe('parseServerMode (daemon reachability verdict, #68)', () => {
  it('reads "server mode: true" as publicly reachable', () => {
    expect(parseServerMode('Storage started, server mode: true')).toBe(true)
  })

  it('reads "server mode: false" as download-only', () => {
    expect(parseServerMode('Storage started, server mode: false')).toBe(false)
  })

  it('parses the real ANSI-coloured success line', () => {
    const line = '[30;42m SUCCESS [0m [32mStorage started, server mode: true[0m'
    expect(parseServerMode(line)).toBe(true)
  })

  it('parses the real ANSI-coloured download-only line', () => {
    const line = '[30;42m SUCCESS [0m [32mStorage started, server mode: false[0m'
    expect(parseServerMode(line)).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(parseServerMode('Server Mode: TRUE')).toBe(true)
  })

  it('finds the verdict inside a larger multi-line startup buffer', () => {
    const buf = [
      'Resolving port checker...',
      'Using port checker tonutils.com at 31.172.68.159',
      ' SUCCESS  Storage started, server mode: true',
      ' SUCCESS  Storage HTTP API on 127.0.0.1:7700',
    ].join('\n')
    expect(parseServerMode(buf)).toBe(true)
  })

  it('returns null when no verdict is present (unknown — never "unreachable")', () => {
    expect(parseServerMode('some unrelated startup log\nVersion: v1.5.1')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(parseServerMode('')).toBeNull()
  })
})
