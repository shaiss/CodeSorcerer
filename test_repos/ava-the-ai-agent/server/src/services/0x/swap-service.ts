/**
 * Service for interacting with the 0x Swap API
 */

// Constants for native token representation
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const PERMIT2_ADDRESS = '0x000000000022d473030f116ddee9f6b43ac78ba3';

export interface PriceResponse {
  price: string;
  guaranteedPrice: string;
  estimatedPriceImpact: string;
  buyAmount: string;
  sellAmount: string;
  value: string;
  grossBuyAmount: string;
  grossSellAmount: string;
  gas: string;
  gasPrice: string;
  estimatedGas: string;
  protocolFee: string;
  minimumProtocolFee: string;
  allowanceTarget: string;
  sources: any[];
  buyTokenAddress: string;
  sellTokenAddress: string;
  sellTokenToEthRate: string;
  buyTokenToEthRate: string;
  fees: any;
  issues?: {
    allowance?: {
      actual: string;
      spender: string;
    }
  }
}

export interface QuoteResponse extends PriceResponse {
  transaction: {
    to: string;
    from: string;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
    chainId: number;
  }
}

interface SwapParams {
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  takerAddress?: string;
  chainId?: number;
  slippagePercentage?: string;
}

/**
 * Class for interacting with the 0x Swap API
 */
export class ZeroXSwapService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
  }

  /**
   * Get a price quote for a token swap
   */
  async getPrice(params: SwapParams): Promise<PriceResponse> {
    const url = new URL(`${this.apiUrl}/api/v1/0x/price`);
    
    // Add parameters to the URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get price quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting price quote:', error);
      throw error;
    }
  }

  /**
   * Get a firm quote for a token swap
   */
  async getQuote(params: SwapParams): Promise<QuoteResponse> {
    const url = new URL(`${this.apiUrl}/api/v1/0x/quote`);
    
    // Add parameters to the URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get swap quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting swap quote:', error);
      throw error;
    }
  }

  /**
   * Check if the token is a native token
   */
  isNativeToken(tokenAddress: string): boolean {
    return tokenAddress.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
  }

  /**
   * Check if the token is wrapped ETH
   */
  isWrappedEth(tokenAddress: string): boolean {
    return tokenAddress.toLowerCase() === WETH_ADDRESS.toLowerCase();
  }

  /**
   * Check if the swap is wrap/unwrap
   */
  isWrapUnwrapSwap(sellToken: string, buyToken: string): boolean {
    const isWrap = this.isNativeToken(sellToken) && this.isWrappedEth(buyToken);
    const isUnwrap = this.isWrappedEth(sellToken) && this.isNativeToken(buyToken);
    return isWrap || isUnwrap;
  }

  /**
   * Format an amount with a specified number of decimal places
   */
  formatAmount(amount: string | number, decimals: number = 18): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const divisor = Math.pow(10, decimals);
    return (num / divisor).toString();
  }

  /**
   * Parse an amount to token units
   */
  parseAmount(amount: string | number, decimals: number = 18): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const multiplier = Math.pow(10, decimals);
    return Math.floor(num * multiplier).toString();
  }
}

// Export a singleton instance
export const zeroXSwapService = new ZeroXSwapService(); 