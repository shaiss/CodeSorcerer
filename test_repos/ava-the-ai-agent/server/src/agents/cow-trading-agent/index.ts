import { Agent } from '../agent';
import { EventBus } from '../../comms';
import { AIProvider } from '../../services/ai/types';
import { ethers } from 'ethers';


import { TradingSdk, SupportedChainId, OrderKind, TradeParameters } from '@cowprotocol/cow-sdk';

export class CowTradingAgent extends Agent {
  private sdk: TradingSdk;
  private allowedTokens: Set<string> = new Set();

  constructor(
    eventBus: EventBus,
    privateKey: string,
    appCode: string = 'AVA_AI_AGENT',
    aiProvider?: AIProvider
  ) {
    super('CowTradingAgent', eventBus, aiProvider);
    
    // Initialize CoW Protocol SDK
    const signer = new ethers.Wallet(privateKey);
    this.sdk = new TradingSdk({
      chainId: SupportedChainId.SEPOLIA,
      signer,
      appCode,
    });

    // Initialize with some test tokens (in production this would come from governance)
    this.allowedTokens.add('0xfff9976782d46cc05630d1f6ebab18b2324d6b14'); // Test WETH
    this.allowedTokens.add('0x0625afb445c3b6b7b929342a04a22599fd5dbb59'); // Test USDC
  }

  async handleEvent(event: string, data: any): Promise<void> {
    switch (event) {
      case 'EXECUTE_TRADE':
        await this.executeTrade(data);
        break;
      case 'UPDATE_ALLOWLIST':
        await this.updateAllowlist(data);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
  }

  private async executeTrade(data: {
    sellToken: string;
    buyToken: string;
    amount: string;
    kind: OrderKind;
  }) {
    // Verify tokens are allowed
    if (!this.isTokenAllowed(data.sellToken) || !this.isTokenAllowed(data.buyToken)) {
      throw new Error('One or more tokens are not in the allowlist');
    }

    const parameters: TradeParameters = {
      kind: data.kind,
      sellToken: data.sellToken,
      sellTokenDecimals: 18, // This should be fetched dynamically in production
      buyToken: data.buyToken,
      buyTokenDecimals: 18, // This should be fetched dynamically in production
      amount: data.amount,
    };

    try {
      const orderId = await this.sdk.postSwapOrder(parameters);
      console.log('Order created, id: ', orderId);
      
      // Emit trade execution event
      this.eventBus.emit('TRADE_EXECUTED', {
        orderId,
        parameters,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Trade execution failed:', error);
      throw error;
    }
  }

  private isTokenAllowed(tokenAddress: string): boolean {
    return this.allowedTokens.has(tokenAddress.toLowerCase());
  }

  private async updateAllowlist(data: { tokens: string[]; action: 'add' | 'remove' }) {
    const { tokens, action } = data;
    
    tokens.forEach(token => {
      const normalizedToken = token.toLowerCase();
      if (action === 'add') {
        this.allowedTokens.add(normalizedToken);
      } else {
        this.allowedTokens.delete(normalizedToken);
      }
    });

    // Emit allowlist update event
    this.eventBus.emit('ALLOWLIST_UPDATED', {
      tokens: Array.from(this.allowedTokens),
      timestamp: Date.now(),
    });
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    // Handle any post-step processing if needed
    console.log('Step finished:', { text, toolCalls, toolResults });
  }
} 