import { describe, it, expect } from 'vitest'
import { createWalletUI } from '../../src/wallet/ui'

interface FakeWallet {
  name: string
}

const wallets: FakeWallet[] = [
  { name: 'Wallet' },           // Telegram Wallet (the auto-pick we don't want)
  { name: 'Tonkeeper' },
  { name: 'MyTonWallet' },
]

describe('createWalletUI — non-interactive auto-pick', () => {
  it('falls back to defaultPick (idx 0) when no preferByName is set', async () => {
    const ui = createWalletUI({ interactive: false })
    const picked = await ui.choose('Choose', wallets, (w) => w.name)
    expect(picked.name).toBe('Wallet')
  })

  it('honors defaultPick index', async () => {
    const ui = createWalletUI({ interactive: false, defaultPick: 1 })
    const picked = await ui.choose('Choose', wallets, (w) => w.name)
    expect(picked.name).toBe('Tonkeeper')
  })

  it('preferByName beats defaultPick (case-insensitive substring)', async () => {
    const ui = createWalletUI({ interactive: false, preferByName: 'tonkeeper' })
    const picked = await ui.choose('Choose', wallets, (w) => w.name)
    expect(picked.name).toBe('Tonkeeper')
  })

  it('preferByName matches partial substrings', async () => {
    const ui = createWalletUI({ interactive: false, preferByName: 'mytonwallet' })
    const picked = await ui.choose('Choose', wallets, (w) => w.name)
    expect(picked.name).toBe('MyTonWallet')
  })

  it('throws when preferByName matches nothing, listing available wallets', async () => {
    const ui = createWalletUI({ interactive: false, preferByName: 'nopebrowser' })
    await expect(ui.choose('Choose', wallets, (w) => w.name)).rejects.toThrow(
      /No option matches.*nopebrowser.*Wallet, Tonkeeper, MyTonWallet/,
    )
  })

  it('throws on empty options', async () => {
    const ui = createWalletUI({ interactive: false, preferByName: 'tonkeeper' })
    await expect(ui.choose('Choose', [] as FakeWallet[], (w) => w.name)).rejects.toThrow(
      /No options to choose from/,
    )
  })
})
