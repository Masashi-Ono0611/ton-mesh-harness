import ora from 'ora'

export interface Spinner {
  succeed: (msg?: string) => void
  fail: (msg?: string) => void
  warn: (msg?: string) => void
}

export interface SpinnerFactory {
  start: (msg: string) => Spinner
}

export function createSpinnerFactory(isCI: boolean): SpinnerFactory {
  if (isCI) {
    // In CI / json-output mode we don't render a spinner, but we still emit
    // the success/failure text via plain console output so logs stay
    // diagnosable. The previous no-op variant silently dropped messages like
    // "Bag size: ... bytes" and "Selected provider: ...", which made a
    // pre-sign anomaly hard to catch.
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
  const originalOra = ora
  return {
    start: (msg: string) => originalOra(msg).start() as unknown as Spinner,
  }
}
