import { describe, expect, it } from 'vitest'
import {
  buildLaunchdPlist,
  buildSystemdUnit,
  serviceLabel,
  seedDir,
  stopService,
  ServiceError,
  type ServiceMeta,
} from '../../src/daemon/service'

function meta(over: Partial<ServiceMeta> = {}): ServiceMeta {
  return {
    bag_id: 'abc123',
    label: 'ton-mesh.abc123',
    db_dir: '/home/u/.ton-mesh/seeds/abc123/db',
    api_port: 7123,
    network_config_path: null,
    daemon_path: '/home/u/.ton-mesh/bin/tonutils-storage',
    created_at: '2026-05-23T00:00:00.000Z',
    ...over,
  }
}

describe('service labels + paths', () => {
  it('labels per bag', () => {
    expect(serviceLabel('abc123')).toBe('ton-mesh.abc123')
    expect(seedDir('abc123')).toMatch(/\.ton-mesh[/\\]seeds[/\\]abc123$/)
  })
})

describe('buildLaunchdPlist', () => {
  it('emits the daemon ProgramArguments + KeepAlive', () => {
    const p = buildLaunchdPlist(meta())
    expect(p).toContain('<key>Label</key>')
    expect(p).toContain('<string>ton-mesh.abc123</string>')
    // `-daemon` (non-interactive) is mandatory: without it the REPL busy-loops
    // at ~100% CPU under launchd and floods the log. Regression guard.
    expect(p).toContain('<string>-daemon</string>')
    expect(p).toContain('<string>--db</string>')
    expect(p).toContain('<string>/home/u/.ton-mesh/seeds/abc123/db</string>')
    expect(p).toContain('<string>--api</string>')
    expect(p).toContain('<string>127.0.0.1:7123</string>')
    expect(p).toContain('<key>KeepAlive</key>')
    expect(p).not.toContain('--network-config') // null → omitted
  })

  it('includes --network-config when testnet config is set', () => {
    const p = buildLaunchdPlist(meta({ network_config_path: '/cfg/testnet.json' }))
    expect(p).toContain('<string>--network-config</string>')
    expect(p).toContain('<string>/cfg/testnet.json</string>')
  })
})

describe('bag-id validation (path-traversal guard)', () => {
  // stopService → rmSync(seedDir(bagId)) when --purge; a hostile bagId must
  // be rejected before it can escape SEEDS_ROOT.
  it.each(['../../etc', '..', 'a/b', '', 'nothex', 'g'.repeat(64), 'abc'])(
    'stopService rejects non-hex bag id %j',
    (bad) => {
      expect(() => stopService(bad)).toThrow(ServiceError)
    },
  )
})

describe('buildSystemdUnit', () => {
  it('emits ExecStart with the daemon args + restart policy', () => {
    const u = buildSystemdUnit(meta())
    expect(u).toContain('ExecStart=/home/u/.ton-mesh/bin/tonutils-storage -daemon --api 127.0.0.1:7123 --db /home/u/.ton-mesh/seeds/abc123/db')
    expect(u).toContain('Restart=on-failure')
    expect(u).toContain('WantedBy=default.target')
    expect(u).not.toContain('--network-config')
  })

  it('appends --network-config when set', () => {
    const u = buildSystemdUnit(meta({ network_config_path: '/cfg/testnet.json' }))
    expect(u).toContain('--network-config /cfg/testnet.json')
  })
})
