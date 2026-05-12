/**
 * Codex r11 (self-audit) supply-chain integrity gate: installBinary
 * verifies SHA-256 against a pinned hash before chmod+x. Mismatches
 * delete the partial file and throw. Missing hash falls back to TOFU
 * + stderr warning. These tests stub spawnSync('curl', ...) so no
 * network is touched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'

const sandboxDir = mkdtempSync(path.join(tmpdir(), 'tsd-installer-sha-test-'))
const spawnSyncMock = vi.fn(() => ({ status: 0, signal: null, output: [], pid: 0, stdout: '', stderr: '' }))

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return { ...actual, spawnSync: spawnSyncMock }
})

// BIN_DIR is computed at module load from os.homedir(); HOME swap
// must happen BEFORE the dynamic imports below.
const originalHome = process.env.HOME
process.env.HOME = sandboxDir

// Helper: configure spawnSync mock to write `content` to the curl
// `-o <path>` destination (so verify sees a real file).
const stubCurlWriting = (content: Buffer): void => {
  spawnSyncMock.mockImplementation((cmd: string, args?: readonly string[]) => {
    if (cmd === 'curl' && args) {
      const oFlagIdx = args.indexOf('-o')
      if (oFlagIdx >= 0) writeFileSync(args[oFlagIdx + 1], content)
    }
    return { status: 0, signal: null, output: [], pid: 0, stdout: '', stderr: '' }
  })
}

const platformKey = `${process.platform}-${process.arch}`

const baseSpec = (exeName: string, expectedSha256?: Record<string, string>) => ({
  name: exeName,
  version: 'v0.0.1',
  exeName,
  versionFileName: `.${exeName}-version`,
  assetMap: { [platformKey]: 'fixture-asset' },
  downloadUrl: () => 'https://example.com/fixture-asset',
  unsupportedHint: '',
  expectedSha256,
})

describe('installBinary SHA-256 verification', () => {
  beforeEach(() => {
    spawnSyncMock.mockClear()
    try { rmSync(path.join(sandboxDir, '.ton-sovereign'), { recursive: true, force: true }) } catch {}
  })
  afterEach(() => { spawnSyncMock.mockReset() })

  it('passes when the downloaded file matches the pinned hash', async () => {
    const content = Buffer.from('hello-world-binary-fixture')
    const hash = createHash('sha256').update(content).digest('hex')
    stubCurlWriting(content)
    const { installBinary } = await import('../../src/daemon/installer-utils')
    expect(() => installBinary(baseSpec('fixture-ok', { [platformKey]: hash }), { silent: true })).not.toThrow()
  })

  it('throws AND deletes the partial file when SHA-256 mismatches', async () => {
    const downloaded = Buffer.from('attacker-controlled-binary')
    const pinnedHash = createHash('sha256').update(Buffer.from('legitimate-binary')).digest('hex')
    stubCurlWriting(downloaded)
    const { installBinary, BIN_DIR } = await import('../../src/daemon/installer-utils')
    const daemonPath = path.join(BIN_DIR, process.platform === 'win32' ? 'fixture-bad.exe' : 'fixture-bad')
    expect(() => installBinary(baseSpec('fixture-bad', { [platformKey]: pinnedHash }), { silent: true }))
      .toThrow(/integrity check FAILED/)
    expect(existsSync(daemonPath)).toBe(false)
  })

  it('TOFU warning fires when no hash is pinned for this platform-arch', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    stubCurlWriting(Buffer.from('fixture-no-pin'))
    const { installBinary } = await import('../../src/daemon/installer-utils')
    expect(() => installBinary(baseSpec('fixture-tofu'), { silent: true })).not.toThrow()
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('')
    expect(stderrText).toMatch(/no SHA-256 hash pinned/)
    stderrSpy.mockRestore()
  })

  it('pinned tonutils-storage hashes are 64-char hex × ≥5 platforms (sanity)', () => {
    const src = readFileSync(
      path.join(__dirname, '..', '..', 'src', 'daemon', 'tonutils-installer.ts'),
      'utf-8',
    )
    expect((src.match(/'[0-9a-f]{64}'/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })
})

afterEach(() => {
  if (originalHome !== undefined) process.env.HOME = originalHome
})
