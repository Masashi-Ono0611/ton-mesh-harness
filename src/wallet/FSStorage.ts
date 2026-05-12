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
      // Reject symlinks BEFORE reading. The TonConnect bridge session
      // gives whoever holds it authority to send signed-tx requests to
      // the user's wallet — an attacker who can swap the file with a
      // symlink to their own session would hijack the bridge.
      // Self-audit (Codex round 11 class — mirror src/daemon/keyring.ts).
      try {
        const stat = await fs.lstat(this.path)
        if (stat.isSymbolicLink()) {
          // Treat a symlink as "no session" rather than throwing —
          // TonConnect's bridge will re-establish a clean session, and
          // a hard throw here would break every CLI invocation if the
          // user happened to symlink their config dir intentionally.
          // The symlink presence is logged via stderr so it isn't
          // silently masked.
          process.stderr.write(
            `  ⚠ TonConnect session file ${this.path} is a symlink — refusing to read. ` +
              `A fresh session will be created. Delete the symlink to retry the original.\n`,
          )
          return {}
        }
      } catch {
        // ENOENT or stat error — fall through to readFile which has
        // the same try/catch.
      }
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
    // Symlink defence: if the file at this.path is a symlink, unlink
    // it before writing so the new file lands at the real location
    // (NOT through the symlink). This mirrors src/daemon/keyring.ts's
    // pattern (Codex r7-8 BLOCKERs against wallet-key redirect).
    try {
      const stat = await fs.lstat(this.path)
      if (stat.isSymbolicLink()) {
        process.stderr.write(
          `  ⚠ TonConnect session file ${this.path} is a symlink — removing before write.\n`,
        )
        await fs.unlink(this.path)
      } else if (!stat.isFile()) {
        throw new Error(
          `FSStorage: ${this.path} exists but is not a regular file (mode=${stat.mode.toString(8)})`,
        )
      }
    } catch (err) {
      // ENOENT is expected on first write.
      if (err instanceof Error && (err as { code?: string }).code !== 'ENOENT') {
        // Re-throw anything other than ENOENT — but allow our own throw
        // about non-regular-file to surface.
        if ((err as { code?: string }).code === undefined) throw err
      }
    }
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
