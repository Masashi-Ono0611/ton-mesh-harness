import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildStartupDiagnostic } from '../../src/daemon/rldp-http-proxy-process'

function tmpLog(contents: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'tsdk-diag-'))
  const p = path.join(dir, 'proxy.log')
  writeFileSync(p, contents)
  return p
}

describe('buildStartupDiagnostic (#75)', () => {
  it('returns a clear "nothing captured" note when there is no log or output', () => {
    const missing = path.join(tmpdir(), 'tsdk-diag-does-not-exist', 'proxy.log')
    expect(buildStartupDiagnostic(missing, '')).toBe(' (no proxy.log or stderr captured)')
  })

  it('inlines the proxy.log tail when present', () => {
    const logPath = tmpLog('startup line\nkey not in db\n')
    const diag = buildStartupDiagnostic(logPath, '')
    expect(diag).toContain('--- proxy.log (tail) ---')
    expect(diag).toContain('key not in db')
  })

  it('inlines captured stdout/stderr when present', () => {
    const missing = path.join(tmpdir(), 'tsdk-diag-none', 'proxy.log')
    const diag = buildStartupDiagnostic(missing, 'FATAL: bind: address not available')
    expect(diag).toContain('--- proxy stdout/stderr ---')
    expect(diag).toContain('bind: address not available')
  })

  it('truncates a large log to a tail (does not dump the whole file)', () => {
    const big = 'x'.repeat(10_000) + '\nLAST_LINE_MARKER\n'
    const diag = buildStartupDiagnostic(tmpLog(big), '')
    expect(diag).toContain('LAST_LINE_MARKER')
    expect(diag.length).toBeLessThan(7_000) // 4k log tail + 2k output cap + headers
  })

  it('combines log + output into one diagnostic block', () => {
    const diag = buildStartupDiagnostic(tmpLog('logged cause\n'), 'stderr cause')
    expect(diag).toContain('logged cause')
    expect(diag).toContain('stderr cause')
  })
})
