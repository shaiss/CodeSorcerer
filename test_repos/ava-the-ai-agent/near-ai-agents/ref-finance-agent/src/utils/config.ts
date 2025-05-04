import { NearConfig } from '../types';

/**
 * Default configuration for NEAR mainnet
 */
export const MAINNET_CONFIG: NearConfig = {
  networkId: 'mainnet',
  nodeUrl: 'https://rpc.mainnet.near.org',
  walletUrl: 'https://wallet.near.org',
  helperUrl: 'https://helper.mainnet.near.org',
  explorerUrl: 'https://explorer.near.org',
  refContractId: 'v2.ref-finance.near',
  wrapNearContractId: 'wrap.near'
};

/**
 * Default configuration for NEAR testnet
 */
export const TESTNET_CONFIG: NearConfig = {
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://explorer.testnet.near.org',
  refContractId: 'ref-finance-101.testnet',
  wrapNearContractId: 'wrap.testnet'
};

/**
 * Constants for Ref Finance interactions
 */
export const REF_CONSTANTS = {
  ONE_YOCTO: '1',
  STORAGE_DEPOSIT_AMOUNT: '0.1', // 0.1 NEAR for storage
  DEFAULT_REFERRAL_ID: 'ref-finance.near',
  SWAP_GAS: '200000000000000', // 200 TGas
  STORAGE_GAS: '30000000000000', // 30 TGas
  MIN_SLIPPAGE: 0.1, // 0.1%
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  MAX_SLIPPAGE: 10, // 10%
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  REF_CONTRACT_ID: 'v2.ref-finance.near',
  WRAP_NEAR_CONTRACT_ID: 'wrap.near'
};

/**
 * Popular tokens on Ref Finance
 */
export const POPULAR_TOKENS = [
  'wrap.near', // wNEAR
  'usdc.tether-token.near', // USDC
  'usdt.tether-token.near', // USDT
  'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near', // USDC.e
  'dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near', // USDT.e
  'token.skyward.near', // SKYWARD
  'meta-pool.near', // stNEAR
];

/**
 * Get the network configuration
 * @param network The network ID ('mainnet' or 'testnet')
 * @returns The network configuration
 */
export function getNetworkConfig(network: string = 'mainnet'): NearConfig {
  const config = network === 'testnet' ? TESTNET_CONFIG : MAINNET_CONFIG;
  
  REF_CONSTANTS.REF_CONTRACT_ID = config.refContractId;
  REF_CONSTANTS.WRAP_NEAR_CONTRACT_ID = config.wrapNearContractId;
  
  return config;
}

/**
 * Agent configuration
 */
export const AGENT_CONFIG = {
  name: 'ref-finance',
  displayName: 'Ref Finance Agent',
  description: 'An agent for interacting with the Ref Finance DeFi protocol on NEAR',
  defaultNetwork: 'mainnet',
  capabilities: [
    {
      id: 'get-pools',
      name: 'Get Pools',
      description: 'Retrieve a list of liquidity pools from Ref Finance'
    },
    {
      id: 'get-token-price',
      name: 'Get Token Price',
      description: 'Get the price of a token in terms of another token'
    },
    {
      id: 'get-token-balances',
      name: 'Get Token Balances',
      description: 'Get token balances for a NEAR account'
    },
    {
      id: 'swap-tokens',
      name: 'Swap Tokens',
      description: 'Execute a token swap on Ref Finance'
    }
  ]
}; 