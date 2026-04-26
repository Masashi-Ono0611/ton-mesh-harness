export interface NetworkConfig {
  tonapiUrl: string
  daemonConfigUrl: string
}

const NETWORKS: Record<'mainnet' | 'testnet', NetworkConfig> = {
  mainnet: {
    tonapiUrl: 'https://tonapi.io',
    daemonConfigUrl: 'https://ton.org/global.config.json',
  },
  testnet: {
    tonapiUrl: 'https://testnet.tonapi.io',
    daemonConfigUrl: 'https://ton.org/testnet-global.config.json',
  },
}

export function getNetworkConfig(testnet = false): NetworkConfig {
  return NETWORKS[testnet ? 'testnet' : 'mainnet']
}
