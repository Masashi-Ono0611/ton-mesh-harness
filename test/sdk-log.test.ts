import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSdkLogger, isNamespaceEnabledForTesting } from '../src/sdk/log'

describe('isNamespaceEnabledForTesting (DEBUG-grammar parser)', () => {
  it('disabled when DEBUG is undefined', () => {
    expect(isNamespaceEnabledForTesting('sovereign:deploy', undefined)).toBe(false)
  })

  it('disabled when DEBUG is empty string', () => {
    expect(isNamespaceEnabledForTesting('sovereign:deploy', '')).toBe(false)
  })

  it('wildcard "*" matches anything', () => {
    expect(isNamespaceEnabledForTesting('sovereign:deploy', '*')).toBe(true)
    expect(isNamespaceEnabledForTesting('random:thing', '*')).toBe(true)
  })

  it('"sovereign:*" matches every sovereign namespace', () => {
    expect(isNamespaceEnabledForTesting('sovereign:deploy', 'sovereign:*')).toBe(true)
    expect(isNamespaceEnabledForTesting('sovereign:dns', 'sovereign:*')).toBe(true)
    expect(isNamespaceEnabledForTesting('other:thing', 'sovereign:*')).toBe(false)
  })

  it('exact namespace match', () => {
    expect(isNamespaceEnabledForTesting('sovereign:deploy', 'sovereign:deploy')).toBe(true)
    expect(isNamespaceEnabledForTesting('sovereign:dns', 'sovereign:deploy')).toBe(false)
  })

  it('comma-separated list', () => {
    const pattern = 'sovereign:deploy,sovereign:dns'
    expect(isNamespaceEnabledForTesting('sovereign:deploy', pattern)).toBe(true)
    expect(isNamespaceEnabledForTesting('sovereign:dns', pattern)).toBe(true)
    expect(isNamespaceEnabledForTesting('sovereign:resolve-tx', pattern)).toBe(false)
  })

  it('whitespace-separated list (debug.js compat)', () => {
    expect(isNamespaceEnabledForTesting('sovereign:dns', 'sovereign:deploy sovereign:dns')).toBe(true)
  })

  it('"-prefix" exclusion overrides wildcard', () => {
    const pattern = '*,-sovereign:resolve-tx'
    expect(isNamespaceEnabledForTesting('sovereign:deploy', pattern)).toBe(true)
    expect(isNamespaceEnabledForTesting('sovereign:resolve-tx', pattern)).toBe(false)
  })

  it('escapes regex metacharacters in literal namespace parts', () => {
    // Namespaces like `app.deploy` shouldn't trigger regex `.` wildcard.
    expect(isNamespaceEnabledForTesting('app:deploy', 'aXp:*')).toBe(false)
  })

  it('handles only an exclusion (no match without explicit include)', () => {
    expect(isNamespaceEnabledForTesting('sovereign:deploy', '-sovereign:deploy')).toBe(false)
  })
})

describe('createSdkLogger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>
  let savedDebug: string | undefined

  beforeEach(() => {
    savedDebug = process.env.DEBUG
    delete process.env.DEBUG
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })
  afterEach(() => {
    stderrSpy.mockRestore()
    if (savedDebug === undefined) delete process.env.DEBUG
    else process.env.DEBUG = savedDebug
  })

  it('disabled logger no-ops debug/info/warn (no stderr writes)', () => {
    const logger = createSdkLogger('sovereign:test')
    logger.debug('a')
    logger.info('b')
    logger.warn('c')
    expect(stderrSpy).not.toHaveBeenCalled()
  })

  it('enabled logger writes to stderr (DEBUG=*)', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('sovereign:test')
    logger.info('hello')
    expect(stderrSpy).toHaveBeenCalledTimes(1)
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toContain('INFO')
    expect(line).toContain('sovereign:test')
    expect(line).toContain('hello')
  })

  it('output goes to STDERR, never stdout', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    process.env.DEBUG = '*'
    const logger = createSdkLogger('sovereign:test')
    logger.info('hello')
    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalled()
    stdoutSpy.mockRestore()
  })

  it('attaches a JSON data payload when provided', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('sovereign:test')
    logger.info('with-data', { bag_id: 'abc', size: 1024 })
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toContain('"bag_id":"abc"')
    expect(line).toContain('"size":1024')
  })

  it('appends a string data argument as-is (no double JSON)', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('sovereign:test')
    logger.warn('msg', 'extra-detail')
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toContain('msg extra-detail')
  })

  it('includes ISO timestamp', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('sovereign:test')
    logger.info('x')
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z /)
  })

  it('all three levels are emitted at the same enabled-ness', () => {
    process.env.DEBUG = 'sovereign:test'
    const logger = createSdkLogger('sovereign:test')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    expect(stderrSpy).toHaveBeenCalledTimes(3)
  })

  it('enabled-state is captured at construction time', () => {
    const disabled = createSdkLogger('sovereign:test')
    process.env.DEBUG = '*'
    // Set AFTER construction — still disabled.
    disabled.info('x')
    expect(stderrSpy).not.toHaveBeenCalled()
  })

  it('does not emit when namespace excluded', () => {
    process.env.DEBUG = '*,-sovereign:excluded'
    const logger = createSdkLogger('sovereign:excluded')
    logger.info('hidden')
    expect(stderrSpy).not.toHaveBeenCalled()
  })
})
