export interface CliOptions {
  testnet?: boolean
  desc?: string
  domain?: string
  provider?: string | true   // address string = specific, true = auto-select cheapest
  span?: string              // provider contract span in seconds (uint32)
  wallet?: string            // wallet name (case-insensitive substring); default = Tonkeeper
  ciMode?: boolean
  jsonOutput?: boolean
  skipVerify?: boolean
  provenance?: boolean       // #34: emit .well-known/ton-deploy.json (default true; --no-provenance → false)
  watch?: boolean
  debounce?: string
  daemonBackend?: 'tonutils' | 'ton-core'  // v0.6: which backend daemon to run
  daemonMode?: 'detached' | 'embedded' | 'service'  // #37: daemon ownership (default detached)
  tunnelConfig?: string                    // v0.6: path to a nodes-pool.json for ADNL Tunnel
  announceIp?: string                      // #69: public IPv4 to announce (cloud seeder); overrides SOVEREIGN_ANNOUNCE_IP
  announcePort?: number                    // #69: fixed UDP ListenAddr port; overrides SOVEREIGN_ANNOUNCE_PORT
  siteAdnl?: string                        // v0.6 B5: 64-hex ADNL identity for `dns_adnl_address`
  siteAuto?: boolean                       // v0.7 C1: auto-spawn rldp-http-proxy + mint identity
  sitePublicIp?: string                    // v0.7 C1: override the IP published in DHT entry
  siteUdpPort?: number                     // v0.7 C1: override server UDP port
  siteKeyring?: string                     // persisted seed path for a stable site ADNL across restarts
  // v0.8 S2.8: agentic signing — autonomous DNS write
  walletMode?: 'tonconnect' | 'agentic'    // signing mode (default: tonconnect)
  walletLabel?: string                     // wallet selector for agentic mode (id/name/address)
  walletConfig?: string                    // override path for agentic config file
}

export interface DaemonContext {
  daemon: import('../daemon').DaemonHandle
  cleanup: () => void
}
