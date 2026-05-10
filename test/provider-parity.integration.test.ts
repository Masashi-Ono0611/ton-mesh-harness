/**
 * Step 5b — byte-equal parity check between the daemon CLI's
 * `new-contract-message` output and our self-generated BOC.
 *
 * GUARDED. This test starts a real `storage-daemon`, creates a bag, and
 * shells out to `storage-daemon-cli`. It is slow (≈10–30 s) and requires
 * the daemon binary on disk. Skipped unless `RUN_DAEMON_TESTS=1`.
 *
 * Run:  RUN_DAEMON_TESTS=1 npx vitest run test/provider-parity.integration.test.ts
 *
 * If this test passes, we have a byte-for-byte proof that:
 *   1. our TS builder targets the same TL-B layout as the daemon CLI, and
 *   2. we can take the daemon's BOC, swap `max-span` for any uint32 value,
 *      and emit a new valid BOC — bypassing the CLI's uint8 cap entirely.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Cell } from '@ton/ton'

import { ensureBinaries, getDaemonPaths } from '../src/daemon/installer'
import { startDaemon } from '../src/daemon/process'
import { createBag } from '../src/upload'
import {
  OP_OFFER_STORAGE_CONTRACT,
  buildOfferStorageContractMessage,
} from '../src/provider'
import type { DaemonHandle } from '../src/daemon'

const DAEMON_GUARD = process.env.RUN_DAEMON_TESTS === '1'
const describeIfDaemon = DAEMON_GUARD ? describe : describe.skip

const TEST_RATE = 20
const TEST_SPAN_CLI = 200          // capped by the uint8 bug
const TEST_SPAN_LARGE = 86_400     // 1 day — what the CLI cannot emit

interface ParsedCliBoc {
  op: number
  queryId: bigint
  torrentInfo: Cell
  microchunkHash: Buffer
  rate: bigint
  span: number
}

function parseCliContractMessage(boc: Buffer): ParsedCliBoc {
  const cell = Cell.fromBoc(boc)[0]
  const slice = cell.beginParse()
  const op = slice.loadUint(32)
  const queryId = slice.loadUintBig(64)
  if (cell.refs.length !== 1) {
    throw new Error(`expected exactly 1 ref (TorrentInfo), got ${cell.refs.length}`)
  }
  const torrentInfo = cell.refs[0]
  const microchunkBig = slice.loadUintBig(256)
  const microchunkHex = microchunkBig.toString(16).padStart(64, '0')
  const microchunkHash = Buffer.from(microchunkHex, 'hex')
  const rate = slice.loadCoins()
  const span = slice.loadUint(32)
  return { op, queryId, torrentInfo, microchunkHash, rate, span }
}

describeIfDaemon('provider BOC parity — daemon CLI vs self-generated', () => {
  let daemon: DaemonHandle
  let workDir: string
  let bagId: string
  let cliBocPath: string

  beforeAll(async () => {
    ensureBinaries(false)
    daemon = await startDaemon(false)

    workDir = mkdtempSync(join(tmpdir(), 'sdk-parity-'))
    writeFileSync(join(workDir, 'index.html'), '<h1>parity test</h1>\n')

    const result = createBag({
      buildDir: workDir,
      description: 'sdk-parity',
      daemon,
    })
    bagId = result.bagId
    cliBocPath = join(workDir, 'contract.boc')

    const paths = getDaemonPaths()
    const keyDir = join(daemon.dbDir, 'cli-keys')
    const cli = spawnSync(
      paths.cli,
      [
        '-v', '0',
        '-I', `127.0.0.1:${daemon.cliPort}`,
        '-k', join(keyDir, 'client'),
        '-p', join(keyDir, 'server.pub'),
        '-c',
        `new-contract-message ${bagId} ${cliBocPath} --rate ${TEST_RATE} --max-span ${TEST_SPAN_CLI}`,
      ],
      { encoding: 'utf8', timeout: 30_000 },
    )

    if (cli.status !== 0 || !existsSync(cliBocPath)) {
      const out = (cli.stdout ?? '') + (cli.stderr ?? '')
      throw new Error(
        `daemon new-contract-message failed (exit ${cli.status}):\n${out}`,
      )
    }
  }, 120_000)

  afterAll(() => {
    try { daemon?.kill() } catch { /* ignore */ }
    try { rmSync(workDir, { recursive: true, force: true }) } catch { /* ignore */ }
  })

  it('CLI BOC parses with our expected layout', () => {
    const cliBoc = readFileSync(cliBocPath)
    const parsed = parseCliContractMessage(cliBoc)
    expect(parsed.op).toBe(OP_OFFER_STORAGE_CONTRACT)
    expect(parsed.span).toBe(TEST_SPAN_CLI)
    expect(parsed.rate).toBe(BigInt(TEST_RATE))
    expect(parsed.microchunkHash.length).toBe(32)
    expect(parsed.torrentInfo.bits.length).toBeGreaterThan(0)
  })

  it('our builder reproduces the CLI BOC byte-for-byte at span=200', () => {
    // The daemon serialises with vm::std_boc_serialize, which corresponds to
    // @ton/core's toBoc({ idx: false, crc32: false }). Default toBoc() adds
    // a crc32 trailer (mode 0x41 vs 0x01 in the BOC header).
    const cliBoc = readFileSync(cliBocPath)
    const parsed = parseCliContractMessage(cliBoc)

    const ours = buildOfferStorageContractMessage({
      queryId: parsed.queryId,
      torrentInfo: parsed.torrentInfo,
      microchunkHash: parsed.microchunkHash,
      expectedRateNanoPerMbDay: parsed.rate,
      expectedMaxSpanSeconds: parsed.span,
    })

    const ourBoc = ours.toBoc({ idx: false, crc32: false })
    expect(ourBoc.equals(cliBoc)).toBe(true)
  })

  it('our builder accepts span=86400 (1 day) — the value the CLI cannot emit', () => {
    const cliBoc = readFileSync(cliBocPath)
    const parsed = parseCliContractMessage(cliBoc)

    const ours = buildOfferStorageContractMessage({
      queryId: parsed.queryId,
      torrentInfo: parsed.torrentInfo,
      microchunkHash: parsed.microchunkHash,
      expectedRateNanoPerMbDay: parsed.rate,
      expectedMaxSpanSeconds: TEST_SPAN_LARGE,
    })

    const reparsed = parseCliContractMessage(ours.toBoc())
    expect(reparsed.span).toBe(TEST_SPAN_LARGE)
    // Everything else is preserved from the CLI's contribution
    expect(reparsed.op).toBe(parsed.op)
    expect(reparsed.queryId).toBe(parsed.queryId)
    expect(reparsed.rate).toBe(parsed.rate)
    expect(reparsed.microchunkHash.equals(parsed.microchunkHash)).toBe(true)
    expect(reparsed.torrentInfo.equals(parsed.torrentInfo)).toBe(true)
  })

  it('confirms the daemon CLI rejects span=256 (the uint8 cap exists)', () => {
    const paths = getDaemonPaths()
    const keyDir = join(daemon.dbDir, 'cli-keys')
    const badPath = join(workDir, 'should-not-exist.boc')
    const cli = spawnSync(
      paths.cli,
      [
        '-v', '0',
        '-I', `127.0.0.1:${daemon.cliPort}`,
        '-k', join(keyDir, 'client'),
        '-p', join(keyDir, 'server.pub'),
        '-c',
        `new-contract-message ${bagId} ${badPath} --rate ${TEST_RATE} --max-span 256`,
      ],
      { encoding: 'utf8', timeout: 10_000 },
    )

    const out = (cli.stdout ?? '') + (cli.stderr ?? '')
    // The daemon refuses with a parse error and never writes the file.
    expect(existsSync(badPath)).toBe(false)
    expect(out.toLowerCase()).toMatch(/invalid max span|number is too large/)
  })
})
