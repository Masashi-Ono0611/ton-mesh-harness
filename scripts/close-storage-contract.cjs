// One-off script: send op::close_contract (0x79f937ea) to a storage contract
// to recover the funds locked when the provider failed to accept_storage_contract.
// Uses the existing TonConnect session at ~/.ton-sovereign/tonconnect.json so
// no new wallet pairing is needed. Run with: node scripts/close-storage-contract.cjs <storageContractAddress>

const path = require('path')
const fs = require('fs/promises')
const os = require('os')
const https = require('https')
const { Address, beginCell, toNano } = require('@ton/core')
const { default: TonConnect, CHAIN } = require('@tonconnect/sdk')

const STORAGE_PATH = path.join(os.homedir(), '.ton-sovereign', 'tonconnect.json')
const MANIFEST_URL = 'https://raw.githubusercontent.com/Masashi-Ono0611/sovereign-deploy-kit/main/tonconnect/manifest.json'
const OP_CLOSE_CONTRACT = 0x79f937ea

class FSStorage {
  constructor(p) { this.path = p }
  async _read() { try { return JSON.parse((await fs.readFile(this.path)).toString('utf-8')) } catch { return {} } }
  async _write(o) {
    await fs.mkdir(path.dirname(this.path), { recursive: true, mode: 0o700 })
    await fs.writeFile(this.path, JSON.stringify(o), { mode: 0o600 })
    try { await fs.chmod(this.path, 0o600) } catch { /* ignore */ }
  }
  async setItem(k, v) { const o = await this._read(); o[k] = v; await this._write(o) }
  async getItem(k) { const o = await this._read(); return o[k] ?? null }
  async removeItem(k) { const o = await this._read(); delete o[k]; await this._write(o) }
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error(`bad json: ${data.slice(0,200)}`)) }
      })
    }).on('error', reject)
  })
}

async function main() {
  const target = process.argv[2]
  if (!target) {
    console.error('Usage: node scripts/close-storage-contract.cjs <storageContractAddress>')
    process.exit(1)
  }
  const targetAddr = Address.parse(target)
  // TonConnect requires the bounceable EQ format ("EQ…") in messages[].address.
  // toRawString() (`0:0dee…`) is rejected with "Wrong 'address' format".
  const targetForTc = targetAddr.toString({ bounceable: true, urlSafe: true })
  const targetRaw   = targetAddr.toRawString()  // for TONAPI lookups (raw)

  const storage = new FSStorage(STORAGE_PATH)
  const connector = new TonConnect({ storage, manifestUrl: MANIFEST_URL })
  await connector.restoreConnection()
  if (!connector.wallet) {
    console.error('No active TonConnect session at', STORAGE_PATH)
    console.error('Run a deploy first to pair Tonkeeper, then re-run this script.')
    process.exit(1)
  }
  const fromAddr = connector.wallet.account.address
  console.log('Wallet:', fromAddr)

  // 1. Pre-snapshot
  const before = await fetchJson(`https://tonapi.io/v2/blockchain/accounts/${targetRaw}`)
  console.log(`Contract before: status=${before.status}  balance=${before.balance} nano (${(before.balance/1e9).toFixed(4)} TON)`)

  // 2. Build close_contract body
  const body = beginCell()
    .storeUint(OP_CLOSE_CONTRACT, 32)
    .storeUint(0n, 64)
    .endCell()

  // 3. Send via TonConnect
  console.log()
  console.log('Sending close_contract …')
  console.log(`  to:     ${targetForTc}  (raw: ${targetRaw})`)
  console.log(`  amount: 0.05 TON (gas; mostly returned with the contract's stash via mode 128+32)`)
  console.log('  Approve in Tonkeeper.')
  const validUntil = Math.floor(Date.now() / 1000) + 5 * 60
  const result = await connector.sendTransaction({
    validUntil,
    network: CHAIN.MAINNET,
    messages: [{
      address: targetForTc,
      amount: toNano('0.05').toString(),
      payload: body.toBoc({ idx: false, crc32: false }).toString('base64'),
    }],
  })
  console.log('Signed. Wallet response received.')

  // 4. Wait + post-snapshot
  console.log()
  console.log('Waiting 12 s for the chain to settle, then re-checking …')
  await new Promise(r => setTimeout(r, 12_000))
  const after = await fetchJson(`https://tonapi.io/v2/blockchain/accounts/${targetRaw}`)
  console.log(`Contract after:  status=${after.status}  balance=${after.balance} nano (${(after.balance/1e9).toFixed(4)} TON)`)

  console.log()
  console.log('Done. Run again or check TONAPI to confirm: nonexist or zero balance ⇒ funds are back at your wallet.')
}

main().catch(e => { console.error('Error:', e?.message || e); process.exit(1) })
