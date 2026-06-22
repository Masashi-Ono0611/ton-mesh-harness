import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * #31 — MCP-layer notifications/cancelled cleanup integration test.
 *
 * The SDK-layer regression (Codex r3 BLOCKER: inner DNS generator's
 * finally not running on outer break) is covered by
 * test/sdk-deploy-inner-cleanup.test.ts with deep mocks. This test
 * exercises the *MCP glue* (src/mcp.ts::handleDeploy) end-to-end against
 * a REAL tonutils-storage daemon, targeting the rc10 BLOCKER class:
 * a daemon orphaned when the deploy is cancelled mid-flight.
 *
 * It drives a real `tools/call mesh_deploy` with `domain: null`
 * (storage-only — no DNS / no wallet / no signing), waits for the
 * `bag_creating` progress event (which proves the daemon process is up
 * and responding), then sends `notifications/cancelled` and asserts the
 * daemon is cleaned up. We deliberately cancel BEFORE any DNS phase:
 *   - it needs no network / TonConnect session, so it's deterministic;
 *   - it cannot trigger a real on-chain broadcast (no domain, no signer);
 *   - the daemon-orphan cleanup cascade under test is identical.
 * (The DNS inner-generator finally is the SDK test's job.)
 *
 * Gated behind RUN_MCP_INTEGRATION=1 (same opt-in pattern as
 * RUN_DAEMON_TESTS) because it spawns the real daemon — which downloads a
 * ~12 MB binary on first use and is flaky on shared CI runners. The
 * default `bun run test` run skips it.
 *
 * F4 contract: per the MCP SDK, once notifications/cancelled fires the
 * tool response is suppressed (fire-and-forget). So we assert on process
 * HYGIENE (no leaked daemon, no unhandled rejection on stderr), not on
 * receiving an ERR_CANCELLED frame.
 */

const RUN = process.env.RUN_MCP_INTEGRATION === '1'
const SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'mcp.js')
const FIXTURE_DIR = path.resolve(__dirname, 'fixtures', 'minimal-site')
const DAEMON_UP_TIMEOUT_MS = 120_000 // daemon may download a ~12 MB binary on first run

interface Frame {
  id?: number
  method?: string
  params?: { _meta?: { phase?: string }; [k: string]: unknown }
  result?: unknown
}

function parseFrames(buf: string): Frame[] {
  const out: Frame[] = []
  for (const line of buf.split('\n')) {
    const s = line.trim()
    if (!s) continue
    try {
      out.push(JSON.parse(s) as Frame)
    } catch {
      /* partial line */
    }
  }
  return out
}

function leakedDaemons(): string[] {
  try {
    const out = execSync('ps -A -o pid,command 2>/dev/null', { encoding: 'utf8' })
    return out
      .split('\n')
      .filter((l) => /tonutils-storage|storage-daemon/.test(l) && !/vitest|mcp-cancel|grep/.test(l))
  } catch {
    return []
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe.skipIf(!RUN)('MCP notifications/cancelled cleanup (RUN_MCP_INTEGRATION=1)', () => {
  it(
    'cancels a mid-flight deploy and leaves no daemon process',
    async () => {
      const child: ChildProcessWithoutNullStreams = spawn(process.execPath, [SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d) => (stdout += d.toString('utf8')))
      child.stderr.on('data', (d) => (stderr += d.toString('utf8')))
      const send = (msg: unknown) => child.stdin.write(JSON.stringify(msg) + '\n')

      const DEPLOY_ID = 2
      try {
        // initialize handshake
        send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'mcp-cancel-it', version: '0.0.0' } },
        })
        await wait(300)
        send({ jsonrpc: '2.0', method: 'notifications/initialized' })
        await wait(200)

        // Start a real storage-only deploy (domain: null → no DNS, no
        // signing). This spawns the real tonutils-storage daemon and
        // creates the bag locally — exactly the window where the rc10
        // BLOCKER orphaned the daemon on cancel.
        send({
          jsonrpc: '2.0',
          id: DEPLOY_ID,
          method: 'tools/call',
          params: {
            name: 'mesh_deploy',
            arguments: {
              source_dir: FIXTURE_DIR,
              domain: null,
              wallet: { kind: 'tonconnect', connector: 'Tonkeeper' },
              testnet: false,
              keep_alive: false,
            },
            _meta: { progressToken: 'cancel-it-1' },
          },
        })

        // Poll the OS process table (100 ms) for the spawned daemon. The
        // instant it appears, fire notifications/cancelled — that is the
        // mid-flight window where the rc10 BLOCKER orphaned it. A
        // storage-only deploy is fast, so we watch the process directly
        // rather than a specific progress phase. Also confirm the daemon
        // reached `bag_creating` (proves the real daemon path ran, not an
        // early error).
        const deadline = Date.now() + DAEMON_UP_TIMEOUT_MS
        let daemonSeen = false
        let cancelled = false
        while (Date.now() < deadline) {
          if (!cancelled && leakedDaemons().length > 0) {
            daemonSeen = true
            send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: DEPLOY_ID, reason: 'integration cancel test' } })
            cancelled = true
            break
          }
          if (child.exitCode !== null) break
          await wait(100)
        }
        const reachedDaemonPhase = parseFrames(stdout).some(
          (f) =>
            f.method === 'notifications/progress' &&
            (f.params?._meta?.phase === 'bag_creating' || f.params?._meta?.phase === 'bag_uploaded'),
        )
        expect(
          daemonSeen || reachedDaemonPhase,
          `real daemon never ran (no ps match, no bag_creating); stderr=${stderr.slice(0, 600)}`,
        ).toBe(true)
        if (!cancelled) {
          // Daemon completed/exited before we could catch it live — still
          // send the cancel so the handler path is exercised.
          send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: DEPLOY_ID, reason: 'integration cancel test' } })
        }
        await wait(5000)
      } finally {
        try {
          child.stdin.end()
        } catch {
          /* ignore */
        }
        try {
          child.kill()
        } catch {
          /* ignore */
        }
        await wait(1500)
      }

      // Hygiene assertions.
      const leaked = leakedDaemons()
      expect(leaked, `leaked daemon process(es):\n${leaked.join('\n')}`).toHaveLength(0)
      expect(stderr).not.toMatch(/UnhandledPromiseRejection|Unhandled promise|unhandledRejection/i)
    },
    DAEMON_UP_TIMEOUT_MS + 30_000,
  )
})
