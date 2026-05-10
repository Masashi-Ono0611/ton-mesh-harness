import os from 'os'
import path from 'path'

export const TONCONNECT_MANIFEST_URL =
  'https://raw.githubusercontent.com/Masashi-Ono0611/sovereign-deploy-kit/main/tonconnect/manifest.json'

export function getTonConnectStoragePath(): string {
  return path.join(os.homedir(), '.ton-sovereign', 'tonconnect.json')
}
