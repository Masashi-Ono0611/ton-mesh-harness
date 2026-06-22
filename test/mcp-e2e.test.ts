import { spawn } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * V3 (#18) E2E acceptance — programmatic harness around
 * scripts/e2e-mcp-deploy.cjs.
 *
 * Gated by `RUN_MCP_E2E=1` so the default `npm test` run skips it: the
 * driver spawns the built `dist/mcp.js`, which requires `npm run build`
 * to have run first, and the armed stages touch the network / mainnet.
 *
 * Unarmed (the default even under RUN_MCP_E2E=1) this asserts the
 * zero-cost MCP surface: handshake → tools/list → check_env, then a
 * graceful skip of the deploy stage. Set E2E_AUTO_SIGN=1 (with a
 * configured agentic wallet) to exercise the real mainnet deploy —
 * see docs/v0.8/e2e-runbook.md.
 */

const RUN = process.env.RUN_MCP_E2E === '1'
const DRIVER = path.resolve(__dirname, '..', 'scripts', 'e2e-mcp-deploy.cjs')

function runDriver(): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [DRIVER], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString('utf8')))
    child.stderr.on('data', (d) => (stderr += d.toString('utf8')))
    child.on('exit', (code) => resolve({ code, stdout, stderr }))
  })
}

describe.skipIf(!RUN)('MCP E2E (gated by RUN_MCP_E2E=1)', () => {
  it(
    'drives the MCP surface end-to-end via scripts/e2e-mcp-deploy.cjs',
    async () => {
      const { code, stdout, stderr } = await runDriver()
      expect(stderr, stderr).not.toMatch(/E2E FAILED/)
      expect(code, `driver exited ${code}; stderr=${stderr}`).toBe(0)
      expect(stdout).toMatch(/Stage 1: handshake OK/)
      expect(stdout).toMatch(
        /sovereign_check_env, sovereign_deploy, sovereign_site_record, sovereign_status/,
      )
      expect(stdout).toMatch(/PASS/)
    },
    6 * 60_000,
  )
})
