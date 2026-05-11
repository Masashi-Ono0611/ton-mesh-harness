/**
 * Agentic-wallet config loader for `~/.config/ton/config.json` (the file
 * `@ton/mcp@alpha` writes via `agentic_start_root_wallet_setup`).
 *
 * Spec source: docs/v0.8/mcp-core-requirements.md §NF6 (filesystem-level
 * compose) + cross-verified against `@ton/mcp@0.1.15-alpha.15`'s
 * `dist/types/config.d.ts` and `dist/registry/config.d.ts` on 2026-05-11.
 *
 * Scope for v0.8.0 GA: this loader ONLY supports `type: "standard"` wallet
 * entries (mnemonic OR private_key direct sign). `type: "agentic"` entries
 * (NFT-delegated operator-key signing via the agentic collection contract)
 * are rejected with a clear error — that path requires the @ton/mcp
 * collection-contract dance which is out of scope for this release.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { createDecipheriv } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { z } from 'zod'
import { SdkError } from './deploy'

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type AgenticNetwork = 'mainnet' | 'testnet'
export type StandardWalletVersion = 'v5r1' | 'v4r2'

/** What deploy() asks for. */
export interface AgenticConfigLookup {
  /** Override path; falls back to TON_CONFIG_PATH env, then `~/.config/ton/config.json`. */
  config_path?: string
  /** Match by id, name, or address. Empty = use `active_wallet_id`. */
  wallet_label?: string
  /** Filter wallets to this network. */
  network: AgenticNetwork
}

export interface AgenticConfigSelection {
  wallet: StoredStandardWallet
  /** Per-network toncenter API key from the config (may be undefined). */
  toncenter_api_key: string | undefined
  /** Resolved config path actually loaded (for diagnostics). */
  config_path: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Strict zod schema — mirrors @ton/mcp's TonConfig (version 2)
//
// Required fields cross-checked against @ton/mcp@0.1.15-alpha.15's
// `dist/registry/config.d.ts` (StoredWalletBase / StoredStandardWallet /
// StoredAgenticWallet / TonConfig). We DO NOT `.passthrough()` at any
// inner-object level so a future @ton/mcp schema bump fails loud rather
// than silently slipping through — the SDK's signing surface depends on
// the exact shape it's reading.
// ─────────────────────────────────────────────────────────────────────────────

const NetworkEnum = z.enum(['mainnet', 'testnet'])

// `.strict()` on wallet objects — drift in @ton/mcp's wallet schema
// should fail loud rather than silently slip through.
const StoredStandardWalletSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.literal('standard'),
    wallet_version: z.enum(['v5r1', 'v4r2']),
    network: NetworkEnum,
    address: z.string(),
    mnemonic: z.string().optional(),
    private_key: z.string().optional(),
    removed: z.boolean().optional(),
    removed_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict()
  .refine((v) => Boolean(v.mnemonic) || Boolean(v.private_key), {
    message: 'standard wallet entry must contain mnemonic or private_key',
  })

export type StoredStandardWallet = z.infer<typeof StoredStandardWalletSchema>

const StoredAgenticWalletSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.literal('agentic'),
    network: NetworkEnum,
    address: z.string(),
    owner_address: z.string(),
    operator_private_key: z.string().optional(),
    operator_public_key: z.string().optional(),
    // Optional NFT-delegation fields per @ton/mcp's StoredAgenticWallet:
    source: z.string().optional(),
    collection_address: z.string().optional(),
    wallet_nft_index: z.string().optional(),
    origin_operator_public_key: z.string().optional(),
    deployed_by_user: z.boolean().optional(),
    removed: z.boolean().optional(),
    removed_at: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict()

const StoredWalletSchema = z.union([StoredStandardWalletSchema, StoredAgenticWalletSchema])

const NetworkConfigSchema = z
  .object({
    toncenter_api_key: z.string().optional(),
    agentic_collection_address: z.string().optional(),
  })
  .strict()

// Top-level `.passthrough()` is intentional: @ton/mcp also writes
// `pending_agentic_deployments`, `pending_agentic_key_rotations`,
// `agentic_setup_sessions` arrays that we don't parse but should
// tolerate. Wallet objects below are strict.
const TonConfigSchema = z
  .object({
    version: z.literal(2),
    active_wallet_id: z.string().nullable(),
    networks: z
      .object({
        mainnet: NetworkConfigSchema.optional(),
        testnet: NetworkConfigSchema.optional(),
      })
      .strict(),
    wallets: z.array(StoredWalletSchema),
  })
  .passthrough()

// ─────────────────────────────────────────────────────────────────────────────
// Path resolution
// ─────────────────────────────────────────────────────────────────────────────

export function getAgenticConfigPath(override?: string): string {
  if (override) return path.resolve(override)
  const envPath = process.env.TON_CONFIG_PATH
  if (envPath && envPath.trim()) return path.resolve(envPath.trim())
  return path.join(os.homedir(), '.config', 'ton', 'config.json')
}

// ─────────────────────────────────────────────────────────────────────────────
// Protected-file format
//
// `@ton/mcp` ALWAYS writes via `writeEncryptedFile` (saveConfig in
// dist/registry/config.js). The format is NOT passphrase-protected — the
// encryption key is stored in the file alongside the ciphertext. It is
// only obfuscated against `cat config.json` casual inspection.
//
// Layout (cross-verified against @ton/mcp@0.1.15-alpha.15):
//   [4 bytes magic = 0x8a 0x54 0x4d 0x01]
//   [32 bytes AES-256 key]
//   [12 bytes IV]
//   [16 bytes GCM auth tag]
//   [ciphertext]
//
// We decode here so the loader transparently handles plaintext and
// protected configs. NO PASSPHRASE NEEDED.
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED_FILE_MAGIC = Buffer.from([0x8a, 0x54, 0x4d, 0x01])
const ENC_KEY_BYTES = 32
const ENC_IV_BYTES = 12
const ENC_TAG_BYTES = 16
const ENC_HEADER_LENGTH = PROTECTED_FILE_MAGIC.length + ENC_KEY_BYTES + ENC_IV_BYTES + ENC_TAG_BYTES

function decodeProtectedConfig(value: Buffer): { content: string; isProtected: boolean } {
  if (
    value.length < PROTECTED_FILE_MAGIC.length ||
    !value.subarray(0, PROTECTED_FILE_MAGIC.length).equals(PROTECTED_FILE_MAGIC)
  ) {
    return { content: value.toString('utf-8'), isProtected: false }
  }
  if (value.length < ENC_HEADER_LENGTH) {
    throw new Error('Protected config: header truncated.')
  }
  let offset = PROTECTED_FILE_MAGIC.length
  const key = value.subarray(offset, offset + ENC_KEY_BYTES)
  offset += ENC_KEY_BYTES
  const iv = value.subarray(offset, offset + ENC_IV_BYTES)
  offset += ENC_IV_BYTES
  const authTag = value.subarray(offset, offset + ENC_TAG_BYTES)
  offset += ENC_TAG_BYTES
  const ciphertext = value.subarray(offset)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return { content: plaintext.toString('utf-8'), isProtected: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Load + select
// ─────────────────────────────────────────────────────────────────────────────

export function loadAgenticConfig(lookup: AgenticConfigLookup): AgenticConfigSelection {
  const configPath = getAgenticConfigPath(lookup.config_path)

  if (!fs.existsSync(configPath)) {
    throw new SdkError(
      'ERR_NO_WALLET',
      `Agentic wallet config not found at ${configPath}.`,
      {
        severity: 'fatal',
        fixHint:
          `Run \`npx -y @ton/mcp@alpha agentic_start_root_wallet_setup\` to create a wallet, ` +
          `or pass \`wallet: { kind: "tonconnect", connector: "Tonkeeper" }\` for human-signed flow.`,
      },
    )
  }

  let raw: Buffer
  try {
    raw = fs.readFileSync(configPath)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError('ERR_NO_WALLET', `Cannot read agentic config: ${msg}`, {
      severity: 'fatal',
      fixHint: `Verify file permissions on ${configPath} (recommended mode: 0600).`,
    })
  }

  let decoded: string
  try {
    decoded = decodeProtectedConfig(raw).content
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError(
      'ERR_INVALID_INPUT',
      `Agentic config at ${configPath} has the protected-file header but cannot be decoded: ${msg}`,
      {
        severity: 'fatal',
        fixHint:
          `The file is corrupt or was written by an incompatible @ton/mcp version. ` +
          `Run \`@ton/mcp@alpha\` to regenerate, or remove the file and re-import the wallet.`,
      },
    )
  }

  let parsed: z.infer<typeof TonConfigSchema>
  try {
    const json = JSON.parse(decoded)
    parsed = TonConfigSchema.parse(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError(
      'ERR_INVALID_INPUT',
      `Agentic config at ${configPath} is malformed: ${msg}`,
      {
        severity: 'fatal',
        fixHint:
          `The config schema must match @ton/mcp v0.1.x (version: 2). ` +
          `Re-run \`@ton/mcp@alpha\` to regenerate.`,
      },
    )
  }

  // ─── Filter by network and exclude removed entries ────────────────────────
  const activeWallets = parsed.wallets.filter(
    (w) => w.network === lookup.network && !('removed' in w && w.removed),
  )

  if (activeWallets.length === 0) {
    throw new SdkError(
      'ERR_NO_WALLET',
      `No ${lookup.network} wallet in agentic config at ${configPath}.`,
      {
        severity: 'fatal',
        fixHint:
          lookup.network === 'testnet'
            ? `Add a testnet wallet via \`npx @ton/mcp@alpha\` or pass \`testnet: false\` to use mainnet.`
            : `Add a mainnet wallet via \`npx @ton/mcp@alpha\` or pass \`testnet: true\` to use testnet.`,
      },
    )
  }

  // ─── Selection by wallet_label OR active_wallet_id ────────────────────────
  const wanted = lookup.wallet_label?.trim()
  let selected: (typeof activeWallets)[number] | undefined

  if (wanted) {
    selected = activeWallets.find(
      (w) => w.id === wanted || w.name === wanted || w.address === wanted,
    )
    if (!selected) {
      const names = activeWallets
        .map((w) => `${w.name ?? w.id} (${w.id})`)
        .join(', ')
      throw new SdkError(
        'ERR_NO_WALLET',
        `No wallet matching "${wanted}" in agentic config (${lookup.network}). ` +
          `Available: ${names}.`,
        {
          severity: 'fatal',
          fixHint:
            `Pass \`wallet.wallet_label\` as an exact match of one of the listed ids, names, or addresses.`,
        },
      )
    }
  } else {
    if (parsed.active_wallet_id) {
      selected = activeWallets.find((w) => w.id === parsed.active_wallet_id)
    }
    if (!selected) selected = activeWallets[0]
  }

  // ─── Reject NFT-delegated agentic wallet type (v0.8.0 scope) ──────────────
  if (selected.type !== 'standard') {
    throw new SdkError(
      'ERR_INVALID_INPUT',
      `Wallet "${selected.name ?? selected.id}" is type=agentic (NFT-delegated). ` +
        `v0.8.0 only supports type=standard (mnemonic / private_key direct sign).`,
      {
        severity: 'fatal',
        fixHint:
          `Pass \`wallet.wallet_label\` selecting a standard wallet, ` +
          `or import a standard wallet via \`@ton/mcp@alpha agentic_import_wallet\`. ` +
          `NFT-delegated agentic signing is tracked for v0.8.x.`,
      },
    )
  }

  const networkBag =
    lookup.network === 'mainnet' ? parsed.networks?.mainnet : parsed.networks?.testnet
  const apiKey = networkBag?.toncenter_api_key

  return {
    wallet: selected,
    toncenter_api_key: apiKey,
    config_path: configPath,
  }
}
