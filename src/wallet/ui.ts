import readline from 'readline'

export interface WalletUI {
  choose<T>(message: string, options: T[], display: (t: T) => string): Promise<T>
  input(message: string): Promise<string>
  write(message: string): void
  setActionPrompt(message: string): void
  clearActionPrompt(): void
}

export interface WalletUIOptions {
  interactive: boolean
  defaultPick?: number
  // Case-insensitive substring match against `display(option)`. When set and
  // running non-interactively, the first matching option is auto-selected.
  // Falls back to defaultPick if no match. Helps users pin a specific wallet
  // (e.g. "Tonkeeper") even when CI mode disables the picker.
  preferByName?: string
}

export function createWalletUI(opts: WalletUIOptions): WalletUI {
  const interactive = opts.interactive
  const defaultPick = opts.defaultPick ?? 0
  const preferByName = opts.preferByName?.trim().toLowerCase() || undefined

  return {
    async choose<T>(message: string, options: T[], display: (t: T) => string): Promise<T> {
      if (options.length === 0) {
        throw new Error(`No options to choose from for "${message}"`)
      }
      if (!interactive) {
        let idx = Math.min(defaultPick, options.length - 1)
        if (preferByName) {
          const match = options.findIndex((o) => display(o).toLowerCase().includes(preferByName))
          if (match >= 0) {
            idx = match
          } else {
            const names = options.map(display).join(', ')
            throw new Error(
              `No option matches --wallet "${preferByName}" — available: ${names}`,
            )
          }
        }
        process.stdout.write(`${message}\n  → ${display(options[idx])} (auto-selected)\n`)
        return options[idx]
      }
      process.stdout.write(`\n${message}\n`)
      options.forEach((opt, i) => process.stdout.write(`  [${i + 1}] ${display(opt)}\n`))
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      try {
        const ans = await new Promise<string>((resolve) =>
          rl.question(`Choose [1-${options.length}, default 1]: `, resolve),
        )
        const trimmed = ans.trim()
        const n = trimmed === '' ? 1 : Number(trimmed)
        if (!Number.isInteger(n) || n < 1 || n > options.length) {
          throw new Error(`Invalid selection: ${ans}`)
        }
        return options[n - 1]
      } finally {
        rl.close()
      }
    },

    async input(message: string): Promise<string> {
      if (!interactive) {
        throw new Error(`Cannot prompt for "${message}" in non-interactive mode`)
      }
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      try {
        return await new Promise<string>((resolve) => rl.question(message, resolve))
      } finally {
        rl.close()
      }
    },

    write(message: string): void {
      process.stdout.write(message)
    },

    setActionPrompt(message: string): void {
      process.stdout.write(`${message}\n`)
    },

    clearActionPrompt(): void {
      // no-op for our purposes; original Blueprint UI used this for spinner clearing
    },
  }
}
