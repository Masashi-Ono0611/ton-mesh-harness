/**
 * Integration test for the tonutils-storage backend (B2 ship).
 *
 * GUARDED. Boots a real tonutils-storage daemon via the same code path
 * the CLI uses, creates a tiny bag through the HTTP API, asserts on
 * /api/v1/details, then tears the daemon back down. Slow (≈10–15 s) and
 * downloads the daemon binary on first run, so it is opt-in via
 * `RUN_DAEMON_TESTS=1` — the same gate the existing TON Core daemon
 * parity test uses.
 *
 * Run:
 *   RUN_DAEMON_TESTS=1 npx vitest run test/tonutils-integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { ensureTonutilsBinary } from '../src/daemon/tonutils-installer'
import {
  startTonutilsDaemon,
  tonutilsCreate,
  tonutilsDetails,
  tonutilsList,
  tonutilsRemove,
  type TonutilsHandle,
} from '../src/daemon/tonutils-process'

const DAEMON_GUARD = process.env.RUN_DAEMON_TESTS === '1'
const describeIfDaemon = DAEMON_GUARD ? describe : describe.skip

describeIfDaemon('tonutils-storage integration', () => {
  let daemon: TonutilsHandle
  let workDir: string
  let bagId: string

  beforeAll(async () => {
    ensureTonutilsBinary({ silent: true })
    daemon = await startTonutilsDaemon()

    workDir = mkdtempSync(join(tmpdir(), 'sdk-tonutils-itest-'))
    // Bag must clear typical provider min size (1024 bytes) — though we
    // never actually contract with a provider here, keeping the bag
    // realistic helps us notice any size-handling regression.
    writeFileSync(join(workDir, 'index.html'), '<h1>tonutils integration test</h1>\n' + 'x'.repeat(2000))
  }, 120_000)

  afterAll(() => {
    try {
      if (bagId && daemon) {
        // best-effort cleanup; remove the bag from the daemon so a re-run
        // doesn't accumulate dead torrents
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        tonutilsRemove(daemon, { bag_id: bagId, with_files: false }).catch(() => {})
      }
    } catch { /* ignore */ }
    try { daemon?.kill() } catch { /* ignore */ }
    try { rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
  })

  it('starts the daemon and exposes HTTP /api/v1/list', async () => {
    expect(daemon.apiUrl.startsWith('http://127.0.0.1:')).toBe(true)
    const list = await tonutilsList(daemon)
    expect(Array.isArray(list.bags)).toBe(true)
  })

  it('creates a bag and reports size + merkle_hash via /api/v1/details', async () => {
    const created = await tonutilsCreate(daemon, {
      path: workDir,
      description: 'sdk-tonutils-itest',
    })
    expect(created.bag_id).toMatch(/^[0-9a-f]{64}$/)
    bagId = created.bag_id

    const details = await tonutilsDetails(daemon, bagId)
    expect(details.bag_id).toBe(bagId)
    expect(details.size).toBeGreaterThan(0)
    expect(details.files_count).toBeGreaterThanOrEqual(1)
    expect(details.merkle_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('lists the bag we just created', async () => {
    const list = await tonutilsList(daemon)
    expect(list.bags.some(b => b.bag_id === bagId)).toBe(true)
  })

  it('produces a deterministic bag id for identical content', async () => {
    // Re-create the same buildDir; tonutils-storage may return either
    // the same bag_id (idempotent registration) or an error indicating
    // it's already registered. Either is acceptable — the bag id should
    // be the same one.
    try {
      const reCreate = await tonutilsCreate(daemon, {
        path: workDir,
        description: 'sdk-tonutils-itest',
      })
      expect(reCreate.bag_id).toBe(bagId)
    } catch (err) {
      // "already registered" is fine — proves the daemon recognises the
      // identical-content case rather than silently producing a new id.
      expect(String(err)).toMatch(/already|exists|registered/i)
    }
  })
})
