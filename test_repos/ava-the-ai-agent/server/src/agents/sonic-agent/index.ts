import { Agent } from '../agent';
import type { EventBus } from "../../comms";
import { AIProvider } from "../../services/ai/types";
import { StorageInterface } from "../types/storage";
import { SonicMarketProvider } from "../plugins/sonic-market";
import { MarginZeroProvider, BuyOptionParams } from "../plugins/margin-zero";
import { CHAIN_IDS, CHART_LOG_INTERVALS } from '@clober/v2-sdk';
import { Address } from 'viem';

interface SonicAgentConfig {
  chainId: CHAIN_IDS;
  rpcUrl: string;
}

export class SonicAgent extends Agent {
  private storage: StorageInterface;
  private sonicProvider: SonicMarketProvider;
  private marginZeroProvider?: MarginZeroProvider;
  private taskResults: Map<string, any> = new Map();
  private currentTaskId: string | null = null;

  constructor(
    name: string,
    eventBus: EventBus,
    storage: StorageInterface,
    sonicProvider: SonicMarketProvider,
    marginZeroProvider?: MarginZeroProvider,
    aiProvider?: AIProvider
  ) {
    super(name, eventBus, aiProvider);
    this.storage = storage;
    this.sonicProvider = sonicProvider;
    this.marginZeroProvider = marginZeroProvider;
    this.setupEventHandlers();
    console.log(`[${name}] Sonic Agent initialized`);
  }

  // Implement the abstract method from Agent class
  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    // Store the step results if there's an active task
    if (this.currentTaskId) {
      await this.storage.store(`${this.name}:step:${this.currentTaskId}:${Date.now()}`, {
        text,
        toolCalls,
        toolResults
      }, {
        agent: this.name,
        taskId: this.currentTaskId,
        timestamp: Date.now(),
        type: 'step-result'
      });
    }
  }

  private setupEventHandlers(): void {
    // Listen for task manager requests
    this.eventBus.register(`task-manager-${this.name}`, (data) => {
      this.handleEvent(`task-manager-${this.name}`, data);
    });
  }

  async handleEvent(event: string, data: any): Promise<void> {
    console.log(`[${this.name}] Received event: ${event}`);
    
    if (event === `task-manager-${this.name}`) {
      await this.handleTaskManagerRequest(data);
    }
  }

  private async handleTaskManagerRequest(data: any): Promise<void> {
    try {
      this.currentTaskId = data.taskId;
      console.log(`[${this.name}] Processing task: ${data.task}`);

      // Use AI to parse the task if available
      let operation, params;
      if (this.aiProvider) {
        const parsed = await this.parseTaskWithAI(data.task);
        operation = parsed.operation;
        params = parsed.params;
      } else {
        // Basic parsing if AI is not available
        const parts = data.task.split(' ');
        operation = parts[0].toLowerCase();
        params = data;
      }

      // Execute the operation
      const result = await this.executeOperation(operation, params);
      
      // Store the result
      this.taskResults.set(data.taskId, result);
      
      // Emit the result back to the task manager
      this.eventBus.emit(`${this.name}-task-manager`, {
        taskId: data.taskId,
        status: 'completed',
        result
      });
    } catch (error) {
      console.error(`[${this.name}] Error processing task:`, error);
      
      // Emit error back to the task manager
      this.eventBus.emit(`${this.name}-task-manager`, {
        taskId: data.taskId,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.currentTaskId = null;
    }
  }

  private async parseTaskWithAI(task: string): Promise<{ operation: string, params: any }> {
    if (!this.aiProvider) {
      throw new Error('AI provider not available');
    }

    const systemPrompt = `
      You are an AI assistant for a Sonic Market and MarginZero trading agent. 
      Parse the user's request into a structured command for the Sonic Market or MarginZero protocol.
      
      Available Sonic Market operations:
      - getMarket: Get market information for a token pair
      - getPool: Get pool information for a token pair
      - getOpenOrders: Get open orders for a user
      - getChartData: Get chart data for a token pair
      - placeLimitOrder: Place a limit order
      - placeMarketOrder: Place a market order
      - claimOrder: Claim an order
      - cancelOrder: Cancel an order
      - addLiquidity: Add liquidity to a pool
      - removeLiquidity: Remove liquidity from a pool
      
      Available MarginZero operations:
      - isHandlerWhitelisted: Check if a handler is whitelisted
      - isHandlerWhitelistedForApp: Check if a handler is whitelisted for a specific app
      - mintPosition: Mint a position using a handler
      - burnPosition: Burn a position using a handler
      - usePosition: Use a position using a handler
      - unusePosition: Unuse a position using a handler
      - donateToPosition: Donate to a position using a handler
      - getOptionData: Get option data
      - getOptionPrice: Get option price
      - buyOption: Buy an option
      - exerciseOption: Exercise an option
      
      Return a JSON object with:
      - operation: The operation to perform
      - params: The parameters for the operation
    `;

    try {
      const response = await this.aiProvider.generateText(task, systemPrompt);
      const parsedResponse = JSON.parse(response.text);
      return {
        operation: parsedResponse.operation,
        params: parsedResponse.params
      };
    } catch (error) {
      console.error('Error parsing task with AI:', error);
      throw new Error('Failed to parse task');
    }
  }

  private async executeOperation(operation: string, params: any): Promise<any> {
    switch (operation.toLowerCase()) {
      // Sonic Market operations
      case 'getmarket':
        return this.getMarket(params.token0, params.token1);
      case 'getpool':
        return this.getPool(params.token0, params.token1, params.salt);
      case 'getopenorders':
        return this.getOpenOrders(params.userAddress);
      case 'getchartdata':
        return this.getChartData(params.quoteToken, params.baseToken, params.interval, params.from, params.to);
      case 'placelimitorder':
        return this.placeLimitOrder(params.userAddress, params.inputToken, params.outputToken, params.amount, params.price);
      case 'placemarketorder':
        return this.placeMarketOrder(params.userAddress, params.inputToken, params.outputToken, params.amountIn, params.amountOut, params.slippage);
      case 'claimorder':
        return this.claimOrder(params.userAddress, params.orderId);
      case 'cancelorder':
        return this.cancelOrder(params.userAddress, params.orderId);
      case 'addliquidity':
        return this.addLiquidity(params.userAddress, params.token0, params.token1, params.salt, params.amount0, params.amount1, params.slippage);
      case 'removeliquidity':
        return this.removeLiquidity(params.userAddress, params.token0, params.token1, params.salt, params.amount, params.slippage);
      
      // MarginZero operations
      case 'ishandlerwhitelisted':
        return this.isHandlerWhitelisted(params.handlerAddress);
      case 'ishandlerwhitelistedforapp':
        return this.isHandlerWhitelistedForApp(params.handlerAddress, params.appAddress);
      case 'mintposition':
        return this.mintPosition(params.handlerAddress, params.mintPositionData);
      case 'burnposition':
        return this.burnPosition(params.handlerAddress, params.burnPositionData);
      case 'useposition':
        return this.usePosition(params.handlerAddress, params.usePositionData);
      case 'unuseposition':
        return this.unusePosition(params.handlerAddress, params.unusePositionData);
      case 'donatetoposition':
        return this.donateToPosition(params.handlerAddress, params.donatePositionData);
      case 'getoptiondata':
        return this.getOptionData(params.tokenId);
      case 'getoptionprice':
        return this.getOptionPrice(params.tokenId);
      case 'buyoption':
        return this.buyOption(params);
      case 'exerciseoption':
        return this.exerciseOption(params.tokenId);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Sonic Market operations
  async getMarket(token0: Address, token1: Address): Promise<any> {
    try {
      const market = await this.sonicProvider.getMarket(token0, token1);
      return {
        success: true,
        data: market
      };
    } catch (error) {
      console.error('Error getting market:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getPool(token0: Address, token1: Address, salt: Address): Promise<any> {
    try {
      const pool = await this.sonicProvider.getPool(token0, token1, salt);
      return {
        success: true,
        data: pool
      };
    } catch (error) {
      console.error('Error getting pool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getOpenOrders(userAddress: Address): Promise<any> {
    try {
      const orders = await this.sonicProvider.getOpenOrders(userAddress);
      return {
        success: true,
        data: orders
      };
    } catch (error) {
      console.error('Error getting open orders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getChartData(
    quoteToken: Address, 
    baseToken: Address, 
    interval: CHART_LOG_INTERVALS = CHART_LOG_INTERVALS.oneHour,
    from?: number,
    to?: number
  ): Promise<any> {
    try {
      const chartData = await this.sonicProvider.getChartData(quoteToken, baseToken, interval, from, to);
      return {
        success: true,
        data: chartData
      };
    } catch (error) {
      console.error('Error getting chart data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Order operations
  async placeLimitOrder(
    userAddress: Address,
    inputToken: Address,
    outputToken: Address,
    amount: string,
    price: string
  ): Promise<any> {
    try {
      const result = await this.sonicProvider.placeLimitOrder(userAddress, inputToken, outputToken, amount, price);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error placing limit order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async placeMarketOrder(
    userAddress: Address,
    inputToken: Address,
    outputToken: Address,
    amountIn?: string,
    amountOut?: string,
    slippage: number = 0.5
  ): Promise<any> {
    try {
      const result = await this.sonicProvider.placeMarketOrder(userAddress, inputToken, outputToken, amountIn, amountOut, slippage);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error placing market order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async claimOrder(userAddress: Address, orderId: string): Promise<any> {
    try {
      const result = await this.sonicProvider.claimOrder(userAddress, orderId);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error claiming order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async cancelOrder(userAddress: Address, orderId: string): Promise<any> {
    try {
      const result = await this.sonicProvider.cancelOrder(userAddress, orderId);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error canceling order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Liquidity operations
  async addLiquidity(
    userAddress: Address,
    token0: Address,
    token1: Address,
    salt: Address,
    amount0?: string,
    amount1?: string,
    slippage: number = 0.5
  ): Promise<any> {
    try {
      const result = await this.sonicProvider.addLiquidity(userAddress, token0, token1, salt, amount0, amount1, slippage);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error adding liquidity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async removeLiquidity(
    userAddress: Address,
    token0: Address,
    token1: Address,
    salt: Address,
    amount: string,
    slippage: number = 0.5
  ): Promise<any> {
    try {
      const result = await this.sonicProvider.removeLiquidity(userAddress, token0, token1, salt, amount, slippage);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error removing liquidity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // MarginZero operations
  async isHandlerWhitelisted(handlerAddress: Address): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const isWhitelisted = await this.marginZeroProvider.isHandlerWhitelisted(handlerAddress);
      return {
        success: true,
        data: {
          handlerAddress,
          isWhitelisted
        }
      };
    } catch (error) {
      console.error('Error checking if handler is whitelisted:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async isHandlerWhitelistedForApp(handlerAddress: Address, appAddress: Address): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const isWhitelisted = await this.marginZeroProvider.isHandlerWhitelistedForApp(handlerAddress, appAddress);
      return {
        success: true,
        data: {
          handlerAddress,
          appAddress,
          isWhitelisted
        }
      };
    } catch (error) {
      console.error('Error checking if handler is whitelisted for app:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async mintPosition(handlerAddress: Address, mintPositionData: `0x${string}`): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const sharesMinted = await this.marginZeroProvider.mintPosition(handlerAddress, mintPositionData);
      return {
        success: true,
        data: {
          handlerAddress,
          sharesMinted: sharesMinted.toString()
        }
      };
    } catch (error) {
      console.error('Error minting position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async burnPosition(handlerAddress: Address, burnPositionData: `0x${string}`): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const sharesBurned = await this.marginZeroProvider.burnPosition(handlerAddress, burnPositionData);
      return {
        success: true,
        data: {
          handlerAddress,
          sharesBurned: sharesBurned.toString()
        }
      };
    } catch (error) {
      console.error('Error burning position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async usePosition(handlerAddress: Address, usePositionData: `0x${string}`): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const result = await this.marginZeroProvider.usePosition(handlerAddress, usePositionData);
      return {
        success: true,
        data: {
          handlerAddress,
          tokens: result.tokens,
          amounts: result.amounts.map(amount => amount.toString()),
          liquidityUsed: result.liquidityUsed.toString()
        }
      };
    } catch (error) {
      console.error('Error using position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async unusePosition(handlerAddress: Address, unusePositionData: `0x${string}`): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const result = await this.marginZeroProvider.unusePosition(handlerAddress, unusePositionData);
      return {
        success: true,
        data: {
          handlerAddress,
          amounts: result.amounts.map(amount => amount.toString()),
          liquidity: result.liquidity.toString()
        }
      };
    } catch (error) {
      console.error('Error unuseing position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async donateToPosition(handlerAddress: Address, donatePositionData: `0x${string}`): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const result = await this.marginZeroProvider.donateToPosition(handlerAddress, donatePositionData);
      return {
        success: true,
        data: {
          handlerAddress,
          amounts: result.amounts.map(amount => amount.toString()),
          liquidity: result.liquidity.toString()
        }
      };
    } catch (error) {
      console.error('Error donating to position:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getOptionData(tokenId: bigint): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const optionData = await this.marginZeroProvider.getOptionData(tokenId);
      return {
        success: true,
        data: {
          tokenId: tokenId.toString(),
          opTickArrayLen: optionData.opTickArrayLen.toString(),
          expiry: optionData.expiry.toString(),
          tickLower: optionData.tickLower,
          tickUpper: optionData.tickUpper,
          isCall: optionData.isCall
        }
      };
    } catch (error) {
      console.error('Error getting option data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getOptionPrice(tokenId: bigint): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const price = await this.marginZeroProvider.getOptionPrice(tokenId);
      return {
        success: true,
        data: {
          tokenId: tokenId.toString(),
          price: price.toString()
        }
      };
    } catch (error) {
      console.error('Error getting option price:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async buyOption(params: BuyOptionParams): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const result = await this.marginZeroProvider.buyOption(params);
      return {
        success: true,
        data: {
          tokenId: result.tokenId.toString(),
          premium: result.premium.toString()
        }
      };
    } catch (error) {
      console.error('Error buying option:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async exerciseOption(tokenId: bigint): Promise<any> {
    if (!this.marginZeroProvider) {
      return {
        success: false,
        error: 'MarginZero provider not available'
      };
    }

    try {
      const profit = await this.marginZeroProvider.exerciseOption(tokenId);
      return {
        success: true,
        data: {
          tokenId: tokenId.toString(),
          profit: profit.toString()
        }
      };
    } catch (error) {
      console.error('Error exercising option:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
} 