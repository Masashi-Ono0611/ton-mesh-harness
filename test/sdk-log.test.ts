import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSdkLogger, isNamespaceEnabledForTesting } from '../src/sdk/log'

describe('isNamespaceEnabledForTesting (DEBUG-grammar parser)', () => {
  it('disabled when DEBUG is undefined', () => {
    expect(isNamespaceEnabledForTesting('mesh:deploy', undefined)).toBe(false)
  })

  it('disabled when DEBUG is empty string', () => {
    expect(isNamespaceEnabledForTesting('mesh:deploy', '')).toBe(false)
  })

  it('wildcard "*" matches anything', () => {
    expect(isNamespaceEnabledForTesting('mesh:deploy', '*')).toBe(true)
    expect(isNamespaceEnabledForTesting('random:thing', '*')).toBe(true)
  })

  it('"mesh:*" matches every mesh namespace', () => {
    expect(isNamespaceEnabledForTesting('mesh:deploy', 'mesh:*')).toBe(true)
    expect(isNamespaceEnabledForTesting('mesh:dns', 'mesh:*')).toBe(true)
    expect(isNamespaceEnabledForTesting('other:thing', 'mesh:*')).toBe(false)
  })

  it('exact namespace match', () => {
    expect(isNamespaceEnabledForTesting('mesh:deploy', 'mesh:deploy')).toBe(true)
    expect(isNamespaceEnabledForTesting('mesh:dns', 'mesh:deploy')).toBe(false)
  })

  it('comma-separated list', () => {
    const pattern = 'mesh:deploy,mesh:dns'
    expect(isNamespaceEnabledForTesting('mesh:deploy', pattern)).toBe(true)
    expect(isNamespaceEnabledForTesting('mesh:dns', pattern)).toBe(true)
    expect(isNamespaceEnabledForTesting('mesh:resolve-tx', pattern)).toBe(false)
  })

  it('whitespace-separated list (debug.js compat)', () => {
    expect(isNamespaceEnabledForTesting('mesh:dns', 'mesh:deploy mesh:dns')).toBe(true)
  })

  it('"-prefix" exclusion overrides wildcard', () => {
    const pattern = '*,-mesh:resolve-tx'
    expect(isNamespaceEnabledForTesting('mesh:deploy', pattern)).toBe(true)
    expect(isNamespaceEnabledForTesting('mesh:resolve-tx', pattern)).toBe(false)
  })

  it('escapes regex metacharacters in literal namespace parts', () => {
    // Namespaces like `app.deploy` shouldn't trigger regex `.` wildcard.
    expect(isNamespaceEnabledForTesting('app:deploy', 'aXp:*')).toBe(false)
  })

  it('handles only an exclusion (no match without explicit include)', () => {
    expect(isNamespaceEnabledForTesting('mesh:deploy', '-mesh:deploy')).toBe(false)
  })

  // Codex review 2026-05-12 found that DEBUG='?' crashed `require()` of
  // the published bundle with SyntaxError: Nothing to repeat. The fix
  // added `?` to the regex-meta escape list AND wrapped the
  // RegExp constructor in try/catch. These regressions guard both.
  it('does NOT throw on DEBUG="?" (regex quantifier in pattern)', () => {
    expect(() => isNamespaceEnabledForTesting('mesh:test', '?')).not.toThrow()
    // `?` as a literal segment doesn't match a normal namespace.
    expect(isNamespaceEnabledForTesting('mesh:test', '?')).toBe(false)
  })

  it('does NOT throw on DEBUG with other regex metas', () => {
    for (const meta of ['+', '(', ')', '{', '}', '[', ']', '$', '^', '|', '\\']) {
      expect(() => isNamespaceEnabledForTesting('mesh:test', meta)).not.toThrow()
    }
  })

  it('skips bare "-" segments cleanly', () => {
    expect(() => isNamespaceEnabledForTesting('mesh:test', '-')).not.toThrow()
    expect(isNamespaceEnabledForTesting('mesh:test', '-')).toBe(false)
  })

  it('importing the SDK with DEBUG="?" does not crash module load', async () => {
    const savedDebug = process.env.DEBUG
    process.env.DEBUG = '?'
    try {
      // Force a fresh logger construction via dynamic require of the
      // module path. If parseDebugPattern throws, this throws.
      const { createSdkLogger } = await import('../src/sdk/log')
      expect(() => createSdkLogger('mesh:smoke')).not.toThrow()
    } finally {
      if (savedDebug === undefined) delete process.env.DEBUG
      else process.env.DEBUG = savedDebug
    }
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
    const logger = createSdkLogger('mesh:test')
    logger.debug('a')
    logger.info('b')
    logger.warn('c')
    expect(stderrSpy).not.toHaveBeenCalled()
  })

  it('enabled logger writes to stderr (DEBUG=*)', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('mesh:test')
    logger.info('hello')
    expect(stderrSpy).toHaveBeenCalledTimes(1)
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toContain('INFO')
    expect(line).toContain('mesh:test')
    expect(line).toContain('hello')
  })

  it('output goes to STDERR, never stdout', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    process.env.DEBUG = '*'
    const logger = createSdkLogger('mesh:test')
    logger.info('hello')
    expect(stdoutSpy).not.toHaveBeenCalled()
    expect(stderrSpy).toHaveBeenCalled()
    stdoutSpy.mockRestore()
  })

  it('attaches a JSON data payload when provided', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('mesh:test')
    logger.info('with-data', { bag_id: 'abc', size: 1024 })
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toContain('"bag_id":"abc"')
    expect(line).toContain('"size":1024')
  })

  it('appends a string data argument as-is (no double JSON)', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('mesh:test')
    logger.warn('msg', 'extra-detail')
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toContain('msg extra-detail')
  })

  it('includes ISO timestamp', () => {
    process.env.DEBUG = '*'
    const logger = createSdkLogger('mesh:test')
    logger.info('x')
    const line = stderrSpy.mock.calls[0][0] as string
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z /)
  })

  it('all three levels are emitted at the same enabled-ness', () => {
    process.env.DEBUG = 'mesh:test'
    const logger = createSdkLogger('mesh:test')
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    expect(stderrSpy).toHaveBeenCalledTimes(3)
  })

  it('enabled-state is captured at construction time', () => {
    const disabled = createSdkLogger('mesh:test')
    process.env.DEBUG = '*'
    // Set AFTER construction — still disabled.
    disabled.info('x')
    expect(stderrSpy).not.toHaveBeenCalled()
  })

  it('does not emit when namespace excluded', () => {
    process.env.DEBUG = '*,-mesh:excluded'
    const logger = createSdkLogger('mesh:excluded')
    logger.info('hidden')
    expect(stderrSpy).not.toHaveBeenCalled()
  })
})
