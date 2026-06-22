import fs from 'node:fs'
import chalk from 'chalk'
import { verifyManifest, type ProvenanceManifest } from '../sdk/provenance'

/**
 * `ton-mesh-harness verify-provenance <file|url>` (#34).
 *
 * Reads a `.well-known/ton-deploy.json` manifest — from a local path, or
 * fetched from an `http(s)://` URL (e.g. a gateway serving the deployed
 * `.ton` site) — and verifies its Ed25519 signature over the deployer
 * claim. Prints the claim + verdict.
 * Exit 0 = signed & valid; 1 = unsigned, invalid, or unreadable.
 */
async function readManifestSource(target: string): Promise<string> {
  if (/^https?:\/\//i.test(target)) {
    const res = await fetch(target)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${target}`)
    return await res.text()
  }
  return fs.readFileSync(target, 'utf8')
}

export async function runVerifyProvenance(target: string): Promise<void> {
  let manifest: ProvenanceManifest
  try {
    manifest = JSON.parse(await readManifestSource(target)) as ProvenanceManifest
  } catch (err) {
    console.error(chalk.red(`Could not read manifest: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  }

  const v = verifyManifest(manifest)
  console.log()
  console.log(chalk.bold('Provenance manifest'))
  console.log(`  domain:           ${manifest.domain ?? '(none)'}`)
  console.log(`  deployer_address: ${manifest.deployer_address ?? '(none)'}`)
  console.log(`  kit:              ${manifest.kit}@${manifest.kit_version}`)
  console.log(`  deployed_at:      ${manifest.deployed_at}`)
  console.log()

  if (!v.signed) {
    console.log(chalk.yellow('⚠ unsigned manifest — provenance claim is not cryptographically attested'))
    process.exit(1)
  }
  if (v.valid) {
    console.log(chalk.green('✓ signature valid'))
    console.log(chalk.dim(`  public_key: ${manifest.public_key}`))
    process.exit(0)
  }
  console.log(chalk.red(`✗ signature INVALID — ${v.reason}`))
  process.exit(1)
}
