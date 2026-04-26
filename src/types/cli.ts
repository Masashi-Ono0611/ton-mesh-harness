export interface CliOptions {
  testnet?: boolean
  desc?: string
  domain?: string
  provider?: string | true   // address string = specific, true = auto-select cheapest
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
