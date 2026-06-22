import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import path from 'path'
import os from 'os'
import {
  parseAnnounceEnv,
  ensureTonutilsConfig,
  resolveAnnounce,
  announceIpFromEnv,
  announcePortFromEnv,
} from '../src/daemon/tonutils-process'
import { DeployOptionsSchema } from '../src/sdk/schemas'

/**
 * Cloud-seeder fix (dogfood 2026-06-21). A kit-managed tonutils-storage
 * daemon binds 0.0.0.0:<random udp> and never set ExternalIP, so on a public
 * VM behind 1:1 NAT it announced nothing reachable ("server mode: false").
 * MESH_ANNOUNCE_IP / _PORT let an operator run the kit as a reachable
 * seeder by writing config.json ExternalIP + a fixed ListenAddr port.
 */
describe('parseAnnounceEnv (cloud-seeder env knobs)', () => {
  it('returns an empty object when no env vars are set', () => {
    expect(parseAnnounceEnv({})).toEqual({})
  })

  it('parses a valid IPv4 announce IP', () => {
    expect(parseAnnounceEnv({ MESH_ANNOUNCE_IP: '136.114.135.19' })).toEqual({
      externalIp: '136.114.135.19',
    })
  })

  it('rejects an IPv6 announce IP (the daemon binds IPv4 0.0.0.0 only)', () => {
    // Accepting IPv6 here while ListenAddr stays 0.0.0.0 would advertise an
    // address the node cannot serve. Fail fast instead.
    expect(() => parseAnnounceEnv({ MESH_ANNOUNCE_IP: '2001:db8::1' })).toThrow(/IPv4/)
  })

  it('throws fast on a malformed announce IP (no silent unreachable node)', () => {
    expect(() => parseAnnounceEnv({ MESH_ANNOUNCE_IP: 'not-an-ip' })).toThrow(/IPv4/)
  })

  it('parses a valid announce port', () => {
    expect(parseAnnounceEnv({ MESH_ANNOUNCE_PORT: '13333' })).toEqual({ listenPort: 13333 })
  })

  it('throws on an out-of-range port', () => {
    expect(() => parseAnnounceEnv({ MESH_ANNOUNCE_PORT: '70000' })).toThrow(/1\.\.65535/)
  })

  it('throws on a non-integer port', () => {
    expect(() => parseAnnounceEnv({ MESH_ANNOUNCE_PORT: 'abc' })).toThrow(/1\.\.65535/)
  })

  it('combines IP + port for a real cloud seeder', () => {
    expect(
      parseAnnounceEnv({ MESH_ANNOUNCE_IP: '1.2.3.4', MESH_ANNOUNCE_PORT: '5555' }),
    ).toEqual({ externalIp: '1.2.3.4', listenPort: 5555 })
  })

  it('ignores blank env values', () => {
    expect(parseAnnounceEnv({ MESH_ANNOUNCE_IP: '  ', MESH_ANNOUNCE_PORT: '' })).toEqual({})
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

describe('per-field env getters (#69)', () => {
  it('announceIpFromEnv: valid IPv4 → ip, garbage → throw, absent → undefined', () => {
    expect(announceIpFromEnv({ MESH_ANNOUNCE_IP: '1.2.3.4' })).toBe('1.2.3.4')
    expect(() => announceIpFromEnv({ MESH_ANNOUNCE_IP: 'bad' })).toThrow(/IPv4/)
    expect(announceIpFromEnv({})).toBeUndefined()
  })

  it('announcePortFromEnv: valid → number, out-of-range → throw, absent → undefined', () => {
    expect(announcePortFromEnv({ MESH_ANNOUNCE_PORT: '13333' })).toBe(13333)
    expect(() => announcePortFromEnv({ MESH_ANNOUNCE_PORT: '70000' })).toThrow(/1\.\.65535/)
    expect(announcePortFromEnv({})).toBeUndefined()
  })
})

describe('resolveAnnounce (#69 CLI-flag-over-env precedence)', () => {
  it('explicit (CLI flag) values win over env', () => {
    expect(
      resolveAnnounce({ externalIp: '1.2.3.4', listenPort: 1111 }, {
        MESH_ANNOUNCE_IP: '9.9.9.9',
        MESH_ANNOUNCE_PORT: '9999',
      }),
    ).toEqual({ externalIp: '1.2.3.4', listenPort: 1111 })
  })

  it('falls back to env per-field when an explicit field is missing', () => {
    expect(
      resolveAnnounce({ externalIp: '1.2.3.4' }, { MESH_ANNOUNCE_PORT: '9999' }),
    ).toEqual({ externalIp: '1.2.3.4', listenPort: 9999 })
  })

  it('does NOT validate the env var for an overridden field (Codex review)', () => {
    // --announce-ip given + a STALE malformed MESH_ANNOUNCE_IP must not
    // abort the command: the ip env is short-circuited, only the port env reads.
    expect(
      resolveAnnounce({ externalIp: '1.2.3.4' }, {
        MESH_ANNOUNCE_IP: 'garbage',
        MESH_ANNOUNCE_PORT: '13333',
      }),
    ).toEqual({ externalIp: '1.2.3.4', listenPort: 13333 })
  })

  it('uses env entirely when no explicit values are given', () => {
    expect(
      resolveAnnounce({}, { MESH_ANNOUNCE_IP: '9.9.9.9', MESH_ANNOUNCE_PORT: '9999' }),
    ).toEqual({ externalIp: '9.9.9.9', listenPort: 9999 })
  })

  it('yields undefined fields when neither source provides them', () => {
    expect(resolveAnnounce({}, {})).toEqual({ externalIp: undefined, listenPort: undefined })
  })
})

describe('DeployOptionsSchema announce fields (#69)', () => {
  const base = { source_dir: './build' }

  it('accepts a valid IPv4 announce_ip + port', () => {
    const p = DeployOptionsSchema.parse({ ...base, announce_ip: '136.114.135.19', announce_port: 13333 })
    expect(p.announce_ip).toBe('136.114.135.19')
    expect(p.announce_port).toBe(13333)
  })

  it('defaults announce_ip / announce_port to null when omitted', () => {
    const p = DeployOptionsSchema.parse(base)
    expect(p.announce_ip).toBeNull()
    expect(p.announce_port).toBeNull()
  })

  it('rejects a non-IPv4 announce_ip (IPv6 / garbage)', () => {
    expect(() => DeployOptionsSchema.parse({ ...base, announce_ip: '2001:db8::1' })).toThrow()
    expect(() => DeployOptionsSchema.parse({ ...base, announce_ip: 'not-an-ip' })).toThrow()
  })

  it('rejects an out-of-range announce_port', () => {
    expect(() => DeployOptionsSchema.parse({ ...base, announce_port: 70000 })).toThrow()
    expect(() => DeployOptionsSchema.parse({ ...base, announce_port: 0 })).toThrow()
  })
})
