/**
 * Single zod source of truth for ton-sovereign-mcp inputs / outputs / events.
 *
 * Generated JSON Schemas drive both:
 *   - the MCP server tools/list response (`@modelcontextprotocol/sdk`)
 *   - the SDK's TypeScript types (`z.infer<typeof DeployOptionsSchema>`)
 *
 * Spec: docs/v0.8/mcp-core-requirements.md §F2 / §F3 / §F5 / §NF6
 * Verdict context: docs/v0.8/at-mcp-probe.md (P-1 probe, dual-path WalletSpec)
 *
 * NO `console.*` ANYWHERE IN THIS FILE OR src/sdk/* — lint-enforced (planned [S4]).
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// WalletSpec — discriminated union per P-1 verdict
// ─────────────────────────────────────────────────────────────────────────────

export const WalletSpecSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('tonconnect'),
    /** Substring match against TonConnect manifest names. Default: "Tonkeeper". */
    connector: z.string().default('Tonkeeper'),
  }),
  z.strictObject({
    kind: z.literal('agentic'),
    /**
     * Override path to the agentic-wallet config file.
     * Default: `$TON_CONFIG_PATH` if set, else `~/.config/ton/config.json`.
     * The kit reads this file directly with its own loader (the original
     * P-1 memo's "via @ton/walletkit's loader" claim was wrong — the kit
     * defines the schema; @ton/walletkit's `Signer` is then used to sign).
     */
    config_path: z.string().optional(),
    /**
     * Selects from agentic wallet list when multiple are configured.
     * Default: the active wallet, which is the convention `@ton/mcp`
     * writes via `set_active_wallet`. Verify exact field at week-5
     * implementation start by inspecting an actual config.json.
     */
    wallet_label: z.string().optional(),
  }),
])

export type WalletSpec = z.infer<typeof WalletSpecSchema>

/**
 * Backwards-compat helper: legacy callers (CLI today) pass a bare string
 * meaning "TonConnect connector substring". Lift it into a `WalletSpec`.
 *
 * Used at the SDK boundary in [S2] / runDeploy() so the MCP JSON schema
 * stays clean (no `string | WalletSpec` union exposed via the contract).
 */
export function parseWalletInput(input: string | WalletSpec | undefined): WalletSpec {
  if (input === undefined) return { kind: 'tonconnect', connector: 'Tonkeeper' }
  if (typeof input === 'string') return { kind: 'tonconnect', connector: input }
  return WalletSpecSchema.parse(input)
}

// ─────────────────────────────────────────────────────────────────────────────
// DeployOptions — input to sovereign_deploy / runDeploy()
// ─────────────────────────────────────────────────────────────────────────────

export const DeployOptionsSchema = z.strictObject({
  /** Absolute or relative path to the build directory. */
  source_dir: z.string(),
  /** Optional `.ton` domain to write storage / site DNS records for. */
  domain: z.string().nullable().default(null),
  /** Bag description; defaults to source_dir basename if null. */
  description: z.string().nullable().default(null),
  /**
   * Wallet selection (Path 1 = TonConnect human-signed / Path 2 = agentic autonomous).
   * MCP callers MUST pass the structured object; legacy CLI callers pass a
   * bare string and are lifted via `parseWalletInput()` in the SDK boundary.
   */
  wallet: WalletSpecSchema.default({ kind: 'tonconnect', connector: 'Tonkeeper' }),
  /**
   * Use TON testnet instead of mainnet. Supported on the tonutils backend
   * since v0.9: the daemon is started with the testnet `--network-config`
   * and the DNS write uses testnet endpoints. Requires testnet TON in the
   * signing wallet and a testnet `.ton` domain. Bag propagation depends on
   * testnet ADNL/storage liveness (self-host via the deployer's own daemon).
   */
  testnet: z.boolean().default(false),
  /** Path to ADNL Tunnel client config (nodes-pool.json). */
  tunnel_config: z.string().nullable().default(null),
  /**
   * If true, the daemon survives the call; the MCP server tracks the spawned
   * daemon and kills it on its own shutdown. If false, the daemon is killed
   * before the call returns (one-shot semantics).
   */
  keep_alive: z.boolean().default(false),
  /**
   * Emit a provenance manifest into `<source_dir>/.well-known/ton-deploy.json`
   * before bag creation (so the bag includes it). On the agentic path it is
   * signed with the operator/standard key; on TonConnect it is unsigned
   * (the wallet can't sign arbitrary bytes). Only emitted when `domain` is
   * set. Best-effort: any failure is logged and skipped, never fatal.
   * Pass false to opt out (CLI `--no-provenance`).
   */
  provenance: z.boolean().default(true),
})

export type DeployOptions = z.infer<typeof DeployOptionsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// DeployResult — output of sovereign_deploy
// ─────────────────────────────────────────────────────────────────────────────

export const NextActionSchema = z.strictObject({
  description: z.string(),
})

export const DeployResultSchema = z.strictObject({
  bag_id: z.string(),
  bag_size_bytes: z.number().int().nonnegative(),
  /** Null if `domain` was null on input. */
  dns_tx_hash: z.string().nullable(),
  /**
   * The tonutils-storage daemon's local HTTP API base (e.g.
   * `http://127.0.0.1:7100`). Renamed from `dashboard_url` in [S3] review
   * — the daemon does not serve a dashboard HTML page; it exposes a JSON
   * API. The kit's actual dashboard is a separate static file the CLI
   * may open in a browser.
   */
  daemon_api_url: z.string(),
  /** Non-null only when `keep_alive=true`. */
  daemon_pid: z.number().int().nullable(),
  seed_status: z.enum(['seeding', 'stopped']),
  next_actions: z.array(NextActionSchema).default([]),
})

export type DeployResult = z.infer<typeof DeployResultSchema>

// ─────────────────────────────────────────────────────────────────────────────
// CheckEnv — input + output for sovereign_check_env
// ─────────────────────────────────────────────────────────────────────────────

export const CheckEnvOptionsSchema = z.strictObject({
  source_dir: z.string().nullable().default(null),
})
export type CheckEnvOptions = z.infer<typeof CheckEnvOptionsSchema>

const CheckBlockingSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
  fix_hint: z.string(),
})

const CheckWarningSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
})

export const CheckEnvResultSchema = z
  .strictObject({
    ready: z.boolean(),
    node_version: z.string(),
    disk_free_mb: z.number().int().nonnegative(),
    udp_port_17555_free: z.boolean(),
    /**
     * `"tonconnect"` if the kit's TonConnect connector code is reachable
     * (no session check). `"agentic"` if `~/.config/ton/config.json`
     * (or `$TON_CONFIG_PATH`) exists AND has at least one wallet entry the
     * SDK's loader can read. Possible values: `[]`, `["tonconnect"]`,
     * `["agentic"]`, `["tonconnect","agentic"]`. Each value appears at most once.
     */
    wallet_signers_available: z
      .array(z.enum(['tonconnect', 'agentic']))
      .refine((arr) => new Set(arr).size === arr.length, {
        message: 'wallet_signers_available must contain unique values',
      }),
    daemon_backend_installed: z.strictObject({
      tonutils: z.boolean(),
      ton_core: z.boolean(),
    }),
    network_reachable: z.boolean(),
    /** Null when `source_dir` was null on input. */
    source_dir_valid: z.boolean().nullable(),
    blocking: z.array(CheckBlockingSchema),
    warnings: z.array(CheckWarningSchema),
  })
  // ready ⇔ blocking.length === 0. Enforce schema-side so consumers parsing
  // a hand-crafted result get the same invariant the producer's checkEnv()
  // computes internally.
  .refine((v) => v.ready === (v.blocking.length === 0), {
    message: 'ready must be true if and only if blocking is empty',
  })

export type CheckEnvResult = z.infer<typeof CheckEnvResultSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Status — input + output for sovereign_status
//
// One-shot snapshot of a bag's network state via TONAPI, and (optionally) the
// .ton DNS record currently pointing at it. Used by agents that ran a
// `keep_alive: false` deploy and want to know whether the bag has propagated.
// ─────────────────────────────────────────────────────────────────────────────

export const StatusOptionsSchema = z.strictObject({
  bag_id: z.string().min(1),
  /** Optional `.ton` domain to also check (resolves NFT + reads storage record). */
  domain: z.string().nullable().default(null),
  testnet: z.boolean().default(false),
})
export type StatusOptions = z.infer<typeof StatusOptionsSchema>

const StatusDomainSchema = z.strictObject({
  name: z.string(),
  nft_address: z.string().nullable(),
  /** Bag id currently pointed to by the `storage` DNS record (lowercase hex). */
  resolved_bag_id: z.string().nullable(),
  /** `resolved_bag_id === bag_id` (lowercased compare). */
  matches: z.boolean(),
})

export const StatusResultSchema = z.strictObject({
  bag_id: z.string(),
  /** TONAPI reports the bag is visible / not "not_found". */
  bag_accessible: z.boolean(),
  /** Bag size in bytes if TONAPI returned it; null when accessible=false. */
  bag_size_bytes: z.number().int().nonnegative().nullable(),
  /** File count if TONAPI returned it; null when accessible=false. */
  bag_file_count: z.number().int().nonnegative().nullable(),
  /**
   * When `bag_accessible: false`, why. `not_found` = TONAPI returned
   * status=not_found (genuine "not propagated"). `network_error` =
   * TONAPI was unreachable or returned 5xx for both attempts. Lets
   * callers distinguish "the bag isn't on the network yet" from
   * "TONAPI itself is down / endpoint drifted." `null` when accessible.
   */
  bag_unavailable_reason: z.enum(['not_found', 'network_error']).nullable(),
  /** Present iff `domain` was passed. */
  domain: StatusDomainSchema.nullable(),
})
export type StatusResult = z.infer<typeof StatusResultSchema>

// ─────────────────────────────────────────────────────────────────────────────
// DeployEvent — typed progress events emitted from `deploy(opts)` AsyncIterable
// ─────────────────────────────────────────────────────────────────────────────

const PhaseSchema = z.enum([
  'env_check',
  'bag_creating',
  'daemon_starting',
  'bag_uploaded',
  'awaiting_signature',
  'dns_signing',
  'dns_confirmed',
  'verifying',
  'done',
])

export type DeployPhase = z.infer<typeof PhaseSchema>

const BaseEventFields = {
  message: z.string(),
  percent: z.number().min(0).max(100).optional(),
}

const AwaitingSignatureDataSchema = z.discriminatedUnion('signing_mode', [
  z.strictObject({
    signing_mode: z.literal('tonconnect'),
    signing_url: z.string(),
    expires_at_iso: z.string(),
  }),
  z.strictObject({
    signing_mode: z.literal('agentic'),
    signing_url: z.null(),
    /**
     * Wallet label that will sign autonomously, for the agent's logs.
     * Optional — if the active wallet has no explicit label, this is null.
     */
    wallet_label: z.string().nullable().default(null),
  }),
])

const FreeFormEventData = z.record(z.string(), z.unknown()).optional()

/**
 * Discriminated union on `phase`. Specialised data shapes for
 * `awaiting_signature` (signing mode handoff) and `done` (DeployResult);
 * all intermediate phases carry a free-form `data` record (file-level
 * granularity, daemon ports, etc.).
 *
 * Using a discriminated union (rather than `z.union`) is load-bearing:
 * a `z.union` with a free-form fallback variant would silently accept
 * malformed `awaiting_signature` events.
 */
export const DeployEventSchema = z.discriminatedUnion('phase', [
  // Specialised: awaiting_signature
  z.strictObject({
    phase: z.literal('awaiting_signature'),
    ...BaseEventFields,
    data: AwaitingSignatureDataSchema,
  }),
  // Specialised: done (DeployResult)
  z.strictObject({
    phase: z.literal('done'),
    ...BaseEventFields,
    data: DeployResultSchema,
  }),
  // Free-form intermediate phases — strict at the top-level (no extra
  // keys beyond phase/message/percent/data); `data` itself is free-form
  // for file-level granularity, daemon ports, etc.
  z.strictObject({ phase: z.literal('env_check'), ...BaseEventFields, data: FreeFormEventData }),
  z.strictObject({ phase: z.literal('bag_creating'), ...BaseEventFields, data: FreeFormEventData }),
  z.strictObject({ phase: z.literal('daemon_starting'), ...BaseEventFields, data: FreeFormEventData }),
  z.strictObject({ phase: z.literal('bag_uploaded'), ...BaseEventFields, data: FreeFormEventData }),
  z.strictObject({ phase: z.literal('dns_signing'), ...BaseEventFields, data: FreeFormEventData }),
  z.strictObject({ phase: z.literal('dns_confirmed'), ...BaseEventFields, data: FreeFormEventData }),
  z.strictObject({ phase: z.literal('verifying'), ...BaseEventFields, data: FreeFormEventData }),
])

export type DeployEvent = z.infer<typeof DeployEventSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Error contract (F5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All stable error codes per F5. Adding new codes is non-breaking; renaming
 * or removing is breaking and requires a kit minor bump + tool description note.
 */
export const ERR_CODES = [
  'ERR_INVALID_INPUT',
  'ERR_NO_DOMAIN',
  /**
   * `wallet.kind === "agentic"` and `~/.config/ton/config.json`
   * (or `$TON_CONFIG_PATH`) is absent or has no active wallet.
   */
  'ERR_NO_WALLET',
  'ERR_PORT_BUSY',
  'ERR_DAEMON_SPAWN',
  'ERR_DAEMON_API_TIMEOUT',
  'ERR_BAG_UPLOAD',
  /** Path 1 only — Path 2 has no rejection step. */
  'ERR_DNS_SIGN_REJECTED',
  'ERR_DNS_TX_TIMEOUT',
  'ERR_VERIFY_FAILED',
  /** Check `data.may_have_published` for honest semantics; see F4. */
  'ERR_CANCELLED',
  /** Concurrent tool call rejected; v0.8.0 serialises sovereign_deploy. */
  'ERR_BUSY',
  'ERR_INTERNAL',
] as const

export const ErrCodeSchema = z.enum(ERR_CODES)
export type ErrCode = z.infer<typeof ErrCodeSchema>

/**
 * F4 cancellation data — REQUIRED for `code === "ERR_CANCELLED"`. Other codes
 * accept a free-form `data` record (so a producer can carry diagnostic detail
 * on any error). The discriminator below makes ERR_CANCELLED specifically
 * REQUIRE this strict shape so a malformed cancellation payload is rejected.
 */
const CancelledDataSchema = z.strictObject({
  phase_at_cancel: PhaseSchema,
  may_have_published: z.boolean(),
  bag_id: z.string().nullable(),
  tx_hash: z.string().nullable(),
})

const NonCancelledCodeSchema = z.enum(
  ERR_CODES.filter((c): c is Exclude<ErrCode, 'ERR_CANCELLED'> => c !== 'ERR_CANCELLED') as [
    Exclude<ErrCode, 'ERR_CANCELLED'>,
    ...Exclude<ErrCode, 'ERR_CANCELLED'>[],
  ],
)

/**
 * Code-aware discriminated union. ERR_CANCELLED carries strict F4 data;
 * other codes carry a free-form data record (or none).
 */
export const ErrorPayloadSchema = z.discriminatedUnion('code', [
  z.strictObject({
    code: z.literal('ERR_CANCELLED'),
    message: z.string(),
    severity: z.enum(['fatal', 'recoverable']),
    fix_hint: z.string().optional(),
    data: CancelledDataSchema,
  }),
  z.strictObject({
    code: NonCancelledCodeSchema,
    message: z.string(),
    severity: z.enum(['fatal', 'recoverable']),
    fix_hint: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
])

export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>
