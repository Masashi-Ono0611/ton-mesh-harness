// Adapted from @ton/blueprint
// Copyright (c) 2025 Ton Tech, MIT License
// Original: https://github.com/ton-org/blueprint/blob/main/src/network/storage/FSStorage.ts

import path from 'path'
import fs from 'fs/promises'

import type { Storage } from './Storage'

type StorageObject = Record<string, string>

export class FSStorage implements Storage {
  constructor(private readonly path: string) {}

  private async readObject(): Promise<StorageObject> {
    try {
      return JSON.parse((await fs.readFile(this.path)).toString('utf-8'))
    } catch {
      return {}
    }
  }

  private async writeObject(obj: StorageObject): Promise<void> {
    // 0o700 on the parent dir + 0o600 on the file: the JSON contains the
    // TonConnect bridge session, which gives the holder authority to send
    // signed-tx requests to the user's wallet.
    await fs.mkdir(path.dirname(this.path), { recursive: true, mode: 0o700 })
    await fs.writeFile(this.path, JSON.stringify(obj), { mode: 0o600 })
    // writeFile honours mode only on file creation; chmod ensures it is set
    // on subsequent writes too (overwrite path).
    try { await fs.chmod(this.path, 0o600) } catch { /* best-effort */ }
  }

  async setItem(key: string, value: string): Promise<void> {
    const obj = await this.readObject()
    obj[key] = value
    await this.writeObject(obj)
  }

  async getItem(key: string): Promise<string | null> {
    const obj = await this.readObject()
    return obj[key] ?? null
  }

  async removeItem(key: string): Promise<void> {
    const obj = await this.readObject()
    delete obj[key]
    await this.writeObject(obj)
  }
}
