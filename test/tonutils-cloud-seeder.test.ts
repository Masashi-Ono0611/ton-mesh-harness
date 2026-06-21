import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import path from 'path'
import os from 'os'
import { parseAnnounceEnv, ensureTonutilsConfig } from '../src/daemon/tonutils-process'

/**
 * Cloud-seeder fix (dogfood 2026-06-21). A kit-managed tonutils-storage
 * daemon binds 0.0.0.0:<random udp> and never set ExternalIP, so on a public
 * VM behind 1:1 NAT it announced nothing reachable ("server mode: false").
 * SOVEREIGN_ANNOUNCE_IP / _PORT let an operator run the kit as a reachable
 * seeder by writing config.json ExternalIP + a fixed ListenAddr port.
 */
describe('parseAnnounceEnv (cloud-seeder env knobs)', () => {
  it('returns an empty object when no env vars are set', () => {
    expect(parseAnnounceEnv({})).toEqual({})
  })

  it('parses a valid IPv4 announce IP', () => {
    expect(parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_IP: '136.114.135.19' })).toEqual({
      externalIp: '136.114.135.19',
    })
  })

  it('rejects an IPv6 announce IP (the daemon binds IPv4 0.0.0.0 only)', () => {
    // Accepting IPv6 here while ListenAddr stays 0.0.0.0 would advertise an
    // address the node cannot serve. Fail fast instead.
    expect(() => parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_IP: '2001:db8::1' })).toThrow(/IPv4/)
  })

  it('throws fast on a malformed announce IP (no silent unreachable node)', () => {
    expect(() => parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_IP: 'not-an-ip' })).toThrow(/IPv4/)
  })

  it('parses a valid announce port', () => {
    expect(parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_PORT: '13333' })).toEqual({ listenPort: 13333 })
  })

  it('throws on an out-of-range port', () => {
    expect(() => parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_PORT: '70000' })).toThrow(/1\.\.65535/)
  })

  it('throws on a non-integer port', () => {
    expect(() => parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_PORT: 'abc' })).toThrow(/1\.\.65535/)
  })

  it('combines IP + port for a real cloud seeder', () => {
    expect(
      parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_IP: '1.2.3.4', SOVEREIGN_ANNOUNCE_PORT: '5555' }),
    ).toEqual({ externalIp: '1.2.3.4', listenPort: 5555 })
  })

  it('ignores blank env values', () => {
    expect(parseAnnounceEnv({ SOVEREIGN_ANNOUNCE_IP: '  ', SOVEREIGN_ANNOUNCE_PORT: '' })).toEqual({})
  })
})

describe('ensureTonutilsConfig (announce overrides)', () => {
  function stageConfig(): { dbDir: string; configPath: string; cleanup: () => void } {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'ton-seeder-test-'))
    const dbDir = path.join(dir, 'db')
    mkdirSync(dbDir, { recursive: true })
    const configPath = path.join(dbDir, 'config.json')
    // Pre-stage config.json so ensureTonutilsConfig skips the daemon spawn
    // (it only spawns to generate the file when it does not already exist).
    writeFileSync(
      configPath,
      JSON.stringify({ Key: 'x', ListenAddr: '0.0.0.0:17555', ExternalIP: '' }, null, '\t'),
    )
    return { dbDir, configPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
  }

  it('writes ExternalIP and a fixed ListenAddr port when both are provided', async () => {
    const { dbDir, configPath, cleanup } = stageConfig()
    try {
      await ensureTonutilsConfig('/nonexistent/daemon', dbDir, {
        externalIp: '136.114.135.19',
        listenPort: 13333,
      })
      const cfg = JSON.parse(readFileSync(configPath, 'utf-8'))
      expect(cfg.ExternalIP).toBe('136.114.135.19')
      expect(cfg.ListenAddr).toBe('0.0.0.0:13333')
    } finally {
      cleanup()
    }
  })

  it('preserves historic behaviour (empty ExternalIP, auto port) with no announce opts', async () => {
    const { dbDir, configPath, cleanup } = stageConfig()
    try {
      await ensureTonutilsConfig('/nonexistent/daemon', dbDir, {})
      const cfg = JSON.parse(readFileSync(configPath, 'utf-8'))
      expect(cfg.ExternalIP).toBe('')
      expect(cfg.ListenAddr).toMatch(/^0\.0\.0\.0:\d+$/)
    } finally {
      cleanup()
    }
  })
})
