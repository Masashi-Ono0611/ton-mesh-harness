import os from 'os'
import path from 'path'

export const TONCONNECT_MANIFEST_URL =
  'https://raw.githubusercontent.com/Masashi-Ono0611/ton-mesh-harness/main/tonconnect/manifest.json'

export function getTonConnectStoragePath(): string {
  return path.join(os.homedir(), '.ton-mesh', 'tonconnect.json')
}

/** Sign-request validity window: 5 minutes (chain-enforced cap). */
export const SIGN_WINDOW_SECONDS = 5 * 60

/**
 * Build the `validUntil` Unix-epoch-second timestamp for a wallet sign
 * request (TonConnect SDK + walletkit both use this convention).
 * Used by `TonConnectProvider.sendTransactionMulti` and
 * `agenticSignAndSend` so the same 5-minute window applies regardless
 * of signing path.
 */
export function signRequestValidUntilSeconds(): number {
  return Math.floor(Date.now() / 1000) + SIGN_WINDOW_SECONDS
}
