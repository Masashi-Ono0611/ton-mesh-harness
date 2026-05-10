export interface CliOptions {
  testnet?: boolean
  desc?: string
  domain?: string
  provider?: string | true   // address string = specific, true = auto-select cheapest
  span?: string              // provider contract span in seconds (uint32)
  ciMode?: boolean
  jsonOutput?: boolean
  skipVerify?: boolean
  watch?: boolean
  debounce?: string
}

export interface DaemonContext {
  daemon: import('../daemon').DaemonHandle
  cleanup: () => void
}
