import { describe, expect, it } from 'vitest'
import {
  CheckEnvResultSchema,
  DeployEventSchema,
  DeployOptionsSchema,
  ErrorPayloadSchema,
  WalletSpecSchema,
  parseWalletInput,
} from '../src/sdk/schemas'

/**
 * Schema unit tests — focused on invariants the JSON Schema snapshot
 * (`test/sdk-json-schemas.test.ts`) cannot catch by itself: discriminator
 * semantics, refines, strict-object boundaries, error contract.
 *
 * Positive default-shape coverage lives in the snapshot test; this file
 * tests REJECT paths and code-aware behaviour that snapshots can't see.
 */
describe('SDK schemas (zod)', () => {
  describe('WalletSpec discriminator + defaults', () => {
    it('DeployOptions defaults: tonconnect/Tonkeeper, all flags false, nullables null', () => {
      const o = DeployOptionsSchema.parse({ source_dir: './dist' })
      expect(o.wallet).toEqual({ kind: 'tonconnect', connector: 'Tonkeeper' })
      expect(o.daemon_backend).toBe('tonutils')
      expect(o.testnet).toBe(false)
      expect(o.keep_alive).toBe(false)
      expect(o.skip_verify).toBe(false)
      expect(o.domain).toBeNull()
      expect(o.tunnel_config).toBeNull()
    })

    it('agentic accepts config_path + wallet_label overrides', () => {
      const w = WalletSpecSchema.parse({
        kind: 'agentic',
        config_path: '/tmp/ton.json',
        wallet_label: 'main',
      })
      expect(w).toEqual({ kind: 'agentic', config_path: '/tmp/ton.json', wallet_label: 'main' })
    })

    it('rejects an unknown wallet kind', () => {
      expect(() =>
        WalletSpecSchema.parse({ kind: 'bogus' } as unknown as { kind: 'tonconnect' }),
      ).toThrow()
    })

    it('rejects unknown keys on tonconnect (strict object)', () => {
      expect(() =>
        WalletSpecSchema.parse({ kind: 'tonconnect', connector: 'X', extra: 'y' }),
      ).toThrow()
    })

    it('DeployOptions rejects unknown keys (strict object)', () => {
      expect(() =>
        DeployOptionsSchema.parse({ source_dir: './dist', mystery_flag: true }),
      ).toThrow()
    })
  })

  describe('parseWalletInput (CLI backwards-compat helper)', () => {
    it('lifts a bare string to {kind: tonconnect, connector}', () => {
      expect(parseWalletInput('Tonkeeper')).toEqual({ kind: 'tonconnect', connector: 'Tonkeeper' })
    })

    it('lifts undefined to the default tonconnect/Tonkeeper', () => {
      expect(parseWalletInput(undefined)).toEqual({ kind: 'tonconnect', connector: 'Tonkeeper' })
    })

    it('passes through a structured WalletSpec object', () => {
      expect(parseWalletInput({ kind: 'agentic' })).toEqual({ kind: 'agentic' })
    })
  })

  describe('CheckEnvResult refines', () => {
    it('rejects an invalid signer name', () => {
      expect(() =>
        CheckEnvResultSchema.parse({
          ready: true,
          node_version: 'v22',
          disk_free_mb: 1024,
          udp_port_17555_free: true,
          wallet_signers_available: ['unknown-signer'],
          daemon_backend_installed: { tonutils: true, ton_core: false },
          network_reachable: true,
          source_dir_valid: null,
          blocking: [],
          warnings: [],
        }),
      ).toThrow()
    })

    it('rejects duplicate signers (uniqueness refine)', () => {
      expect(() =>
        CheckEnvResultSchema.parse({
          ready: true,
          node_version: 'v22',
          disk_free_mb: 1024,
          udp_port_17555_free: true,
          wallet_signers_available: ['tonconnect', 'tonconnect'],
          daemon_backend_installed: { tonutils: true, ton_core: false },
          network_reachable: true,
          source_dir_valid: null,
          blocking: [],
          warnings: [],
        }),
      ).toThrow()
    })
  })

  describe('ErrorPayload (F5 code-aware contract)', () => {
    it('ERR_CANCELLED requires strict F4 cancellation data', () => {
      // Valid: strict data present
      expect(() =>
        ErrorPayloadSchema.parse({
          code: 'ERR_CANCELLED',
          message: 'cancelled',
          severity: 'recoverable',
          data: {
            phase_at_cancel: 'awaiting_signature',
            may_have_published: true,
            bag_id: 'abc',
            tx_hash: null,
          },
        }),
      ).not.toThrow()
      // Invalid: data missing on ERR_CANCELLED
      expect(() =>
        ErrorPayloadSchema.parse({
          code: 'ERR_CANCELLED',
          message: 'cancelled',
          severity: 'recoverable',
        }),
      ).toThrow()
    })

    it('non-cancelled codes accept free-form data with optional fix_hint', () => {
      const err = ErrorPayloadSchema.parse({
        code: 'ERR_NO_WALLET',
        message: 'no agentic wallet found',
        severity: 'fatal',
        fix_hint: 'Run npx -y @ton/mcp@alpha agentic_start_root_wallet_setup',
      })
      expect(err.fix_hint).toContain('@ton/mcp')
    })

    it('rejects an unknown error code', () => {
      expect(() =>
        ErrorPayloadSchema.parse({ code: 'ERR_UNKNOWN', message: 'x', severity: 'fatal' }),
      ).toThrow()
    })
  })

  describe('DeployEvent — discriminated union on phase', () => {
    it('agentic awaiting_signature works without wallet_label (defaults null)', () => {
      const ev = DeployEventSchema.parse({
        phase: 'awaiting_signature',
        message: 'agentic signing',
        data: { signing_mode: 'agentic', signing_url: null },
      })
      if (ev.phase === 'awaiting_signature' && ev.data.signing_mode === 'agentic') {
        expect(ev.data.wallet_label).toBeNull()
      }
    })

    it('rejects awaiting_signature with mismatched data shape (tonconnect needs signing_url string)', () => {
      expect(() =>
        DeployEventSchema.parse({
          phase: 'awaiting_signature',
          message: 'broken',
          data: { signing_mode: 'tonconnect', signing_url: null },
        }),
      ).toThrow()
    })

    it('accepts done event with DeployResult-shaped data', () => {
      const ev = DeployEventSchema.parse({
        phase: 'done',
        message: 'deploy complete',
        data: {
          bag_id: 'abc123',
          bag_size_bytes: 1024,
          dns_tx_hash: null,
          dashboard_url: 'http://localhost:7100',
          daemon_pid: null,
          seed_status: 'stopped',
          next_actions: [],
        },
      })
      expect(ev.phase).toBe('done')
    })

    it('intermediate phases carry free-form data', () => {
      const ev = DeployEventSchema.parse({
        phase: 'bag_creating',
        message: 'building bag',
        percent: 25,
        data: { files_seen: 12 },
      })
      expect(ev.phase).toBe('bag_creating')
    })
  })
})
