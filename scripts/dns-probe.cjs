// Probe .ton DNS via the actual on-chain contract get-method (dnsresolve),
// not through TONAPI's interpreter which collapses a few cases.
const { TonClient, Address, beginCell } = require('@ton/ton')

const ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC'
const SITES = [
  ['piracy.ton',           '0:d48f543640ebdc83d4b1933f13b7bf4ac2e6cfce14321553dcc4271b3cb0faef'],
  ['manifesto.ton',        '0:343ad07762154d04a7ba561e2029a7bf54033fcd2106ef4592cf4e390a222666'],
  ['boards.ton',           '0:97d50238f73ef559c2c4a7371c23ad93211f7df86fe07a7cea9449c7b4c7f88e'],
  ['tonnet-sync-check.ton','0:b9d4ab8e772b8b51fb7dd825655e744835c3ac13ca8b699622c6958a8682fe3a'],
  ['foundation.ton',       '0:78dfe54299fd7b3bb60c779d5f02f3a370c902c38e8dff724c0a87a01ff643a3'],
]

// TEP-0081 categories
const CATEGORY = {
  'site (dns_adnl_address)':     0xfbae041b,    // sha256("site") truncated to 32 bits — actually full sha256 needed
  'storage (dns_storage_address)': 0x53dca2c2, // sha256("storage")
}

const { createHash } = require('crypto')
function sha256int(s) {
  const buf = createHash('sha256').update(s).digest()
  return BigInt('0x' + buf.toString('hex'))  // 256-bit
}

// dnsresolve takes:
//   subdomain bytes (slice ending in null)
//   category (int)
// We pass an empty slice (just '\0' = root of the resolved NFT) and the category we want.

async function probe() {
  const client = new TonClient({ endpoint: ENDPOINT })

  for (const [domain, nftAddr] of SITES) {
    console.log('=========', domain, '=========')
    for (const [name, _] of Object.entries({ site: 'site', storage: 'storage', wallet: 'wallet', dns_next_resolver: 'dns_next_resolver' })) {
      const cat = sha256int(name)
      const subdomainSlice = beginCell().storeUint(0, 8).endCell()  // single null byte
      try {
        const result = await client.runMethod(Address.parse(nftAddr), 'dnsresolve', [
          { type: 'slice', cell: subdomainSlice },
          { type: 'int',   value: cat },
        ])
        // result.stack: [int, cell|null]
        const resolvedBits = result.stack.readNumber()
        let cell = null
        try { cell = result.stack.readCell() } catch { /* may be null */ }
        if (cell) {
          // Read first 16 bits to see record magic
          const slice = cell.beginParse()
          const magic16 = slice.preloadUint(16)  // first 16 bits
          const magic32 = (() => { try { return cell.beginParse().preloadUint(32) } catch { return null } })()
          console.log(`  ${name.padEnd(20)} bits=${resolvedBits} cell=YES first16=0x${magic16.toString(16).padStart(4,'0')} first32=0x${magic32?.toString(16).padStart(8,'0')||'?'}`)
        } else {
          console.log(`  ${name.padEnd(20)} bits=${resolvedBits} cell=null`)
        }
      } catch (err) {
        console.log(`  ${name.padEnd(20)} ERROR: ${err.message?.slice(0, 80)}`)
      }
    }
  }
}

probe().catch(e => { console.error(e); process.exit(1) })
