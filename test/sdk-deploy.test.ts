/**
 * Unit tests for the SDK deploy() generator.
 *
 * Heavy daemon work is gated behind `RUN_DAEMON_TESTS=1`. The default suite
 * covers input validation, error mapping, AbortSignal pre/post yield, and
 * F5 ERR_BUSY serialisation — paths that don't need a real daemon spawn.
 */
import { describe, expect, it } from 'vitest'
import { SdkError, deploy } from '../src/sdk/deploy'

const DAEMON_GUARD = process.env.RUN_DAEMON_TESTS === '1'
const describeIfDaemon = DAEMON_GUARD ? describe : describe.skip

describe('SDK deploy() — input validation + error contract', () => {
  it('throws SdkError(ERR_INVALID_INPUT) when source_dir is missing', async () => {
    await expect(deploy({ source_dir: undefined as unknown as string }).next()).rejects.toMatchObject({
      code: 'ERR_INVALID_INPUT',
    })
  })

  it('rejects an invalid daemon_mode through schema parse (#37)', async () => {
    await expect(
      deploy({ source_dir: './dist', daemon_mode: 'bogus' as 'service' }).next(),
    ).rejects.toMatchObject({ code: 'ERR_INVALID_INPUT' })
  })

  it('rejects unknown wallet kind through schema parse', async () => {
    await expect(
      deploy({ source_dir: './dist', wallet: { kind: 'bogus' as 'tonconnect' } }).next(),
    ).rejects.toMatchObject({ code: 'ERR_INVALID_INPUT' })
  })

  it('rejects unknown top-level keys (Codex S2 MAJOR — strict pass-through)', async () => {
    await expect(
      deploy({
        source_dir: './dist',
        // Typo in field name — must fail rather than silently ignored.
        source_dri: './oops',
      } as never).next(),
    ).rejects.toMatchObject({ code: 'ERR_INVALID_INPUT' })
  })

  it('SDK lifts bare-string wallet for CLI compat (deploy() is permissive)', async () => {
    // Codex pre-GA review round 4 noted this CLI-compat lift in
    // src/sdk/deploy.ts::normalize() via parseWalletInput(). The SDK
    // accepts string wallets; the MCP boundary enforces structured objects
    // separately (see src/mcp.ts::handleDeploy). Proof the lift succeeded
    // past the wallet gate: deploy() does NOT reject — it progresses to the
    // first `env_check` yield. We then return() the generator to release
    // the process-local in-flight lock without spawning a daemon.
    const gen = deploy({ source_dir: './dist', wallet: 'Tonkeeper' })
    try {
      const first = await gen.next()
      expect(first.done).toBe(false)
      expect(first.value).toMatchObject({ phase: 'env_check' })
    } finally {
      await gen.return(undefined)
    }
  })

  it('ZodError diagnostics surface as SdkError.data.zod_issues', async () => {
    // Codex pre-GA review round 4 NIT: the SdkError wrap on
    // src/sdk/deploy.ts::normalize() was dropping zod_issues. Agents
    // render the issue list to humans, so restoring it.
    const err = await deploy({
      source_dir: './dist',
      source_dri: './oops',
    } as never)
      .next()
      .catch((e: unknown) => e)
    expect(err).toBeInstanceOf(SdkError)
    expect((err as SdkError).code).toBe('ERR_INVALID_INPUT')
    expect((err as SdkError).data).toMatchObject({
      zod_issues: expect.any(Array),
    })
  })

  it('rejects an absent --tunnel-config path with ERR_INVALID_INPUT (not ERR_DAEMON_API_TIMEOUT)', async () => {
    await expect(
      deploy({ source_dir: './dist', tunnel_config: '/nonexistent/tunnel.json' }).next(),
    ).rejects.toMatchObject({
      code: 'ERR_INVALID_INPUT',
      message: expect.stringContaining('--tunnel-config'),
    })
  })

  it('SdkError carries the F5 error contract surface', () => {
    const err = new SdkError('ERR_DAEMON_SPAWN', 'binary missing', {
      severity: 'fatal',
      fixHint: 'Run `npx ton-sovereign-deploy doctor` to diagnose.',
    })
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe('ERR_DAEMON_SPAWN')
    expect(err.severity).toBe('fatal')
    expect(err.fixHint).toContain('doctor')
    expect(err.name).toBe('SdkError')
  })
})

describe('SDK deploy() — AbortSignal handling', () => {
  it('throws ERR_CANCELLED with phase_at_cancel: env_check when pre-fired', async () => {
    const ac = new AbortController()
    ac.abort()
    const error = await deploy({ source_dir: './dist' }, { signal: ac.signal })
      .next()
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SdkError)
    expect((error as SdkError).code).toBe('ERR_CANCELLED')
    expect((error as SdkError).data).toMatchObject({
      phase_at_cancel: 'env_check',
      may_have_published: false,
      bag_id: null,
      tx_hash: null,
    })
  })

  it('throws ERR_CANCELLED with phase_at_cancel: env_check when fired after the first yield', async () => {
    const ac = new AbortController()
    const it = deploy({ source_dir: './dist' }, { signal: ac.signal })
    const first = await it.next() // env_check
    expect(first.value?.phase).toBe('env_check')
    ac.abort()
    const next = await it.next().catch((e: unknown) => e)
    expect(next).toBeInstanceOf(SdkError)
    expect((next as SdkError).code).toBe('ERR_CANCELLED')
    expect((next as SdkError).data).toMatchObject({ phase_at_cancel: 'env_check' })
  })
})

describe('SDK deploy() — F5 ERR_BUSY serialisation gate', () => {
  it('rejects a concurrent deploy() with ERR_BUSY (process-local lock)', async () => {
    const a = deploy({ source_dir: './dist' })
    // Pump just past the gate without completing.
    await a.next()
    const b = deploy({ source_dir: './dist' })
    await expect(b.next()).rejects.toMatchObject({ code: 'ERR_BUSY' })
    // Cleanly stop the first generator so the lock releases (and the
    // daemon, if anything started, gets killed via the finally-block).
    await a.return(undefined as never).catch(() => {})
  })
})

describeIfDaemon('SDK deploy() — happy path (RUN_DAEMON_TESTS=1)', () => {
  it('emits env_check → daemon_starting → bag_creating → bag_uploaded → done in order', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('fs')
    const { tmpdir } = await import('os')
    const { join } = await import('path')

    const dir = mkdtempSync(join(tmpdir(), 'sdk-deploy-itest-'))
    writeFileSync(join(dir, 'index.html'), '<h1>SDK deploy itest</h1>\n' + 'x'.repeat(2000))

    try {
      const phases: string[] = []
      let result: unknown
      for await (const ev of deploy({ source_dir: dir })) {
        phases.push(ev.phase)
        if (ev.phase === 'done') result = ev.data
      }

      expect(phases).toEqual(['env_check', 'daemon_starting', 'bag_creating', 'bag_uploaded', 'done'])
      expect(result).toMatchObject({
        bag_id: expect.any(String),
        bag_size_bytes: expect.any(Number),
        dns_tx_hash: null,
        seed_status: 'stopped',
        daemon_pid: null,
      })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 120_000)

  it('keep_alive: true returns daemon_pid and seed_status: "seeding"; caller kills', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('fs')
    const { tmpdir } = await import('os')
    const { join } = await import('path')

    const dir = mkdtempSync(join(tmpdir(), 'sdk-deploy-keepalive-'))
    writeFileSync(join(dir, 'index.html'), '<h1>keepalive</h1>\n' + 'x'.repeat(2000))

    try {
      let final: { daemon_pid: number | null; seed_status: string } | undefined
      for await (const ev of deploy({ source_dir: dir, keep_alive: true })) {
        if (ev.phase === 'done') final = ev.data as typeof final
      }
      expect(final?.seed_status).toBe('seeding')
      expect(typeof final?.daemon_pid).toBe('number')
      // Manually kill the daemon (caller's responsibility under keep_alive).
      if (final?.daemon_pid) process.kill(final.daemon_pid, 'SIGTERM')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 120_000)
})
