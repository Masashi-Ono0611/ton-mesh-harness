import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installCleanupOnExit, resolveCliOutputMode } from '../src/cli/output-mode'

describe('resolveCliOutputMode', () => {
  let originalCI: string | undefined
  beforeEach(() => {
    originalCI = process.env.CI
    delete process.env.CI
  })
  afterEach(() => {
    if (originalCI === undefined) delete process.env.CI
    else process.env.CI = originalCI
  })

  it('defaults — no opts, no CI env: interactive mode', () => {
    const m = resolveCliOutputMode({})
    expect(m.isCI).toBe(false)
    expect(m.jsonMode).toBe(false)
    expect(m.interactive).toBe(true)
  })

  it('opts.ciMode === true → isCI true, interactive false', () => {
    const m = resolveCliOutputMode({ ciMode: true })
    expect(m.isCI).toBe(true)
    expect(m.interactive).toBe(false)
  })

  it('CI=true env → isCI true', () => {
    process.env.CI = 'true'
    const m = resolveCliOutputMode({})
    expect(m.isCI).toBe(true)
    expect(m.interactive).toBe(false)
  })

  it('CI=false env → isCI false (literal string match)', () => {
    process.env.CI = 'false'
    const m = resolveCliOutputMode({})
    expect(m.isCI).toBe(false)
  })

  it('CI=1 (non-canonical) → isCI false (we only honor the canonical "true")', () => {
    process.env.CI = '1'
    const m = resolveCliOutputMode({})
    expect(m.isCI).toBe(false)
  })

  it('opts.jsonOutput → jsonMode true, interactive false', () => {
    const m = resolveCliOutputMode({ jsonOutput: true })
    expect(m.jsonMode).toBe(true)
    expect(m.interactive).toBe(false)
  })

  it('opts.jsonOutput false → jsonMode false', () => {
    const m = resolveCliOutputMode({ jsonOutput: false })
    expect(m.jsonMode).toBe(false)
  })

  it('CI + json → both flags, interactive still false', () => {
    process.env.CI = 'true'
    const m = resolveCliOutputMode({ jsonOutput: true })
    expect(m.isCI).toBe(true)
    expect(m.jsonMode).toBe(true)
    expect(m.interactive).toBe(false)
  })

  it('log is a no-op in jsonMode', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const m = resolveCliOutputMode({ jsonOutput: true })
    m.log('this should not appear')
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('log delegates to console.log when not jsonMode', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const m = resolveCliOutputMode({})
    m.log('hello', 'world')
    expect(consoleSpy).toHaveBeenCalledWith('hello', 'world')
    consoleSpy.mockRestore()
  })

  it('createSpinner is defined', () => {
    const m = resolveCliOutputMode({})
    expect(typeof m.createSpinner.start).toBe('function')
  })
})

describe('installCleanupOnExit', () => {
  let originalListeners: { [k: string]: NodeJS.SignalsListener[] }
  beforeEach(() => {
    originalListeners = {
      SIGINT: process.listeners('SIGINT').slice() as NodeJS.SignalsListener[],
      SIGTERM: process.listeners('SIGTERM').slice() as NodeJS.SignalsListener[],
    }
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGTERM')
  })
  afterEach(() => {
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGTERM')
    for (const l of originalListeners.SIGINT) process.on('SIGINT', l)
    for (const l of originalListeners.SIGTERM) process.on('SIGTERM', l)
  })

  it('attaches handlers to both SIGINT and SIGTERM', () => {
    const before = {
      sigint: process.listenerCount('SIGINT'),
      sigterm: process.listenerCount('SIGTERM'),
    }
    installCleanupOnExit(() => {})
    expect(process.listenerCount('SIGINT')).toBe(before.sigint + 1)
    expect(process.listenerCount('SIGTERM')).toBe(before.sigterm + 1)
  })

  // Codex pre-GA review round 9 MAJOR — installCleanupOnExit no longer
  // calls process.exit() synchronously. It sets process.exitCode + a
  // 2.5s safety timer, so the event loop drains any async cleanup
  // (e.g. the tonutils daemon's child.once('exit', rmSync)) before
  // forced exit. Without this, daemon orphan was possible on signal-
  // path teardown (round 7 made kill() schedule async cleanup).
  it('handler runs cleanup AND sets process.exitCode for SIGINT (no immediate process.exit)', () => {
    const cleanup = vi.fn()
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)
    const originalExitCode = process.exitCode
    installCleanupOnExit(cleanup)
    process.emit('SIGINT', 'SIGINT')
    expect(cleanup).toHaveBeenCalled()
    // Critical: process.exit must NOT be called immediately. A safety
    // timer (2.5s) is scheduled but hasn't fired yet.
    expect(exitSpy).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(130)
    process.exitCode = originalExitCode
    exitSpy.mockRestore()
  })

  it('handler runs cleanup AND sets process.exitCode for SIGTERM (no immediate process.exit)', () => {
    const cleanup = vi.fn()
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)
    const originalExitCode = process.exitCode
    installCleanupOnExit(cleanup)
    process.emit('SIGTERM', 'SIGTERM')
    expect(cleanup).toHaveBeenCalled()
    expect(exitSpy).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(143)
    process.exitCode = originalExitCode
    exitSpy.mockRestore()
  })

  it('idempotent: a second SIGINT does not re-trigger cleanup', () => {
    const cleanup = vi.fn()
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never)
    const originalExitCode = process.exitCode
    installCleanupOnExit(cleanup)
    process.emit('SIGINT', 'SIGINT')
    process.emit('SIGINT', 'SIGINT')
    expect(cleanup).toHaveBeenCalledTimes(1)
    process.exitCode = originalExitCode
    exitSpy.mockRestore()
  })
})
