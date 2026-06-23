import { describe, it, expect, vi, afterEach } from 'vitest'
import { redeployLog } from '../src/cli/deploy-tonutils'

// #99: under --json-output, watch-mode redeploy lines must NOT hit stdout
// (which carries the JSON stream). `--watch --json-output` is reachable: an
// explicit --watch overrides json-output's one-shot default in cli.ts.
describe('redeployLog — watch redeploy output channel (#99)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('routes to stderr and never stdout under --json-output (keeps the JSON stream clean)', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    redeployLog(true, '  ↻ Re-deployed: abc123')

    expect(out).not.toHaveBeenCalled()
    expect(err).toHaveBeenCalledTimes(1)
    expect(String(err.mock.calls[0][0])).toContain('Re-deployed')
    // a trailing newline is added so consumers can line-split stderr
    expect(String(err.mock.calls[0][0]).endsWith('\n')).toBe(true)
  })

  it('uses stdout when not in json mode', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    redeployLog(false, '  ↻ no-op (bag id unchanged: abc123…)')

    expect(out).toHaveBeenCalledTimes(1)
    expect(err).not.toHaveBeenCalled()
  })

  it('treats undefined jsonOutput as non-json (stdout)', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {})
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    redeployLog(undefined, '  ⚠ re-deploy failed: boom')

    expect(out).toHaveBeenCalledTimes(1)
    expect(err).not.toHaveBeenCalled()
  })
})
