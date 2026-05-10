// Free-port probes shared by every daemon process module
// (tonutils-process, rldp-http-proxy-process, ton-core process).
//
// `findFreeTcpPort` opens a TCP listener on 127.0.0.1 to verify the port
// is bindable, then closes it. `findFreeUdpPort` opens a UDP socket on
// 0.0.0.0. Both are subject to a probe-then-spawn race — a third party
// could grab the port between our close() and the daemon's bind(). We
// accept the race because the alternative (fork-then-pass-fd-to-child)
// is too much plumbing; daemon process modules early-exit on bind panic.

import net from 'net'
import dgram from 'dgram'

/**
 * Probe TCP ports in `[min, max]` on 127.0.0.1. Returns the first port
 * that accepts a listener. Throws if the entire range is busy.
 *
 * Default range matches the legacy export from `tonutils-process.ts`
 * (7100–7199) so call sites that did `findFreePort()` without arguments
 * keep working.
 */
export function findFreeTcpPort(min = 7100, max = 7199): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port > max) {
        reject(new Error(`No free port found in range ${min}-${max}`))
        return
      }
      const server = net.createServer()
      server.listen(port, '127.0.0.1', () => {
        server.close(() => resolve(port))
      })
      server.on('error', () => tryPort(port + 1))
    }
    tryPort(min)
  })
}

/**
 * Probe UDP ports in `[min, max]` on 0.0.0.0. Returns the first that
 * binds. Throws if every port in the range is busy.
 */
export async function findFreeUdpPort(min = 17556, max = 17600): Promise<number> {
  for (let p = min; p <= max; p++) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await new Promise<boolean>((resolve) => {
      const s = dgram.createSocket('udp4')
      s.once('error', () => resolve(false))
      s.bind(p, '0.0.0.0', () => {
        s.close(() => resolve(true))
      })
    })
    if (ok) return p
  }
  throw new Error(`No free UDP port in range ${min}-${max} for daemon ListenAddr`)
}
