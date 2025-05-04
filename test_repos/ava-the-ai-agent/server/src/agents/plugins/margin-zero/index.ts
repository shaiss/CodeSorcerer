import { Address, Account, createPublicClient, http, createWalletClient, parseUnits, formatUnits, Chain } from 'viem';
import { CHAIN_IDS } from '@clober/v2-sdk';
import { mainnet, arbitrum, optimism, base } from 'viem/chains';

// ABI imports for MarginZero contracts
const POSITION_MANAGER_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "PositionManager__NotWhitelistedApp",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PositionManager__NotWhitelistedHandler",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "contract IHandler",
        "name": "_handler",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "liquidityDonated",
        "type": "uint256"
      }
    ],
    "name": "LogDonation",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "contract IHandler",
        "name": "_handler",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_donatePosition",
        "type": "bytes"
      }
    ],
    "name": "donateToPosition",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IHandler",
        "name": "_handler",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_mintPositionData",
        "type": "bytes"
      }
    ],
    "name": "mintPosition",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sharesMinted",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IHandler",
        "name": "_handler",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_burnPositionData",
        "type": "bytes"
      }
    ],
    "name": "burnPosition",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sharesBurned",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IHandler",
        "name": "_handler",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_usePositionData",
        "type": "bytes"
      }
    ],
    "name": "usePosition",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "tokens",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "liquidityUsed",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IHandler",
        "name": "_handler",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "_unusePositionData",
        "type": "bytes"
      }
    ],
    "name": "unusePosition",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "whitelistedHandlersWithApp",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "whitelistedHandlers",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const OPTION_MARKET_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getOptionData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "opTickArrayLen",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "expiry",
            "type": "uint256"
          },
          {
            "internalType": "int24",
            "name": "tickLower",
            "type": "int24"
          },
          {
            "internalType": "int24",
            "name": "tickUpper",
            "type": "int24"
          },
          {
            "internalType": "bool",
            "name": "isCall",
            "type": "bool"
          }
        ],
        "internalType": "struct OptionMarketOTMFE.OptionData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "token0",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "bool",
            "name": "isCall",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "expiry",
            "type": "uint256"
          },
          {
            "internalType": "int24",
            "name": "strike",
            "type": "int24"
          },
          {
            "internalType": "uint256",
            "name": "notionalAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxCost",
            "type": "uint256"
          }
        ],
        "internalType": "struct OptionMarketOTMFE.BuyOptionParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "buyOption",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "premium",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "exerciseOption",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "profit",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getOptionPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface MarginZeroConfig {
  chainId: CHAIN_IDS;
  rpcUrl: string;
  account?: Account;
  positionManagerAddress: Address;
  optionMarketAddress: Address;
}

export interface OptionData {
  opTickArrayLen: bigint;
  expiry: bigint;
  tickLower: number;
  tickUpper: number;
  isCall: boolean;
}

export interface BuyOptionParams {
  token0: Address;
  token1: Address;
  fee: number;
  isCall: boolean;
  expiry: bigint;
  strike: number;
  notionalAmount: bigint;
  maxCost: bigint;
}

// This type matches the exact structure expected by the contract ABI
type BuyOptionParamsAbi = {
  token0: Address;
  token1: Address;
  fee: number;
  isCall: boolean;
  expiry: bigint;
  strike: number;
  notionalAmount: bigint;
  maxCost: bigint;
};

export class MarginZeroProvider {
  private config: MarginZeroConfig;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient?: ReturnType<typeof createWalletClient>;

  constructor(config: MarginZeroConfig) {
    this.config = config;
    
    // Create a chain configuration based on the chainId
    const chainConfig: Chain = {
      id: Number(config.chainId),
      name: `Chain ${config.chainId}`,
      nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
      },
      rpcUrls: {
        default: { http: [config.rpcUrl] },
        public: { http: [config.rpcUrl] },
      },
      blockExplorers: {
        default: {
          name: 'Explorer',
          url: 'https://explorer.example.com',
        },
      },
    };
    
    this.publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(config.rpcUrl)
    });

    if (config.account) {
      this.walletClient = createWalletClient({
        account: config.account,
        chain: chainConfig,
        transport: http(config.rpcUrl)
      });
    }
  }

  /**
   * Check if a handler is whitelisted
   */
  async isHandlerWhitelisted(handlerAddress: Address): Promise<boolean> {
    try {
      return await this.publicClient.readContract({
        address: this.config.positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'whitelistedHandlers',
        args: [handlerAddress]
      });
    } catch (error) {
      console.error('Failed to check if handler is whitelisted:', error);
      throw error;
    }
  }

  /**
   * Check if a handler is whitelisted for a specific app
   */
  async isHandlerWhitelistedForApp(handlerAddress: Address, appAddress: Address): Promise<boolean> {
    try {
      // We need to compute the keccak256 hash of the encoded handler and app addresses
      const encodedData = new TextEncoder().encode(handlerAddress + appAddress.slice(2));
      const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return await this.publicClient.readContract({
        address: this.config.positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'whitelistedHandlersWithApp',
        args: [hashHex as `0x${string}`]
      });
    } catch (error) {
      console.error('Failed to check if handler is whitelisted for app:', error);
      throw error;
    }
  }

  /**
   * Mint a position using a handler
   */
  async mintPosition(handlerAddress: Address, mintPositionData: `0x${string}`): Promise<bigint> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for transactions');
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.config.positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'mintPosition',
        args: [handlerAddress, mintPositionData],
        account: this.config.account!
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse the logs to get the shares minted
      // This is a simplified approach - in a real implementation, you would parse the event logs
      return BigInt(0); // Placeholder
    } catch (error) {
      console.error('Failed to mint position:', error);
      throw error;
    }
  }

  /**
   * Burn a position using a handler
   */
  async burnPosition(handlerAddress: Address, burnPositionData: `0x${string}`): Promise<bigint> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for transactions');
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.config.positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'burnPosition',
        args: [handlerAddress, burnPositionData],
        account: this.config.account!
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse the logs to get the shares burned
      // This is a simplified approach - in a real implementation, you would parse the event logs
      return BigInt(0); // Placeholder
    } catch (error) {
      console.error('Failed to burn position:', error);
      throw error;
    }
  }

  /**
   * Use a position using a handler
   */
  async usePosition(handlerAddress: Address, usePositionData: `0x${string}`): Promise<{
    tokens: Address[];
    amounts: bigint[];
    liquidityUsed: bigint;
  }> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for transactions');
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.config.positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'usePosition',
        args: [handlerAddress, usePositionData],
        account: this.config.account!
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse the logs to get the result
      // This is a simplified approach - in a real implementation, you would parse the event logs
      return {
        tokens: [],
        amounts: [],
        liquidityUsed: BigInt(0)
      }; // Placeholder
    } catch (error) {
      console.error('Failed to use position:', error);
      throw error;
    }
  }

  /**
   * Unuse a position using a handler
   */
  async unusePosition(handlerAddress: Address, unusePositionData: `0x${string}`): Promise<{
    amounts: bigint[];
    liquidity: bigint;
  }> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for transactions');
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.config.positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'unusePosition',
        args: [handlerAddress, unusePositionData],
        account: this.config.account!
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse the logs to get the result
      // This is a simplified approach - in a real implementation, you would parse the event logs
      return {
        amounts: [],
        liquidity: BigInt(0)
      }; // Placeholder
    } catch (error) {
      console.error('Failed to unuse position:', error);
      throw error;
    }
  }

  /**
   * Donate to a position using a handler
   */
  async donateToPosition(handlerAddress: Address, donatePositionData: `0x${string}`): Promise<{
    amounts: bigint[];
    liquidity: bigint;
  }> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for transactions');
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.config.positionManagerAddress,
        abi: POSITION_MANAGER_ABI,
        functionName: 'donateToPosition',
        args: [handlerAddress, donatePositionData],
        account: this.config.account!
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse the logs to get the result
      // This is a simplified approach - in a real implementation, you would parse the event logs
      return {
        amounts: [],
        liquidity: BigInt(0)
      }; // Placeholder
    } catch (error) {
      console.error('Failed to donate to position:', error);
      throw error;
    }
  }

  /**
   * Get option data
   */
  async getOptionData(tokenId: bigint): Promise<OptionData> {
    try {
      return await this.publicClient.readContract({
        address: this.config.optionMarketAddress,
        abi: OPTION_MARKET_ABI,
        functionName: 'getOptionData',
        args: [tokenId]
      });
    } catch (error) {
      console.error('Failed to get option data:', error);
      throw error;
    }
  }

  /**
   * Get option price
   */
  async getOptionPrice(tokenId: bigint): Promise<bigint> {
    try {
      return await this.publicClient.readContract({
        address: this.config.optionMarketAddress,
        abi: OPTION_MARKET_ABI,
        functionName: 'getOptionPrice',
        args: [tokenId]
      });
    } catch (error) {
      console.error('Failed to get option price:', error);
      throw error;
    }
  }

  /**
   * Buy an option
   */
  async buyOption(params: BuyOptionParams): Promise<{
    tokenId: bigint;
    premium: bigint;
  }> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for transactions');
    }

    try {
      // Create a parameter object that matches the ABI structure
      const buyOptionParams: BuyOptionParamsAbi = {
        token0: params.token0,
        token1: params.token1,
        fee: params.fee,
        isCall: params.isCall,
        expiry: params.expiry,
        strike: params.strike,
        notionalAmount: params.notionalAmount,
        maxCost: params.maxCost
      };

      const { request } = await this.publicClient.simulateContract({
        address: this.config.optionMarketAddress,
        abi: OPTION_MARKET_ABI,
        functionName: 'buyOption',
        args: [buyOptionParams],
        account: this.config.account!
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse the logs to get the result
      // This is a simplified approach - in a real implementation, you would parse the event logs
      return {
        tokenId: BigInt(0),
        premium: BigInt(0)
      }; // Placeholder
    } catch (error) {
      console.error('Failed to buy option:', error);
      throw error;
    }
  }

  /**
   * Exercise an option
   */
  async exerciseOption(tokenId: bigint): Promise<bigint> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for transactions');
    }

    try {
      const { request } = await this.publicClient.simulateContract({
        address: this.config.optionMarketAddress,
        abi: OPTION_MARKET_ABI,
        functionName: 'exerciseOption',
        args: [tokenId],
        account: this.config.account!
      });

      const hash = await this.walletClient.writeContract(request);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      // Parse the logs to get the profit
      // This is a simplified approach - in a real implementation, you would parse the event logs
      return BigInt(0); // Placeholder
    } catch (error) {
      console.error('Failed to exercise option:', error);
      throw error;
    }
  }
} 