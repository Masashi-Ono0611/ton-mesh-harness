// Local network-interface inspection for the --site-auto cloud advisory.
//
// rldp-http-proxy binds its client/outbound socket to the `-a <publicIp>`
// address. On a 1:1 NAT cloud VM (GCP/AWS) the public IP is NOT assigned to any
// local NIC, so that bind fails and the proxy can't sync the liteserver. We
// detect this before spawning and print the exact `ip addr add` fix — the kit
// never runs the privileged command itself.

import { networkInterfaces } from 'node:os'

/**
 * True iff `ip` (an IPv4 string) is assigned to a local network interface — i.e.
 * the host can bind a socket to it. On a NAT VM the announced public IP returns
 * false; on a VPS with the IP directly on the NIC it returns true.
 */
export function isPublicIpLocallyBound(ip: string): boolean {
  const ifaces = networkInterfaces()
  for (const addrs of Object.values(ifaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && addr.address === ip) return true
    }
  }
  return false
}

/**
 * Best-guess primary interface name (first non-internal IPv4 interface), used
 * only to fill the `dev <iface>` slot in the `ip addr add` hint. Returns null
 * when none is found — callers fall back to a literal `<iface>` placeholder.
 */
export function guessPrimaryIface(): string | null {
  const ifaces = networkInterfaces()
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) return name
    }
  }
  return null
}
