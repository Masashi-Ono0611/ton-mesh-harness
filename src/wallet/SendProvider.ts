// Adapted from @ton/blueprint
// Copyright (c) 2025 Ton Tech, MIT License
// Original: https://github.com/ton-org/blueprint/blob/main/src/network/send/SendProvider.ts

import type { Address, Cell, StateInit } from '@ton/core'

export interface SendProvider {
  connect(): Promise<void>
  sendTransaction(
    address: Address,
    amount: bigint,
    payload?: Cell,
    stateInit?: StateInit,
  ): Promise<unknown>
  sendTransactionMulti(
    messages: Array<{ address: Address; amount: bigint; payload?: Cell; stateInit?: StateInit }>,
  ): Promise<unknown>
  address(): Address | undefined
}
