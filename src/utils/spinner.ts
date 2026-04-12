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
    return {
      start: () => ({
        succeed: () => {},
        fail: () => {},
        warn: () => {},
      }),
    }
  }
  const originalOra = ora
  return {
    start: (msg: string) => originalOra(msg).start() as unknown as Spinner,
  }
}
