#!/usr/bin/env node
/**
 * Generate a THROWAWAY, unfunded agentic wallet config for the #123 Stage 3
 * cancellation e2e (`E2E_CANCEL_ONLY=1`). The cancel fires BEFORE the broadcast,
 * so this key NEVER signs or spends — it only makes `mesh_check_env` report an
 * `agentic` signer so Stage 3 can run. Zero value; delete the file afterwards.
 *
 * Writes `~/.config/ton/config.json` (or `$TON_CONFIG_PATH`) in the plaintext
 * shape the SDK's strict loader (`src/sdk/agentic-config.ts`) accepts. REFUSES
 * to overwrite an existing config unless `--force`, so it can't clobber a real
 * `@ton/mcp` wallet.
 *
 * Usage:
 *   node scripts/make-throwaway-agentic-config.cjs [--network mainnet|testnet] [--force]
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { mnemonicNew, mnemonicToPrivateKey } = require('@ton/crypto')
const { WalletContractV5R1 } = require('@ton/ton')

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const netIdx = args.indexOf('--network')
  const network = netIdx >= 0 ? args[netIdx + 1] : 'mainnet'
  if (network !== 'mainnet' && network !== 'testnet') {
    console.error(`--network must be mainnet|testnet (got "${network}")`)
    process.exit(1)
  }

  const envPath = process.env.TON_CONFIG_PATH && process.env.TON_CONFIG_PATH.trim()
  const configPath = envPath
    ? path.resolve(envPath.trim())
    : path.join(os.homedir(), '.config', 'ton', 'config.json')

  // Never clobber a real config — the only durable state this touches.
  if (fs.existsSync(configPath) && !force) {
    console.error(`Refusing to overwrite an existing config at ${configPath}.`)
    console.error('If that is a real @ton/mcp wallet, do NOT --force — back it up first.')
    console.error('Otherwise re-run with --force to replace it.')
    process.exit(1)
  }

  const words = await mnemonicNew() // 24-word BIP39-style TON mnemonic
  const key = await mnemonicToPrivateKey(words)
  const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: key.publicKey })
  const address = wallet.address.toString({ bounceable: false, testOnly: network === 'testnet' })

  const now = new Date().toISOString()
  const id = `e2e-cancel-throwaway-${Date.now()}`
  const config = {
    version: 2,
    active_wallet_id: id,
    networks: { [network]: {} },
    wallets: [
      {
        id,
        name: 'e2e-cancel-throwaway',
        type: 'standard',
        wallet_version: 'v5r1',
        network,
        address,
        mnemonic: words.join(' '),
        created_at: now,
        updated_at: now,
      },
    ],
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 })

  console.log(`Wrote throwaway agentic config → ${configPath} (mode 0600)`)
  console.log(`  network: ${network}`)
  console.log(`  address: ${address}`)
  console.log('')
  console.log('This wallet is UNFUNDED and worthless — it only makes check_env report `agentic`.')
  console.log('The cancellation test cancels before any broadcast, so it never signs or spends.')
  console.log('')
  console.log('Run the cancellation e2e (use a `.ton` domain you have, e.g. masashi-ono0611.ton):')
  console.log(
    '  E2E_AUTO_SIGN=1 E2E_CANCEL_ONLY=1 E2E_MAINNET_DOMAIN=<your-domain>.ton \\',
  )
  console.log('    node scripts/e2e-mcp-deploy.cjs')
  console.log('')
  console.log(`Delete it afterwards:  rm ${configPath}`)
}

main().catch((err) => {
  console.error('Failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
