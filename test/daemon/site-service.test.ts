import { describe, expect, it } from 'vitest'
import {
  buildSiteLaunchdPlist,
  buildSiteSystemdUnit,
  siteServeArgs,
  siteServiceLabel,
  siteDir,
  stopSiteService,
  SiteServiceError,
  type SiteServiceMeta,
} from '../../src/daemon/site-service'

function meta(over: Partial<SiteServiceMeta> = {}): SiteServiceMeta {
  return {
    domain: 'mysite.ton',
    label: 'ton-mesh-site.mysite.ton',
    build_dir: '/home/u/site/out',
    site_keyring: '/home/u/.ton-mesh/site-keyring/mysite.ton.hex',
    public_ip: null,
    udp_port: null,
    node_path: '/usr/bin/node',
    cli_entry: '/home/u/.ton-mesh/node_modules/.bin/ton-mesh-harness',
    adnl_short_id: 'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516',
    created_at: '2026-06-22T00:00:00.000Z',
    ...over,
  }
}

describe('site service labels + paths', () => {
  it('labels per domain', () => {
    expect(siteServiceLabel('mysite.ton')).toBe('ton-mesh-site.mysite.ton')
    expect(siteDir('mysite.ton')).toMatch(/\.ton-mesh[/\\]sites[/\\]mysite\.ton$/)
  })
})

describe('siteServeArgs', () => {
  it('builds the site-serve argv (node + cli + flags)', () => {
    const args = siteServeArgs(meta())
    expect(args.slice(0, 3)).toEqual(['/usr/bin/node', meta().cli_entry, 'site-serve'])
    expect(args).toContain('--build-dir')
    expect(args).toContain('/home/u/site/out')
    expect(args).toContain('--domain')
    expect(args).toContain('mysite.ton')
    expect(args).toContain('--site-keyring')
    expect(args).toContain('/home/u/.ton-mesh/site-keyring/mysite.ton.hex')
    // optional flags omitted when null
    expect(args).not.toContain('--site-public-ip')
    expect(args).not.toContain('--site-udp-port')
  })

  it('includes pinned public-ip + udp-port when set', () => {
    const args = siteServeArgs(meta({ public_ip: '203.0.113.7', udp_port: 17655 }))
    expect(args).toContain('--site-public-ip')
    expect(args).toContain('203.0.113.7')
    expect(args).toContain('--site-udp-port')
    expect(args).toContain('17655')
  })
})

describe('buildSiteLaunchdPlist', () => {
  it('runs site-serve and restarts ONLY on unsuccessful exit (no #37 resurrection)', () => {
    const p = buildSiteLaunchdPlist(meta())
    expect(p).toContain('<string>ton-mesh-site.mysite.ton</string>')
    expect(p).toContain('<string>site-serve</string>')
    expect(p).toContain('<string>--domain</string>')
    expect(p).toContain('<string>mysite.ton</string>')
    // KeepAlive only on unsuccessful exit — a clean stop (exit 0) stays stopped.
    expect(p).toContain('<key>KeepAlive</key>')
    expect(p).toContain('<key>SuccessfulExit</key>')
    expect(p).toContain('<false/>')
  })
})

describe('buildSiteSystemdUnit', () => {
  it('ExecStart runs site-serve with Restart=on-failure', () => {
    const u = buildSiteSystemdUnit(meta())
    expect(u).toContain('ExecStart=/usr/bin/node')
    expect(u).toContain('site-serve')
    expect(u).toContain('--build-dir /home/u/site/out')
    expect(u).toContain('--domain mysite.ton')
    expect(u).toContain('Restart=on-failure')
    expect(u).toContain('WantedBy=default.target')
  })

  it('quotes args containing spaces', () => {
    const u = buildSiteSystemdUnit(meta({ build_dir: '/home/u/my site/out' }))
    expect(u).toContain('"/home/u/my site/out"')
  })
})

describe('domain validation (path-traversal guard)', () => {
  // stopSiteService → rmSync(siteDir(domain)) when --purge; a hostile domain
  // must be rejected before it can escape SITES_ROOT.
  it.each(['../../etc', '..', 'a/b', '', 'UPPER.ton', 'has space.ton', '.leading', 'trailing.'])(
    'stopSiteService rejects invalid domain %j',
    (bad) => {
      expect(() => stopSiteService(bad)).toThrow(SiteServiceError)
    },
  )
})
