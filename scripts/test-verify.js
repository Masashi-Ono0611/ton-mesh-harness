import { verifyBagOnNetwork } from './dist/verify.js'

const bagId = '7b83d319c062cae9ed314c6838870af3b1e3df0c0ca4cc06c336395cc82b7ccf'

console.log(`Checking bag: ${bagId}`)
console.log('This may take up to 60 seconds...\n')

const result = await verifyBagOnNetwork({
  bagId,
  timeoutMs: 60_000,
  intervalMs: 5_000,
})

console.log('\nResult:')
console.log(`  Accessible: ${result.accessible}`)
console.log(`  Status: ${result.statusCode ?? 'N/A'}`)
console.log(`  Latency: ${result.latencyMs ?? 'N/A'}ms`)
console.log(`  Attempts: ${result.attempts}`)
