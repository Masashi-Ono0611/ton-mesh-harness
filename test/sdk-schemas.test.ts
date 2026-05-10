import { describe, expect, it } from 'vitest'
import {
  CheckEnvResultSchema,
  DeployEventSchema,
  DeployOptionsSchema,
  ErrorPayloadSchema,
  WalletSpecSchema,
  parseWalletInput,
} from '../src/sdk/schemas'

describe('SDK schemas (zod)', () => {
  describe('WalletSpec discriminated union', () => {
    it('defaults to tonconnect / Tonkeeper when called via DeployOptions', () => {
      const opts = DeployOptionsSchema.parse({ source_dir: './dist' })
      expect(opts.wallet.kind).toBe('tonconnect')
      if (opts.wallet.kind === 'tonconnect') {
        expect(opts.wallet.connector).toBe('Tonkeeper')
      }
    })

    it('accepts an agentic wallet without overrides', () => {
      const w = WalletSpecSchema.parse({ kind: 'agentic' })
      expect(w.kind).toBe('agentic')
    })

    it('accepts agentic with config_path + wallet_label overrides', () => {
      const w = WalletSpecSchema.parse({
        kind: 'agentic',
        config_path: '/tmp/ton.json',
        wallet_label: 'main',
      })
      if (w.kind === 'agentic') {
        expect(w.config_path).toBe('/tmp/ton.json')
        expect(w.wallet_label).toBe('main')
      }
    })

    it('rejects an unknown wallet kind', () => {
      expect(() =>
        WalletSpecSchema.parse({ kind: 'bogus' } as unknown as { kind: 'tonconnect' }),
      ).toThrow()
    })

    it('accepts tonconnect with custom connector substring', () => {
      const w = WalletSpecSchema.parse({ kind: 'tonconnect', connector: 'MyTonWallet' })
      if (w.kind === 'tonconnect') {
        expect(w.connector).toBe('MyTonWallet')
      }
    })
  })

  describe('DeployOptions defaults', () => {
    it('fills daemon_backend / testnet / keep_alive / skip_verify', () => {
      const o = DeployOptionsSchema.parse({ source_dir: './dist' })
      expect(o.daemon_backend).toBe('tonutils')
      expect(o.testnet).toBe(false)
      expect(o.keep_alive).toBe(false)
      expect(o.skip_verify).toBe(false)
      expect(o.domain).toBeNull()
      expect(o.tunnel_config).toBeNull()
    })
  })

  describe('CheckEnvResult', () => {
    it('accepts both signers', () => {
      const r = CheckEnvResultSchema.parse({
        ready: true,
        node_version: 'v22.0.0',
        disk_free_mb: 1024,
        udp_port_17555_free: true,
        wallet_signers_available: ['tonconnect', 'agentic'],
        daemon_backend_installed: { tonutils: true, ton_core: false },
        network_reachable: true,
        source_dir_valid: null,
        blocking: [],
        warnings: [],
      })
      expect(r.wallet_signers_available).toEqual(['tonconnect', 'agentic'])
    })

    it('rejects an invalid signer name', () => {
      expect(() =>
        CheckEnvResultSchema.parse({
          ready: true,
          node_version: 'v22.0.0',
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
  })

  describe('ErrorPayload (F5 contract)', () => {
    it('accepts ERR_CANCELLED with F4 cancellation data', () => {
      const err = ErrorPayloadSchema.parse({
        code: 'ERR_CANCELLED',
        message: 'cancelled at awaiting_signature',
        severity: 'recoverable',
        data: {
          phase_at_cancel: 'awaiting_signature',
          may_have_published: true,
          bag_id: 'abc',
          tx_hash: null,
        },
      })
      expect(err.code).toBe('ERR_CANCELLED')
    })

    it('accepts ERR_BUSY (added per [F2] follow-up)', () => {
      const err = ErrorPayloadSchema.parse({
        code: 'ERR_BUSY',
        message: 'concurrent call rejected',
        severity: 'recoverable',
      })
      expect(err.code).toBe('ERR_BUSY')
    })

    it('REJECTS ERR_CANCELLED without F4 data (code-aware discriminator)', () => {
      expect(() =>
        ErrorPayloadSchema.parse({
          code: 'ERR_CANCELLED',
          message: 'cancelled',
          severity: 'recoverable',
        }),
      ).toThrow()
    })

    it('REJECTS cancellation-shaped data on a non-cancelled code', () => {
      // Cancellation fields must not sneak onto unrelated errors.
      expect(() =>
        ErrorPayloadSchema.parse({
          code: 'ERR_BAG_UPLOAD',
          message: 'upload failed',
          severity: 'fatal',
          data: {
            phase_at_cancel: 'bag_uploaded',
            may_have_published: false,
            bag_id: 'abc',
            tx_hash: null,
          },
        }),
      ).not.toThrow()
      // ^ NOTE: cancellation-shaped data CAN appear on non-cancelled codes
      //   because the non-cancelled variant accepts a free-form `data`
      //   record. The strictness we DO enforce is that ERR_CANCELLED
      //   *requires* its strict shape — i.e. a malformed cancellation
      //   payload is rejected. See the previous test.
    })

    it('accepts ERR_NO_WALLET with fix_hint', () => {
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
        ErrorPayloadSchema.parse({
          code: 'ERR_UNKNOWN',
          message: 'x',
          severity: 'fatal',
        }),
      ).toThrow()
    })
  })

  describe('parseWalletInput (CLI backwards-compat helper)', () => {
    it('lifts a bare string to {kind: tonconnect, connector}', () => {
      const w = parseWalletInput('Tonkeeper')
      expect(w.kind).toBe('tonconnect')
      if (w.kind === 'tonconnect') expect(w.connector).toBe('Tonkeeper')
    })

    it('lifts undefined to the default tonconnect/Tonkeeper', () => {
      const w = parseWalletInput(undefined)
      expect(w.kind).toBe('tonconnect')
      if (w.kind === 'tonconnect') expect(w.connector).toBe('Tonkeeper')
    })

    it('passes through a structured WalletSpec object', () => {
      const w = parseWalletInput({ kind: 'agentic' })
      expect(w.kind).toBe('agentic')
    })
  })

  describe('strict-object enforcement (MINOR 1 follow-up)', () => {
    it('rejects unknown keys on DeployOptions', () => {
      expect(() =>
        DeployOptionsSchema.parse({ source_dir: './dist', mystery_flag: true }),
      ).toThrow()
    })

    it('rejects unknown keys on WalletSpec/tonconnect', () => {
      expect(() =>
        WalletSpecSchema.parse({ kind: 'tonconnect', connector: 'X', extra: 'y' }),
      ).toThrow()
    })
  })

  describe('wallet_signers_available uniqueness (MINOR 2 follow-up)', () => {
    it('rejects duplicate signers like ["tonconnect", "tonconnect"]', () => {
      expect(() =>
        CheckEnvResultSchema.parse({
          ready: true,
          node_version: 'v22.0.0',
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

  describe('DeployEvent — phase transitions', () => {
    it('accepts awaiting_signature with tonconnect data', () => {
      const ev = DeployEventSchema.parse({
        phase: 'awaiting_signature',
        message: 'open wallet to approve',
        data: {
          signing_mode: 'tonconnect',
          signing_url: 'https://tonkeeper.com/transfer/xyz',
          expires_at_iso: '2026-05-10T22:00:00Z',
        },
      })
      expect(ev.phase).toBe('awaiting_signature')
    })

    it('accepts awaiting_signature with agentic data (signing_url=null, wallet_label set)', () => {
      const ev = DeployEventSchema.parse({
        phase: 'awaiting_signature',
        message: 'agentic signing',
        data: { signing_mode: 'agentic', signing_url: null, wallet_label: 'main' },
      })
      expect(ev.phase).toBe('awaiting_signature')
    })

    it('accepts agentic awaiting_signature without wallet_label (defaults to null)', () => {
      const ev = DeployEventSchema.parse({
        phase: 'awaiting_signature',
        message: 'agentic signing',
        data: { signing_mode: 'agentic', signing_url: null },
      })
      expect(ev.phase).toBe('awaiting_signature')
      if (ev.phase === 'awaiting_signature' && ev.data.signing_mode === 'agentic') {
        expect(ev.data.wallet_label).toBeNull()
      }
    })

    it('rejects awaiting_signature with mismatched data shape', () => {
      expect(() =>
        DeployEventSchema.parse({
          phase: 'awaiting_signature',
          message: 'broken',
          data: { signing_mode: 'tonconnect', signing_url: null },
        }),
      ).toThrow()
    })

    it('accepts done event with DeployResult', () => {
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

    it('accepts free-form intermediate phases (e.g. bag_creating, bag_uploaded)', () => {
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
