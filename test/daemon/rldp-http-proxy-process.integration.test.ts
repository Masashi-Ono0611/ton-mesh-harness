import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { startRldpHttpProxy } from '../../src/daemon/rldp-http-proxy-process'
import { ensureRldpHttpProxyBinary } from '../../src/daemon/rldp-http-proxy-installer'

const RUN = process.env.RUN_DAEMON_TESTS === '1'

describe.skipIf(!RUN)('rldp-http-proxy live spawn (RUN_DAEMON_TESTS=1)', () => {
  it('starts, accepts our minted ADNL identity, serves static files', async () => {
    ensureRldpHttpProxyBinary({ silent: true })
    const buildDir = mkdtempSync(path.join(tmpdir(), 'tsdk-proxy-build-'))
    writeFileSync(path.join(buildDir, 'index.html'), '<h1>v0.7 smoke</h1>')

    const handle = await startRldpHttpProxy({
      buildDir,
      domain: 'smoke.ton',
      // Bind to loopback so the test is host-agnostic: on a CI runner (and any
      // 1:1 NAT VM) the ipify-detected public IP isn't on a local NIC, so the
      // proxy couldn't bind `-a <publicIp>`. Loopback is always bindable. We're
      // proving the keyring loads + the proxy stays up (the #74 class), not real
      // RLDP connectivity. Override via RLDP_TEST_PUBLIC_IP if needed.
      publicIp: process.env.RLDP_TEST_PUBLIC_IP ?? '127.0.0.1',
      // Persist the seed inside the throwaway build dir so the test leaves no
      // file under ~/.ton-mesh/site-keyring/.
      siteKeyring: path.join(buildDir, 'site-seed.hex'),
      silent: true,
    })

    try {
      console.log('  identity short id:', handle.identity.shortIdHex)
      console.log('  publicIp:', handle.publicIp)
      console.log('  udpPort:', handle.udpPort)
      console.log('  localHttpPort:', handle.localHttpPort)
      console.log('  proxy pid:', handle.proxy.pid, 'exitCode:', handle.proxy.exitCode)

      // 1. Proxy still alive after spawn — i.e. it loaded the keyring by the
      //    UPPERCASE filename rldp-http-proxy expects. On case-sensitive Linux
      //    the pre-#74 lowercase name aborted here with `key not in db`; this
      //    is the structural catch for that class (#76).
      expect(handle.proxy.exitCode).toBeNull()

      // 2. Static server responds at the local URL
      const r = await fetch(`http://127.0.0.1:${handle.localHttpPort}/index.html`)
      expect(r.status).toBe(200)
      expect(await r.text()).toContain('v0.7 smoke')
    } finally {
      handle.kill()
    }
  }, 30_000)
})
