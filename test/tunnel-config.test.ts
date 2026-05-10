import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir, homedir } from 'os'
import { join } from 'path'
import path from 'path'
import { resolveTunnelConfig } from '../src/cli/deploy-tonutils'

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'sdk-tunnel-cfg-'))
})
afterEach(() => {
  try { rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
})

describe('resolveTunnelConfig', () => {
  it('throws when the file does not exist', () => {
    expect(() => resolveTunnelConfig(join(workDir, 'missing.json')))
      .toThrow(/file not found/)
  })

  it('throws on invalid JSON', () => {
    const p = join(workDir, 'broken.json')
    writeFileSync(p, '{ not actually json')
    expect(() => resolveTunnelConfig(p))
      .toThrow(/could not parse/)
  })

  it('throws when NodesPool is missing or empty', () => {
    const p1 = join(workDir, 'empty.json')
    writeFileSync(p1, '{}')
    expect(() => resolveTunnelConfig(p1))
      .toThrow(/zero entries/)

    const p2 = join(workDir, 'empty-array.json')
    writeFileSync(p2, JSON.stringify({ NodesPool: [] }))
    expect(() => resolveTunnelConfig(p2))
      .toThrow(/zero entries/)
  })

  it('returns absolute path + node count for a valid pool (PascalCase NodesPool)', () => {
    const p = join(workDir, 'good.json')
    writeFileSync(p, JSON.stringify({
      NodesPool: [
        { Key: 'aaa==' },
        { Key: 'bbb==' },
      ],
    }))
    const result = resolveTunnelConfig(p)
    expect(result.nodeCount).toBe(2)
    expect(result.absPath).toBe(path.resolve(p))
    // Cross-platform absolute-path check: on Windows resolve() returns
    // drive-letter paths like C:\... that don't start with '/'.
    expect(path.isAbsolute(result.absPath)).toBe(true)
  })

  it('also accepts snake_case nodes_pool (defensive)', () => {
    const p = join(workDir, 'snake.json')
    writeFileSync(p, JSON.stringify({
      nodes_pool: [{ key: 'a' }],
    }))
    const result = resolveTunnelConfig(p)
    expect(result.nodeCount).toBe(1)
  })

  it('expands ~ to the home directory', () => {
    // Negative test: resolving ~/sdk-test-tunnel-DOES-NOT-EXIST should
    // produce an absPath under homedir, not under CWD/literal-~.
    expect(() => resolveTunnelConfig('~/sdk-test-tunnel-DOES-NOT-EXIST.json'))
      .toThrow(new RegExp(`file not found at ${homedir().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`))
  })
})
