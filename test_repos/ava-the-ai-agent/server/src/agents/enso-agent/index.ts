import { Agent } from '../agent';
import { EventBus } from '../../comms';
import { AIProvider } from '../../services/ai/types';

interface EnsoConfig {
  apiKey: string;
  defaultChainId: number;
  defaultSlippage: string;
  safeAddress: string;
}

interface EnsoAction {
  protocol: string;
  action: string;
  args: Record<string, any>;
}

export class EnsoAgent extends Agent {
  private config: EnsoConfig;
  private baseUrl: string = 'https://api.enso.finance/api/v1';

  constructor(
    eventBus: EventBus,
    config: EnsoConfig,
    aiProvider?: AIProvider
  ) {
    super('EnsoAgent', eventBus, aiProvider);
    this.config = config;
  }

  async handleEvent(event: string, data: any): Promise<void> {
    switch (event) {
      case 'ROUTE_TOKENS':
        await this.handleRouteTokens(data);
        break;
      case 'BUNDLE_ACTIONS':
        await this.handleBundleActions(data);
        break;
      case 'GET_QUOTE':
        await this.handleGetQuote(data);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
  }

  private async handleRouteTokens(data: {
    tokenIn: string[];
    tokenOut: string[];
    amountIn: string[];
    slippage?: string;
    chainId?: number;
    routingStrategy?: 'ensowallet' | 'router' | 'delegate';
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/shortcuts/route`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chainId: data.chainId || this.config.defaultChainId,
          fromAddress: this.config.safeAddress,
          tokenIn: data.tokenIn,
          tokenOut: data.tokenOut,
          amountIn: data.amountIn,
          slippage: data.slippage || this.config.defaultSlippage,
          routingStrategy: data.routingStrategy || 'router'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get route');
      }

      const route = await response.json();

      // Emit route found event
      this.eventBus.emit('ROUTE_FOUND', {
        route,
        timestamp: Date.now()
      });

      return route;
    } catch (error) {
      console.error('Failed to route tokens:', error);
      throw error;
    }
  }

  private async handleBundleActions(data: {
    actions: EnsoAction[];
    chainId?: number;
    routingStrategy?: 'delegate';
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/shortcuts/bundle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chainId: data.chainId || this.config.defaultChainId,
          fromAddress: this.config.safeAddress,
          routingStrategy: data.routingStrategy || 'delegate',
          bundle: data.actions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to bundle actions');
      }

      const bundle = await response.json();

      // Emit bundle created event
      this.eventBus.emit('BUNDLE_CREATED', {
        bundle,
        timestamp: Date.now()
      });

      return bundle;
    } catch (error) {
      console.error('Failed to bundle actions:', error);
      throw error;
    }
  }

  private async handleGetQuote(data: {
    tokenIn: string[];
    tokenOut: string[];
    amountIn: string[];
    chainId?: number;
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/shortcuts/quote`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chainId: data.chainId || this.config.defaultChainId,
          fromAddress: this.config.safeAddress,
          tokenIn: data.tokenIn,
          tokenOut: data.tokenOut,
          amountIn: data.amountIn
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get quote');
      }

      const quote = await response.json();

      // Emit quote received event
      this.eventBus.emit('QUOTE_RECEIVED', {
        quote,
        timestamp: Date.now()
      });

      return quote;
    } catch (error) {
      console.error('Failed to get quote:', error);
      throw error;
    }
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    console.log('Step finished:', { text, toolCalls, toolResults });
  }
} 