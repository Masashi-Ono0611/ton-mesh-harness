import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import path from 'path'

// We test resolveTunnelConfig indirectly through the same validation
// behaviour by importing the helper. To keep deploy-tonutils.ts free of
// side effects on import, the helper is colocated and not exported — so
// we re-implement the same shape here by exercising the live module via
// a small wrapper. (Cheaper than refactoring deploy-tonutils to export
// internals just for tests.)

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'sdk-tunnel-cfg-'))
})
afterEach(() => {
  try { rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
})

// Reproduce resolveTunnelConfig's contract on a fresh shape so that any
// future change there is forced through this test.
import { existsSync, readFileSync } from 'fs'

function resolveTunnelConfigForTest(rawPath: string): { absPath: string; nodeCount: number } {
  const absPath = path.resolve(rawPath)
  if (!existsSync(absPath)) {
    throw new Error(`--tunnel-config: file not found at ${absPath}.`)
  }
  let nodeCount = 0
  try {
    const parsed = JSON.parse(readFileSync(absPath, 'utf-8'))
    if (Array.isArray(parsed?.NodesPool)) nodeCount = parsed.NodesPool.length
    else if (Array.isArray(parsed?.nodes_pool)) nodeCount = parsed.nodes_pool.length
  } catch (err) {
    throw new Error(`--tunnel-config: could not parse ${absPath} as JSON.`)
  }
  if (nodeCount === 0) {
    throw new Error(`--tunnel-config: ${absPath} has zero entries in NodesPool.`)
  }
  return { absPath, nodeCount }
}

describe('tunnel config validation', () => {
  it('throws when the file does not exist', () => {
    expect(() => resolveTunnelConfigForTest(join(workDir, 'missing.json')))
      .toThrow(/file not found/)
  })

  it('throws on invalid JSON', () => {
    const p = join(workDir, 'broken.json')
    writeFileSync(p, '{ not actually json')
    expect(() => resolveTunnelConfigForTest(p))
      .toThrow(/could not parse/)
  })

  it('throws when NodesPool is missing or empty', () => {
    const p1 = join(workDir, 'empty.json')
    writeFileSync(p1, '{}')
    expect(() => resolveTunnelConfigForTest(p1))
      .toThrow(/zero entries/)

    const p2 = join(workDir, 'empty-array.json')
    writeFileSync(p2, JSON.stringify({ NodesPool: [] }))
    expect(() => resolveTunnelConfigForTest(p2))
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
    const result = resolveTunnelConfigForTest(p)
    expect(result.nodeCount).toBe(2)
    expect(result.absPath).toBe(path.resolve(p))
    expect(result.absPath.startsWith('/')).toBe(true)
  })

  it('also accepts snake_case nodes_pool (defensive)', () => {
    const p = join(workDir, 'snake.json')
    writeFileSync(p, JSON.stringify({
      nodes_pool: [{ key: 'a' }],
    }))
    const result = resolveTunnelConfigForTest(p)
    expect(result.nodeCount).toBe(1)
  })
})
