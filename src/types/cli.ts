export interface CliOptions {
  testnet?: boolean
  desc?: string
  domain?: string
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
