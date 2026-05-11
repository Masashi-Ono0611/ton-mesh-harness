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
// ─────────────────────────────────────────────────────────────────────────────

const NetworkEnum = z.enum(['mainnet', 'testnet'])

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
  .passthrough()
  .refine((v) => Boolean(v.mnemonic) || Boolean(v.private_key), {
    message: 'standard wallet entry must contain mnemonic or private_key',
  })

export type StoredStandardWallet = z.infer<typeof StoredStandardWalletSchema>

const StoredAgenticWalletSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    type: z.literal('agentic'),
    network: NetworkEnum,
    address: z.string(),
  })
  .passthrough()

const StoredWalletSchema = z.union([StoredStandardWalletSchema, StoredAgenticWalletSchema])

const NetworkConfigSchema = z
  .object({
    toncenter_api_key: z.string().optional(),
  })
  .passthrough()

const TonConfigSchema = z
  .object({
    version: z.literal(2),
    active_wallet_id: z.string().nullable(),
    networks: z
      .object({
        mainnet: NetworkConfigSchema.optional(),
        testnet: NetworkConfigSchema.optional(),
      })
      .passthrough()
      .optional()
      .default({}),
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
// Encrypted-config detection
// `@ton/mcp` writes encrypted configs prefixed with the magic bytes
// [138, 84, 79, 78] = "\x8aTON" (see protected-file.js in @ton/mcp source).
// We refuse encrypted files — v0.8.0 GA does not implement the decryption
// flow. Users can run `npx @ton/mcp@alpha` in unprotected mode to keep the
// config plaintext, or unlock the file via @ton/mcp's own tooling first.
// ─────────────────────────────────────────────────────────────────────────────

function isEncryptedConfig(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x8a &&
    buffer[1] === 0x54 &&
    buffer[2] === 0x4f &&
    buffer[3] === 0x4e
  )
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

  if (isEncryptedConfig(raw)) {
    throw new SdkError(
      'ERR_NO_WALLET',
      `Agentic config at ${configPath} is encrypted and v0.8.0 cannot decrypt it.`,
      {
        severity: 'fatal',
        fixHint:
          `Unlock the config via @ton/mcp's own tooling (its session unlocks decryption ` +
          `transparently), or re-create the wallet without a passphrase. ` +
          `Plaintext path planned for v0.8.x.`,
      },
    )
  }

  let parsed: z.infer<typeof TonConfigSchema>
  try {
    const json = JSON.parse(raw.toString('utf-8'))
    parsed = TonConfigSchema.parse(json)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new SdkError(
      'ERR_NO_WALLET',
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
      'ERR_NO_WALLET',
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
