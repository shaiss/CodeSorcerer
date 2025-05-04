import { Agent } from '../agent';
import { EventBus } from '../../comms';
import { AIProvider } from '../../services/ai/types';
import ConsoleKit from "brahma-console-kit";
import { Address } from 'viem';

interface SeiMoneyMarketConfig {
  apiKey: string;
  baseURL: string;
  supportedTokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

export class SeiMoneyMarketAgent extends Agent {
  private consoleKit;
  private supportedTokens: Map<string, { address: string; decimals: number }>;

  constructor(
    eventBus: EventBus,
    config: SeiMoneyMarketConfig,
    aiProvider?: AIProvider
  ) {
    super('SeiMoneyMarketAgent', eventBus, aiProvider);
    
    // Initialize ConsoleKit
    // @ts-ignore
    this.consoleKit = new ConsoleKit(config.apiKey, config.baseURL);
    
    // Initialize supported tokens map
    this.supportedTokens = new Map(
      config.supportedTokens.map(token => [
        token.symbol,
        { address: token.address, decimals: token.decimals }
      ])
    );
  }

  async handleEvent(event: string, data: any): Promise<void> {
    switch (event) {
      case 'DEPOSIT':
        await this.handleDeposit(data);
        break;
      case 'WITHDRAW':
        await this.handleWithdraw(data);
        break;
      case 'REBALANCE':
        await this.handleRebalance(data);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
  }

  private async handleDeposit(data: {
    token: string;
    amount: string;
  }) {
    const tokenInfo = this.supportedTokens.get(data.token);
    if (!tokenInfo) {
      throw new Error(`Unsupported token: ${data.token}`);
    }

    try {
      // Get client factory for user context
      const clientFactory = await this.consoleKit.getClientFactory();
      
      // Add deposit transaction to builder
      await this.consoleKit.coreActions.deposit({
        asset: tokenInfo.address as Address,
        amount: data.amount,
        chainId: clientFactory.chainId
      });

      // Emit deposit event
      this.eventBus.emit('DEPOSIT_EXECUTED', {
        token: data.token,
        amount: data.amount,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error;
    }
  }

  private async handleWithdraw(data: {
    token: string;
    amount: string;
  }) {
    const tokenInfo = this.supportedTokens.get(data.token);
    if (!tokenInfo) {
      throw new Error(`Unsupported token: ${data.token}`);
    }

    try {
      // Get client factory for user context
      const clientFactory = await this.consoleKit.getClientFactory();
      
      // Add withdrawal transaction to builder
      await this.consoleKit.coreActions.withdraw({
        asset: tokenInfo.address as Address,
        amount: data.amount,
        chainId: clientFactory.chainId
      });

      // Emit withdrawal event
      this.eventBus.emit('WITHDRAW_EXECUTED', {
        token: data.token,
        amount: data.amount,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Withdrawal failed:', error);
      throw error;
    }
  }

  private async handleRebalance(data: {
    targetAllocations: { [token: string]: number };
  }) {
    try {
      // Get current portfolio state
      const clientFactory = await this.consoleKit.getClientFactory();
      const portfolio = clientFactory.assets;

      // Calculate required actions to achieve target allocations
      const rebalanceActions = this.calculateRebalanceActions(
        portfolio,
        data.targetAllocations
      );

      // Execute rebalance actions
      for (const action of rebalanceActions) {
        if (action.type === 'deposit') {
          await this.handleDeposit({
            token: action.token,
            amount: action.amount
          });
        } else {
          await this.handleWithdraw({
            token: action.token,
            amount: action.amount
          });
        }
      }

      // Emit rebalance event
      this.eventBus.emit('REBALANCE_EXECUTED', {
        targetAllocations: data.targetAllocations,
        actions: rebalanceActions,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Rebalance failed:', error);
      throw error;
    }
  }

  private calculateRebalanceActions(
    currentPortfolio: any[],
    targetAllocations: { [token: string]: number }
  ): Array<{
    type: 'deposit' | 'withdraw';
    token: string;
    amount: string;
  }> {
    // @kamal : Implementation of rebalancing logic
    // This would calculate the necessary trades to achieve target allocations
    // Returns array of required actions
    return [];
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    console.log('Step finished:', { text, toolCalls, toolResults });
  }
} 