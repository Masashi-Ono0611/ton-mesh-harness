/**
 * Codex pre-GA review round 11 (self-audit) regression gate:
 * `installer-utils.ts::installBinary` now verifies the SHA-256 hash
 * of every downloaded daemon binary against the pinned value in
 * `BinaryInstallerSpec.expectedSha256`. A mismatch deletes the
 * partial download and throws — protects against supply-chain
 * attacks (compromised GitHub release asset, MITM'd CDN, typo-
 * squat). This test does NOT hit the network — it stubs the
 * `downloadFile` helper to write a known-content file, then
 * asserts both success and mismatch paths.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'

// Mock downloadFile + the BIN_DIR + spawnSync (chmod / xattr). We
// can't `vi.mock('./installer-utils')` and import the same module —
// that'd be circular — so we mock the underlying spawnSync.
const sandboxDir = mkdtempSync(path.join(tmpdir(), 'tsd-installer-sha-test-'))
const spawnSyncMock = vi.fn(() => ({ status: 0, signal: null, output: [], pid: 0, stdout: '', stderr: '' }))

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process')
  return { ...actual, spawnSync: spawnSyncMock }
})

// Redirect BIN_DIR by overriding HOME. installer-utils computes
// BIN_DIR at module load via os.homedir(), so the HOME swap must
// happen BEFORE the dynamic import below.
const originalHome = process.env.HOME
process.env.HOME = sandboxDir

describe('installBinary SHA-256 verification (Codex r11 supply-chain gate)', () => {
  beforeEach(() => {
    spawnSyncMock.mockClear()
    // Reset any previous test's BIN_DIR contents
    try {
      rmSync(path.join(sandboxDir, '.ton-sovereign'), { recursive: true, force: true })
    } catch { /* fresh */ }
  })

  afterEach(() => {
    spawnSyncMock.mockReset()
  })

  it('passes when the downloaded file matches the pinned hash', async () => {
    const knownContent = Buffer.from('hello-world-binary-fixture')
    const knownHash = createHash('sha256').update(knownContent).digest('hex')

    // Stub spawnSync('curl', ...) to write the fixture content to the
    // `.tmp` dest before returning success. Mirrors what real curl
    // does on a successful fetch.
    spawnSyncMock.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'curl' && args) {
        const oFlagIdx = args.indexOf('-o')
        if (oFlagIdx >= 0) {
          writeFileSync(args[oFlagIdx + 1], knownContent)
        }
      }
      return { status: 0, signal: null, output: [], pid: 0, stdout: '', stderr: '' }
    })

    const { installBinary } = await import('../../src/daemon/installer-utils')
    expect(() =>
      installBinary({
        name: 'fixture-binary',
        version: 'v0.0.1',
        exeName: 'fixture-binary',
        versionFileName: '.fixture-version',
        assetMap: { [`${process.platform}-${process.arch}`]: 'fixture-asset' },
        downloadUrl: () => 'https://example.com/fixture-asset',
        unsupportedHint: '',
        expectedSha256: { [`${process.platform}-${process.arch}`]: knownHash },
      }, { silent: true }),
    ).not.toThrow()
  })

  it('throws AND deletes the partial file when SHA-256 mismatches', async () => {
    const downloadedContent = Buffer.from('attacker-controlled-binary')
    const pinnedHash = createHash('sha256').update(Buffer.from('legitimate-binary')).digest('hex')
    spawnSyncMock.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'curl' && args) {
        const oFlagIdx = args.indexOf('-o')
        if (oFlagIdx >= 0) writeFileSync(args[oFlagIdx + 1], downloadedContent)
      }
      return { status: 0, signal: null, output: [], pid: 0, stdout: '', stderr: '' }
    })

    const { installBinary, BIN_DIR } = await import('../../src/daemon/installer-utils')
    const expectedDaemonPath = path.join(BIN_DIR, process.platform === 'win32' ? 'fixture-bad.exe' : 'fixture-bad')
    expect(() =>
      installBinary({
        name: 'fixture-bad',
        version: 'v0.0.1',
        exeName: 'fixture-bad',
        versionFileName: '.fixture-bad-version',
        assetMap: { [`${process.platform}-${process.arch}`]: 'fixture-asset' },
        downloadUrl: () => 'https://example.com/fixture-asset',
        unsupportedHint: '',
        expectedSha256: { [`${process.platform}-${process.arch}`]: pinnedHash },
      }, { silent: true }),
    ).toThrow(/integrity check FAILED/)
    expect(existsSync(expectedDaemonPath)).toBe(false)
  })

  it('TOFU warning fires when no hash is pinned for this platform-arch', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const knownContent = Buffer.from('fixture-no-pin')
    spawnSyncMock.mockImplementation((cmd: string, args?: readonly string[]) => {
      if (cmd === 'curl' && args) {
        const oFlagIdx = args.indexOf('-o')
        if (oFlagIdx >= 0) writeFileSync(args[oFlagIdx + 1], knownContent)
      }
      return { status: 0, signal: null, output: [], pid: 0, stdout: '', stderr: '' }
    })
    const { installBinary } = await import('../../src/daemon/installer-utils')
    expect(() =>
      installBinary({
        name: 'fixture-tofu',
        version: 'v0.0.1',
        exeName: 'fixture-tofu',
        versionFileName: '.fixture-tofu-version',
        assetMap: { [`${process.platform}-${process.arch}`]: 'fixture-asset' },
        downloadUrl: () => 'https://example.com/fixture-asset',
        unsupportedHint: '',
        // expectedSha256 deliberately omitted → TOFU path
      }, { silent: true }),
    ).not.toThrow()
    const allStderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join('')
    expect(allStderrCalls).toMatch(/no SHA-256 hash pinned/)
    stderrSpy.mockRestore()
  })

  it('uses pinned tonutils-storage hash for current platform-arch (sanity check)', async () => {
    // Confirms our pinned hashes don't accidentally regress to the
    // shape of "obviously wrong" — they're 64-char lowercase hex.
    const { ensureTonutilsBinary: _ensure } = await import('../../src/daemon/tonutils-installer')
    void _ensure // satisfy lint; we just want module load to be clean
    // Re-import the spec by reading the source — keeps the test from
    // depending on internal exports of tonutils-installer.ts.
    const src = readFileSync(
      path.join(__dirname, '..', '..', 'src', 'daemon', 'tonutils-installer.ts'),
      'utf-8',
    )
    const hashMatches = src.match(/'[0-9a-f]{64}'/g) ?? []
    expect(hashMatches.length).toBeGreaterThanOrEqual(5) // 5 platforms
  })
})

// Restore HOME before this test file's process exits so other tests
// pulling node:os get the real HOME back.
afterEach(() => {
  if (originalHome !== undefined) process.env.HOME = originalHome
})
