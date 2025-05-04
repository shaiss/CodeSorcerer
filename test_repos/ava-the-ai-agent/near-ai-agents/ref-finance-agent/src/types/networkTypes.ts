/**
 * Network IDs supported by the application
 */
export enum NetworkId {
  MAINNET = 'mainnet',
  TESTNET = 'testnet'
}

/**
 * Network configuration for NEAR
 */
export interface NetworkConfig {
  networkId: NetworkId;
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
  explorerUrl: string;
  refFinanceBaseUrl: string;
  indexerApiUrl: string;
  refContractId: string;
  wrapNearContractId: string;
}

/**
 * Configuration for each supported network
 */
export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  [NetworkId.MAINNET]: {
    networkId: NetworkId.MAINNET,
    nodeUrl: 'https://rpc.mainnet.near.org',
    walletUrl: 'https://wallet.near.org',
    helperUrl: 'https://helper.mainnet.near.org',
    explorerUrl: 'https://explorer.mainnet.near.org',
    refFinanceBaseUrl: 'https://api.ref.finance',
    indexerApiUrl: 'https://indexer.ref.finance',
    refContractId: 'v2.ref-finance.near',
    wrapNearContractId: 'wrap.near'
  },
  [NetworkId.TESTNET]: {
    networkId: NetworkId.TESTNET,
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://explorer.testnet.near.org',
    refFinanceBaseUrl: 'https://testnet-api.ref.finance',
    indexerApiUrl: 'https://testnet-indexer.ref.finance',
    refContractId: 'ref-finance-101.testnet',
    wrapNearContractId: 'wrap.testnet'
  }
};

/**
 * Get network configuration for the specified network ID
 */
export function getNetworkConfig(networkId: NetworkId): NetworkConfig {
  return NETWORK_CONFIGS[networkId];
} 