import { 
  CHAIN_IDS, 
  getMarket, 
  getPool, 
  getOpenOrders, 
  getChartLogs, 
  limitOrder, 
  marketOrder, 
  claimOrder, 
  cancelOrder, 
  addLiquidity, 
  removeLiquidity,
  CHART_LOG_INTERVALS,
  type Market,
  type Pool,
  type OpenOrder,
  type ChartLog,
  type Transaction
} from '@clober/v2-sdk';
import { Account, Address } from 'viem';

export interface SonicMarketConfig {
  chainId: CHAIN_IDS;
  rpcUrl: string;
  account?: Account;
}

export class SonicMarketProvider {
  private config: SonicMarketConfig;

  constructor(config: SonicMarketConfig) {
    this.config = config;
  }

  /**
   * Get market information for a token pair
   */
  async getMarket(token0: Address, token1: Address): Promise<Market> {
    try {
      return await getMarket({
        chainId: this.config.chainId,
        token0: token0,
        token1: token1,
        options: {
          rpcUrl: this.config.rpcUrl
        }
      });
    } catch (error) {
      console.error('Failed to get market:', error);
      throw error;
    }
  }

  /**
   * Get pool information for a token pair
   */
  async getPool(token0: Address, token1: Address, salt: Address): Promise<Pool> {
    try {
      return await getPool({
        chainId: this.config.chainId,
        token0: token0,
        token1: token1,
        salt: salt,
        options: {
          rpcUrl: this.config.rpcUrl
        }
      });
    } catch (error) {
      console.error('Failed to get pool:', error);
      throw error;
    }
  }

  /**
   * Get open orders for a user
   */
  async getOpenOrders(userAddress: Address): Promise<OpenOrder[]> {
    try {
      return await getOpenOrders({
        chainId: this.config.chainId,
        userAddress: userAddress,
        options: {
          rpcUrl: this.config.rpcUrl
        }
      });
    } catch (error) {
      console.error('Failed to get open orders:', error);
      throw error;
    }
  }

  /**
   * Get chart data for a token pair
   */
  async getChartData(
    quoteToken: Address, 
    baseToken: Address, 
    interval: CHART_LOG_INTERVALS = CHART_LOG_INTERVALS.oneHour,
    from: number = Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
    to: number = Math.floor(Date.now() / 1000)
  ): Promise<ChartLog[]> {
    try {
      return await getChartLogs({
        chainId: this.config.chainId,
        quote: quoteToken,
        base: baseToken,
        intervalType: interval,
        from,
        to
      });
    } catch (error) {
      console.error('Failed to get chart data:', error);
      throw error;
    }
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(
    userAddress: Address,
    inputToken: Address,
    outputToken: Address,
    amount: string,
    price: string
  ): Promise<{ transaction: Transaction }> {
    if (!this.config.account) {
      throw new Error('Account is required for transactions');
    }

    try {
      return await limitOrder({
        chainId: this.config.chainId,
        userAddress: userAddress,
        inputToken: inputToken,
        outputToken: outputToken,
        amount: amount,
        price: price,
        options: {
          rpcUrl: this.config.rpcUrl,
        }
      });
    } catch (error) {
      console.error('Failed to place limit order:', error);
      throw error;
    }
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(
    userAddress: Address,
    inputToken: Address,
    outputToken: Address,
    amountIn?: string,
    amountOut?: string,
    slippage: number = 0.5 // 0.5% slippage by default
  ): Promise<{ transaction: Transaction }> {
    if (!this.config.account) {
      throw new Error('Account is required for transactions');
    }

    if (!amountIn && !amountOut) {
      throw new Error('Either amountIn or amountOut must be provided');
    }

    try {
      return await marketOrder({
        chainId: this.config.chainId,
        userAddress: userAddress,
        inputToken: inputToken,
        outputToken: outputToken,
        amountIn: amountIn,
        amountOut: amountOut,
        options: {
          slippage: slippage,
          rpcUrl: this.config.rpcUrl,
        }
      });
    } catch (error) {
      console.error('Failed to place market order:', error);
      throw error;
    }
  }

  /**
   * Claim an order
   */
  async claimOrder(
    userAddress: Address,
    orderId: string
  ): Promise<{ transaction: Transaction }> {
    if (!this.config.account) {
      throw new Error('Account is required for transactions');
    }

    try {
      return await claimOrder({
        chainId: this.config.chainId,
        userAddress: userAddress,
        id: orderId,
        options: {
          rpcUrl: this.config.rpcUrl,
        }
      });
    } catch (error) {
      console.error('Failed to claim order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    userAddress: Address,
    orderId: string
  ): Promise<{ transaction: Transaction }> {
    if (!this.config.account) {
      throw new Error('Account is required for transactions');
    }

    try {
      return await cancelOrder({
        chainId: this.config.chainId,
        userAddress: userAddress,
        id: orderId,
        options: {
          rpcUrl: this.config.rpcUrl,
        }
      });
    } catch (error) {
      console.error('Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Add liquidity to a pool
   */
  async addLiquidity(
    userAddress: Address,
    token0: Address,
    token1: Address,
    salt: Address,
    amount0?: string,
    amount1?: string,
    slippage: number = 0.5 // 0.5% slippage by default
  ): Promise<{ transaction: Transaction | undefined }> {
    if (!this.config.account) {
      throw new Error('Account is required for transactions');
    }

    if (!amount0 && !amount1) {
      throw new Error('Either amount0 or amount1 must be provided');
    }

    try {
      return await addLiquidity({
        chainId: this.config.chainId,
        userAddress: userAddress,
        token0: token0,
        token1: token1,
        salt: salt,
        amount0: amount0,
        amount1: amount1,
        options: {
          slippage: slippage,
          rpcUrl: this.config.rpcUrl,
        }
      });
    } catch (error) {
      console.error('Failed to add liquidity:', error);
      throw error;
    }
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(
    userAddress: Address,
    token0: Address,
    token1: Address,
    salt: Address,
    amount: string,
    slippage: number = 0.5 // 0.5% slippage by default
  ): Promise<{ transaction: Transaction | undefined }> {
    if (!this.config.account) {
      throw new Error('Account is required for transactions');
    }

    try {
      return await removeLiquidity({
        chainId: this.config.chainId,
        userAddress: userAddress,
        token0: token0,
        token1: token1,
        salt: salt,
        amount: amount,
        options: {
          slippage: slippage,
          rpcUrl: this.config.rpcUrl,
        }
      });
    } catch (error) {
      console.error('Failed to remove liquidity:', error);
      throw error;
    }
  }
} 