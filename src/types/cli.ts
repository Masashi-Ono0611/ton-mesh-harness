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
  watch?: boolean
  debounce?: string
  daemonBackend?: 'tonutils' | 'ton-core'  // v0.6: which backend daemon to run
  tunnelConfig?: string                    // v0.6: path to a nodes-pool.json for ADNL Tunnel
  siteAdnl?: string                        // v0.6 B5: 64-hex ADNL identity for `dns_adnl_address`
  siteAuto?: boolean                       // v0.7 C1: auto-spawn rldp-http-proxy + mint identity
  sitePublicIp?: string                    // v0.7 C1: override the IP published in DHT entry
  siteUdpPort?: number                     // v0.7 C1: override server UDP port
}

export interface DaemonContext {
  daemon: import('../daemon').DaemonHandle
  cleanup: () => void
}
