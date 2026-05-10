import ora from 'ora'

export interface Spinner {
  succeed: (msg?: string) => void
  fail: (msg?: string) => void
  warn: (msg?: string) => void
}

export interface SpinnerFactory {
  start: (msg: string) => Spinner
}

export interface SpinnerFactoryOptions {
  // Drop everything to /dev/null. Use when the caller's stdout must remain
  // valid JSON (e.g. `--json-output`) — Codex C1 was about exactly this.
  silent?: boolean
  // Skip the animated ora spinner (CI mode); still emit success/failure
  // text via console.log so logs stay diagnosable. The factory used to
  // be a complete no-op in CI mode and that hid an anomaly during
  // round-5 mainnet soak.
  plain?: boolean
}

export function createSpinnerFactory(opts: boolean | SpinnerFactoryOptions = {}): SpinnerFactory {
  // Back-compat: legacy callers pass a single boolean meaning "isCI".
  // Treat true as plain (logs visible), false as full ora spinner.
  const norm: SpinnerFactoryOptions = typeof opts === 'boolean' ? { plain: opts } : opts

  if (norm.silent) {
    return {
      start: () => ({ succeed: () => {}, fail: () => {}, warn: () => {} }),
    }
  }

  if (norm.plain) {
    return {
      start: (startMsg: string) => {
        if (startMsg) console.log(`  ${startMsg}`)
        return {
          succeed: (msg?: string) => { if (msg) console.log(`  ✔ ${msg}`) },
          fail:    (msg?: string) => { if (msg) console.log(`  ✗ ${msg}`); else console.log(`  ✗ ${startMsg}`) },
          warn:    (msg?: string) => { if (msg) console.log(`  ⚠ ${msg}`) },
        }
      },
    }
  }

  // Default: animated spinner via ora.
  return {
    start: (msg: string) => ora(msg).start() as unknown as Spinner,
  }
}
