import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getAgenticConfigPath, loadAgenticConfig } from '../src/sdk/agentic-config'
import { SdkError } from '../src/sdk/deploy'

/**
 * agentic-config.ts is the schema loader for `~/.config/ton/config.json`
 * (the file `@ton/mcp@alpha` writes). All tests use a tmp dir so we never
 * touch the user's real config.
 */

const ISO = '2026-05-11T00:00:00Z'

function makeConfig(overrides: Record<string, unknown> = {}): string {
  const base = {
    version: 2,
    active_wallet_id: 'w1',
    networks: { mainnet: {}, testnet: {} },
    wallets: [
      {
        id: 'w1',
        name: 'Main',
        type: 'standard',
        wallet_version: 'v5r1',
        network: 'mainnet',
        address: 'UQAAA',
        mnemonic: 'word '.repeat(24).trim(),
        created_at: ISO,
        updated_at: ISO,
      },
    ],
    ...overrides,
  }
  return JSON.stringify(base)
}

function makeAgenticEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'a1',
    name: 'AgenticNFT',
    type: 'agentic',
    network: 'mainnet',
    address: 'UQA',
    owner_address: 'UQB',
    operator_private_key: 'a'.repeat(64),
    created_at: ISO,
    updated_at: ISO,
    ...overrides,
  }
}

function writeTmp(content: string | Buffer): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-agentic-'))
  const file = path.join(dir, 'config.json')
  fs.writeFileSync(file, content)
  return file
}

describe('agentic-config', () => {
  let savedEnv: string | undefined
  beforeEach(() => {
    savedEnv = process.env.TON_CONFIG_PATH
    delete process.env.TON_CONFIG_PATH
  })
  afterEach(() => {
    if (savedEnv === undefined) delete process.env.TON_CONFIG_PATH
    else process.env.TON_CONFIG_PATH = savedEnv
  })

  describe('getAgenticConfigPath', () => {
    it('explicit override wins', () => {
      expect(getAgenticConfigPath('/custom/path')).toBe('/custom/path')
    })
    it('falls back to TON_CONFIG_PATH env', () => {
      process.env.TON_CONFIG_PATH = '/env/cfg.json'
      expect(getAgenticConfigPath()).toBe('/env/cfg.json')
    })
    it('default is ~/.config/ton/config.json', () => {
      expect(getAgenticConfigPath()).toBe(path.join(os.homedir(), '.config', 'ton', 'config.json'))
    })
  })

  describe('loadAgenticConfig', () => {
    it('selects active_wallet_id by default', () => {
      const p = writeTmp(makeConfig())
      const sel = loadAgenticConfig({ config_path: p, network: 'mainnet' })
      expect(sel.wallet.id).toBe('w1')
      expect(sel.config_path).toBe(p)
    })

    it('wallet_label match by name', () => {
      const p = writeTmp(
        makeConfig({
          wallets: [
            {
              id: 'w1',
              name: 'Alpha',
              type: 'standard',
              wallet_version: 'v5r1',
              network: 'mainnet',
              address: 'UQA',
              mnemonic: 'word '.repeat(24).trim(),
              created_at: ISO,
              updated_at: ISO,
            },
            {
              id: 'w2',
              name: 'Beta',
              type: 'standard',
              wallet_version: 'v4r2',
              network: 'mainnet',
              address: 'UQB',
              private_key: 'a'.repeat(64),
              created_at: ISO,
              updated_at: ISO,
            },
          ],
        }),
      )
      const sel = loadAgenticConfig({ config_path: p, wallet_label: 'Beta', network: 'mainnet' })
      expect(sel.wallet.id).toBe('w2')
      expect(sel.wallet.wallet_version).toBe('v4r2')
    })

    it('throws ERR_NO_WALLET when config missing', () => {
      expect(() =>
        loadAgenticConfig({ config_path: '/no/such/file.json', network: 'mainnet' }),
      ).toThrowError(SdkError)
    })

    it('throws ERR_INVALID_INPUT on corrupt protected-file (good magic, bad payload)', () => {
      // Magic = \x8aTM\x01 + 60 zero bytes (key+iv+tag) — the GCM auth
      // tag won't validate, so decryption throws.
      const corrupt = Buffer.concat([
        Buffer.from([0x8a, 0x54, 0x4d, 0x01]),
        Buffer.alloc(32 + 12 + 16, 0),
        Buffer.from('garbage'),
      ])
      const p = writeTmp(corrupt)
      try {
        loadAgenticConfig({ config_path: p, network: 'mainnet' })
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError)
        expect((e as SdkError).code).toBe('ERR_INVALID_INPUT')
        expect((e as SdkError).message).toMatch(/cannot be decoded/i)
      }
    })

    it('decodes a real @ton/mcp protected-file (AES-256-GCM, self-contained key)', () => {
      // Build a valid protected file the way @ton/mcp does:
      //   magic + 32B key + 12B iv + 16B authTag + ciphertext.
      const crypto = require('crypto') as typeof import('crypto')
      const plaintext = makeConfig()
      const key = crypto.randomBytes(32)
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
      const authTag = cipher.getAuthTag()
      const blob = Buffer.concat([
        Buffer.from([0x8a, 0x54, 0x4d, 0x01]),
        key,
        iv,
        authTag,
        encrypted,
      ])
      const p = writeTmp(blob)
      const sel = loadAgenticConfig({ config_path: p, network: 'mainnet' })
      expect(sel.wallet.id).toBe('w1')
    })

    it('rejects type=agentic (NFT-delegated) with ERR_INVALID_INPUT', () => {
      const p = writeTmp(
        makeConfig({
          active_wallet_id: 'a1',
          wallets: [makeAgenticEntry()],
        }),
      )
      try {
        loadAgenticConfig({ config_path: p, network: 'mainnet' })
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError)
        expect((e as SdkError).code).toBe('ERR_INVALID_INPUT')
        expect((e as SdkError).message).toMatch(/NFT-delegated/i)
      }
    })

    it('filters by network — testnet entries hidden on mainnet request', () => {
      const p = writeTmp(
        makeConfig({
          wallets: [
            {
              id: 'w1',
              name: 'Test',
              type: 'standard',
              wallet_version: 'v5r1',
              network: 'testnet',
              address: 'UQA',
              mnemonic: 'word '.repeat(24).trim(),
              created_at: ISO,
              updated_at: ISO,
            },
          ],
        }),
      )
      expect(() => loadAgenticConfig({ config_path: p, network: 'mainnet' })).toThrowError(/mainnet/)
    })

    it('skips removed wallets', () => {
      const p = writeTmp(
        makeConfig({
          active_wallet_id: 'w1',
          wallets: [
            {
              id: 'w1',
              name: 'Removed',
              type: 'standard',
              wallet_version: 'v5r1',
              network: 'mainnet',
              address: 'UQA',
              mnemonic: 'word '.repeat(24).trim(),
              removed: true,
              removed_at: ISO,
              created_at: ISO,
              updated_at: ISO,
            },
            {
              id: 'w2',
              name: 'Live',
              type: 'standard',
              wallet_version: 'v5r1',
              network: 'mainnet',
              address: 'UQB',
              mnemonic: 'word '.repeat(24).trim(),
              created_at: ISO,
              updated_at: ISO,
            },
          ],
        }),
      )
      const sel = loadAgenticConfig({ config_path: p, network: 'mainnet' })
      expect(sel.wallet.id).toBe('w2')
    })

    it('surfaces toncenter_api_key from network bag', () => {
      const p = writeTmp(
        makeConfig({
          networks: {
            mainnet: { toncenter_api_key: 'KEY-MAIN' },
            testnet: { toncenter_api_key: 'KEY-TEST' },
          },
        }),
      )
      const sel = loadAgenticConfig({ config_path: p, network: 'mainnet' })
      expect(sel.toncenter_api_key).toBe('KEY-MAIN')
    })

    it('rejects standard wallet without mnemonic AND without private_key', () => {
      const p = writeTmp(
        makeConfig({
          wallets: [
            {
              id: 'w1',
              name: 'Broken',
              type: 'standard',
              wallet_version: 'v5r1',
              network: 'mainnet',
              address: 'UQA',
              created_at: ISO,
              updated_at: ISO,
            },
          ],
        }),
      )
      expect(() => loadAgenticConfig({ config_path: p, network: 'mainnet' })).toThrowError(SdkError)
    })

    it('rejects malformed JSON with ERR_INVALID_INPUT', () => {
      const p = writeTmp('not valid json')
      try {
        loadAgenticConfig({ config_path: p, network: 'mainnet' })
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError)
        expect((e as SdkError).code).toBe('ERR_INVALID_INPUT')
        expect((e as SdkError).message).toMatch(/malformed/)
      }
    })

    it('rejects schema version != 2 with ERR_INVALID_INPUT', () => {
      const p = writeTmp(
        JSON.stringify({ version: 1, active_wallet_id: null, networks: {}, wallets: [] }),
      )
      try {
        loadAgenticConfig({ config_path: p, network: 'mainnet' })
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError)
        expect((e as SdkError).code).toBe('ERR_INVALID_INPUT')
      }
    })

    it('rejects config missing required `networks` field', () => {
      // @ton/mcp's TonConfig requires `networks` (not optional). A hand
      // -rolled config that omits it must fail fast.
      const p = writeTmp(
        JSON.stringify({ version: 2, active_wallet_id: null, wallets: [] }),
      )
      expect(() => loadAgenticConfig({ config_path: p, network: 'mainnet' })).toThrowError(SdkError)
    })

    it('rejects agentic entry missing required `owner_address`', () => {
      const p = writeTmp(
        makeConfig({
          active_wallet_id: 'a1',
          wallets: [makeAgenticEntry({ owner_address: undefined })],
        }),
      )
      expect(() => loadAgenticConfig({ config_path: p, network: 'mainnet' })).toThrowError(SdkError)
    })
  })
})
