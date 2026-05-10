// Adapted from @ton/blueprint
// Copyright (c) 2025 Ton Tech, MIT License
// Original: https://github.com/ton-org/blueprint/blob/main/src/network/storage/Storage.ts

export interface Storage {
  setItem(key: string, value: string): Promise<void>
  getItem(key: string): Promise<string | null>
  removeItem(key: string): Promise<void>
}
