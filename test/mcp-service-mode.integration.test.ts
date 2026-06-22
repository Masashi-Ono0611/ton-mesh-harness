import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { listServices, stopService } from '../src/daemon/service'

/**
 * #37 — MCP-path `daemon_mode: "service"` end-to-end.
 *
 * The CLI launchd lifecycle is validated by hand; this exercises the MCP
 * glue: an MCP client calls `mesh_deploy` with `daemon_mode: "service"`
 * (storage-only, `domain: null` — no signing/TON), and we assert the result
 * carries a `daemon_service` label and an OS unit really got installed +
 * seeding, then tear it down.
 *
 * Gated by RUN_MCP_INTEGRATION=1 (spawns the real daemon + installs an OS
 * service unit — macOS launchd / Linux systemd --user). The default
 * `bun run test` run skips it.
 */

const RUN = process.env.RUN_MCP_INTEGRATION === '1'
const SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'mcp.js')
const FIXTURE_DIR = path.resolve(__dirname, 'fixtures', 'minimal-site')
const TIMEOUT_MS = 180_000

interface Frame {
  id?: number
  method?: string
  result?: { structuredContent?: { bag_id?: string; daemon_service?: string | null }; isError?: boolean }
}
function parseFrames(buf: string): Frame[] {
  const out: Frame[] = []
  for (const line of buf.split('\n')) {
    const s = line.trim()
    if (!s) continue
    try {
      out.push(JSON.parse(s) as Frame)
    } catch {
      /* partial */
    }
  }
  return out
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe.skipIf(!RUN)('MCP daemon_mode:service (RUN_MCP_INTEGRATION=1)', () => {
  it(
    'installs an OS service unit and reports daemon_service',
    async () => {
      const child: ChildProcessWithoutNullStreams = spawn(process.execPath, [SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (d) => (stdout += d.toString('utf8')))
      child.stderr.on('data', (d) => (stderr += d.toString('utf8')))
      const send = (m: unknown) => child.stdin.write(JSON.stringify(m) + '\n')

      let bagId: string | undefined
      let daemonService: string | null | undefined
      try {
        send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'svc-it', version: '0' } },
        })
        await wait(300)
        send({ jsonrpc: '2.0', method: 'notifications/initialized' })
        await wait(200)
        send({
          jsonrpc: '2.0',
          id: 10,
          method: 'tools/call',
          params: {
            name: 'mesh_deploy',
            arguments: { source_dir: FIXTURE_DIR, domain: null, daemon_mode: 'service', wallet: { kind: 'tonconnect' } },
            _meta: { progressToken: 'svc-1' },
          },
        })

        const deadline = Date.now() + TIMEOUT_MS
        let res: Frame | undefined
        while (Date.now() < deadline) {
          res = parseFrames(stdout).find((f) => f.id === 10)
          if (res || child.exitCode !== null) break
          await wait(500)
        }
        expect(res, `no deploy result; stderr=${stderr.slice(0, 600)}`).toBeTruthy()
        expect(res!.result?.isError, `deploy errored: ${JSON.stringify(res!.result?.structuredContent).slice(0, 400)}`).toBeFalsy()
        const sc = res!.result?.structuredContent
        bagId = sc?.bag_id
        daemonService = sc?.daemon_service
        expect(bagId, 'no bag_id').toBeTruthy()
        expect(daemonService, 'daemon_service should be set in service mode').toBe(`ton-mesh.${bagId}`)

        // The OS unit really exists + is tracked.
        const listed = listServices().find((s) => s.bag_id === bagId)
        expect(listed, 'service should appear in listServices()').toBeTruthy()
        expect(listed!.running, 'service should be running').toBe(true)
      } finally {
        try {
          child.kill()
        } catch {
          /* ignore */
        }
        await wait(500)
        // Tear down the installed unit + persistent db.
        if (bagId) {
          try {
            stopService(bagId, { removeDb: true })
          } catch {
            /* best-effort cleanup */
          }
        }
      }
    },
    TIMEOUT_MS + 30_000,
  )
})
