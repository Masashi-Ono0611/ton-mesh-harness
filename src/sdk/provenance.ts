/**
 * Provenance manifest (#34) — a signed claim the deployer publishes inside
 * the bag at `.well-known/ton-deploy.json`, so a verifier can confirm
 * "this `.ton` domain was deployed by this wallet, with this kit, on this
 * date".
 *
 * Design notes:
 *  - The claim deliberately does NOT carry `bag_id` (it lives inside the
 *    bag, whose id is the content hash — including bag_id would be
 *    circular) nor `dns_tx_hash` (not known until after the bag exists).
 *    The bag_id ↔ domain binding is provided by the on-chain DNS record,
 *    which the deployer's wallet signed in the change_dns_record tx.
 *  - Signing is feasible only on the agentic path (we hold an Ed25519
 *    operator/standard key). TonConnect can't sign arbitrary bytes, so a
 *    TonConnect deploy emits an UNSIGNED manifest (`signed: false`).
 *
 * NO `console.*` IN THIS FILE — lint-enforced (src/sdk/*).
 */

import fs from 'node:fs'
import path from 'node:path'
import { keyPairFromSeed, sign, signVerify } from '@ton/crypto'
import { loadAgenticConfig } from './agentic-config'
import { SOVEREIGN_DEPLOY_VERSION } from '../version'

export const PROVENANCE_MANIFEST_VERSION = 1
export const PROVENANCE_KIT_NAME = 'ton-sovereign-deploy'
export const PROVENANCE_RELPATH = '.well-known/ton-deploy.json'

/** The signed part of the manifest — the immutable, pre-bag-creation claim. */
export interface ProvenanceClaim {
  manifest_version: number
  kit: string
  kit_version: string
  domain: string
  /** Deployer wallet address; null when unknown at write time (TonConnect). */
  deployer_address: string | null
  /** ISO-8601 UTC. */
  deployed_at: string
}

export interface ProvenanceManifest extends ProvenanceClaim {
  signed: boolean
  /** Ed25519 public key (hex) that signed the claim; null when unsigned. */
  public_key: string | null
  /** Ed25519 detached signature over the canonical claim (base64); null when unsigned. */
  signature: string | null
}

const CLAIM_KEYS: (keyof ProvenanceClaim)[] = [
  'manifest_version',
  'kit',
  'kit_version',
  'domain',
  'deployer_address',
  'deployed_at',
]

/**
 * Deterministic serialization of the claim — sorted keys, no insignificant
 * whitespace — so signer and verifier hash byte-identical input.
 */
export function canonicalizeClaim(claim: ProvenanceClaim): string {
  const ordered: Record<string, unknown> = {}
  for (const k of [...CLAIM_KEYS].sort()) ordered[k] = claim[k]
  return JSON.stringify(ordered)
}

/**
 * Extract a 32-byte Ed25519 seed from a hex private key. Accepts a 32-byte
 * (64 hex) seed or a 64-byte (128 hex) combined keypair — the seed is the
 * first 32 bytes either way (matches @ton/mcp's convention).
 */
export function seedFromHex(privateKeyHex: string): Buffer {
  const stripped = privateKeyHex.replace(/^0x/i, '').trim()
  if (!/^[0-9a-fA-F]+$/.test(stripped) || (stripped.length !== 64 && stripped.length !== 128)) {
    throw new Error('invalid private key: expected 64 or 128 hex chars')
  }
  const buf = Buffer.from(stripped, 'hex')
  return buf.length === 64 ? buf.subarray(0, 32) : buf
}

/** Build a manifest from a claim; sign it if a seed is provided. */
export function buildManifest(claim: ProvenanceClaim, seed?: Buffer | null): ProvenanceManifest {
  if (!seed) {
    return { ...claim, signed: false, public_key: null, signature: null }
  }
  const kp = keyPairFromSeed(seed)
  const signature = sign(Buffer.from(canonicalizeClaim(claim), 'utf8'), kp.secretKey)
  return {
    ...claim,
    signed: true,
    public_key: kp.publicKey.toString('hex'),
    signature: signature.toString('base64'),
  }
}

export interface ProvenanceVerifyResult {
  signed: boolean
  valid: boolean
  claim: ProvenanceClaim
  reason?: string
}

/** Verify a manifest's signature (if any) against its embedded public key. */
export function verifyManifest(manifest: ProvenanceManifest): ProvenanceVerifyResult {
  const claim: ProvenanceClaim = {
    manifest_version: manifest.manifest_version,
    kit: manifest.kit,
    kit_version: manifest.kit_version,
    domain: manifest.domain,
    deployer_address: manifest.deployer_address,
    deployed_at: manifest.deployed_at,
  }
  if (!manifest.signed || !manifest.signature || !manifest.public_key) {
    return { signed: false, valid: false, claim, reason: 'manifest is unsigned' }
  }
  let valid = false
  try {
    valid = signVerify(
      Buffer.from(canonicalizeClaim(claim), 'utf8'),
      Buffer.from(manifest.signature, 'base64'),
      Buffer.from(manifest.public_key, 'hex'),
    )
  } catch {
    return { signed: true, valid: false, claim, reason: 'malformed signature or public key' }
  }
  return { signed: true, valid, claim, reason: valid ? undefined : 'signature does not match public key' }
}

/** Write the manifest into `<sourceDir>/.well-known/ton-deploy.json`. */
export function writeManifest(sourceDir: string, manifest: ProvenanceManifest): string {
  const dir = path.join(sourceDir, '.well-known')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'ton-deploy.json')
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n')
  return file
}

export interface EmitProvenanceParams {
  sourceDir: string
  domain: string
  walletKind: 'tonconnect' | 'agentic'
  testnet: boolean
  /** For the agentic path: how to locate the signing wallet. */
  agentic?: { config_path?: string; wallet_label?: string }
}

export interface EmitProvenanceResult {
  written: boolean
  file?: string
  signed?: boolean
  /** Set when `written` is false — the (non-fatal) reason emission was skipped. */
  reason?: string
}

/**
 * Best-effort provenance emission shared by the SDK deploy() hook and the
 * CLI adapter. NEVER throws — any failure returns `{ written: false,
 * reason }`. Signs on the agentic path (operator/standard key); emits an
 * unsigned claim on TonConnect (no address known, can't sign).
 */
export function emitProvenanceManifest(params: EmitProvenanceParams): EmitProvenanceResult {
  try {
    let deployerAddress: string | null = null
    let seed: Buffer | null = null
    if (params.walletKind === 'agentic') {
      const sel = loadAgenticConfig({
        config_path: params.agentic?.config_path,
        wallet_label: params.agentic?.wallet_label,
        network: params.testnet ? 'testnet' : 'mainnet',
      })
      deployerAddress = sel.wallet.address
      const pk =
        sel.wallet.type === 'agentic' ? sel.wallet.operator_private_key : sel.wallet.private_key
      if (pk) seed = seedFromHex(pk)
    }
    const manifest = buildManifest(
      {
        manifest_version: PROVENANCE_MANIFEST_VERSION,
        kit: PROVENANCE_KIT_NAME,
        kit_version: SOVEREIGN_DEPLOY_VERSION,
        domain: params.domain,
        deployer_address: deployerAddress,
        deployed_at: new Date().toISOString(),
      },
      seed,
    )
    const file = writeManifest(params.sourceDir, manifest)
    return { written: true, file, signed: manifest.signed }
  } catch (err) {
    return { written: false, reason: err instanceof Error ? err.message : String(err) }
  }
}
