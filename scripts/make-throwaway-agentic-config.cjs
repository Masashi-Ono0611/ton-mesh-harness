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

/**
 * Build the plaintext config object the SDK's strict loader
 * (src/sdk/agentic-config.ts — StoredStandardWalletSchema, `.strict()`) accepts.
 * Pure + exported so a unit test can round-trip it through loadAgenticConfig and
 * catch a future @ton/mcp schema bump in CI, not only at e2e runtime (#148).
 */
function buildThrowawayConfig({ network, mnemonic, address, id, now }) {
  return {
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
        mnemonic,
        created_at: now,
        updated_at: now,
      },
    ],
  }
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const netIdx = args.indexOf('--network')
  if (netIdx >= 0 && !args[netIdx + 1]) {
    console.error('--network requires a value (mainnet|testnet)')
    process.exit(1)
  }
  const network = netIdx >= 0 ? args[netIdx + 1] : 'mainnet'
  if (network !== 'mainnet' && network !== 'testnet') {
    console.error(`--network must be mainnet|testnet (got "${network}")`)
    process.exit(1)
  }

  const envPath = process.env.TON_CONFIG_PATH && process.env.TON_CONFIG_PATH.trim()
  const configPath = envPath
    ? path.resolve(envPath)
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
  const config = buildThrowawayConfig({ network, mnemonic: words.join(' '), address, id, now })

  // The directory holds a plaintext mnemonic — lock it to owner-only (0700),
  // matching the 0600 file below (ssh/gnupg convention). Only the leaf is
  // tightened so intermediate dirs (e.g. ~/.config) keep their normal mode. (#148)
  const dir = path.dirname(configPath)
  fs.mkdirSync(dir, { recursive: true })
  try {
    fs.chmodSync(dir, 0o700)
  } catch {
    /* best-effort — lock the key dir to the owner */
  }
  // writeFileSync's `mode` is the file-CREATION mode — POSIX IGNORES it when
  // overwriting an EXISTING (possibly looser, e.g. 0644) file, which would write
  // the mnemonic into a world-readable file. Unlink any existing file first so
  // writeFileSync always CREATES fresh at 0600 — no window where the plaintext
  // mnemonic sits in a looser file. chmod + read the ACTUAL mode back are
  // belt-and-suspenders so the success line can't overstate the on-disk mode (#148).
  try {
    fs.unlinkSync(configPath)
  } catch {
    /* fresh create — nothing to remove */
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 })
  fs.chmodSync(configPath, 0o600)
  const modeStr = (fs.statSync(configPath).mode & 0o777).toString(8).padStart(3, '0')

  console.log(`Wrote throwaway agentic config → ${configPath} (mode ${modeStr})`)
  console.log(`  network: ${network}`)
  console.log(`  address: ${address}`)
  console.log('')
  console.log('This wallet is UNFUNDED and worthless — it only makes check_env report `agentic`.')
  console.log('The cancellation test cancels before any broadcast, so it never signs or spends.')
  console.log('')
  // Branch the printed recipe on network: the driver gates the domain on
  // network (E2E_TESTNET_DOMAIN under E2E_TESTNET=1, else E2E_MAINNET_DOMAIN), so
  // a `--network testnet` config must not print the mainnet env var (#148/#150).
  const domainEnv =
    network === 'testnet' ? 'E2E_TESTNET=1 E2E_TESTNET_DOMAIN' : 'E2E_MAINNET_DOMAIN'
  console.log('NEVER send TON to this address — the plaintext mnemonic is deleted by the rm below,')
  console.log('and the cancel fires pre-broadcast so no funds are ever needed.')
  console.log('')
  console.log('Run the cancellation e2e (use a `.ton` domain you have, e.g. masashi-ono0611.ton):')
  console.log(`  E2E_AUTO_SIGN=1 E2E_CANCEL_ONLY=1 ${domainEnv}=<your-domain>.ton \\`)
  console.log('    node scripts/e2e-mcp-deploy.cjs')
  console.log('')
  console.log(`Delete it afterwards:  rm ${configPath}`)
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Failed:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}

// Exported for the schema round-trip unit test (test/make-throwaway-config.test.ts).
// The `require.main` guard above keeps main() from running on import. (#148)
module.exports = { buildThrowawayConfig }
