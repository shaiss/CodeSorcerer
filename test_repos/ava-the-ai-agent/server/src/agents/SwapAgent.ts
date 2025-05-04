import { WebSocket } from 'ws';
import { ZeroXSwapService } from '../services/0x/swap-service';
import { ethers } from 'ethers';

type MessageHandler = (data: any) => void;

export class SwapAgent {
  private swapService: ZeroXSwapService;
  private subscribers: Map<string, Set<MessageHandler>>;
  private activeSwaps: Map<string, any>;
  private provider: ethers.providers.Provider | null;
  
  constructor() {
    this.swapService = new ZeroXSwapService();
    this.subscribers = new Map();
    this.activeSwaps = new Map();
    this.provider = null;
    
    // Connect to provider
    this.initializeProvider();
  }
  
  private initializeProvider() {
    try {
      // In production, this would connect to the appropriate chain
      // For now, we'll use a public provider
      if (process.env.RPC_URL) {
        this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
      } else {
        // Fallback to a public provider (not recommended for production)
        console.log('No RPC_URL provided, using public provider');
        this.provider = ethers.getDefaultProvider('mainnet');
      }
    } catch (error) {
      console.error('Failed to initialize provider:', error);
    }
  }
  
  public handleWebSocketConnection(ws: WebSocket) {
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        this.handleMessage(data, ws);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });
    
    ws.on('close', () => {
      this.cleanupSubscriptions(ws);
    });
  }
  
  private cleanupSubscriptions(ws: WebSocket) {
    // Remove this client from all subscriptions
    this.subscribers.forEach((handlers, topic) => {
      const newHandlers = new Set<MessageHandler>();
      handlers.forEach(handler => {
        if ((handler as any).ws !== ws) {
          newHandlers.add(handler);
        }
      });
      
      if (newHandlers.size === 0) {
        this.subscribers.delete(topic);
      } else {
        this.subscribers.set(topic, newHandlers);
      }
    });
  }
  
  private handleMessage(data: any, ws: WebSocket) {
    const { action, payload } = data;
    
    switch (action) {
      case 'subscribe':
        this.handleSubscribe(payload.topic, ws);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(payload.topic, ws);
        break;
      case 'execute-swap':
        this.handleExecuteSwap(payload, ws);
        break;
      case 'get-quote':
        this.handleGetQuote(payload, ws);
        break;
      case 'get-price':
        this.handleGetPrice(payload, ws);
        break;
      default:
        this.sendError(ws, `Unknown action: ${action}`);
    }
  }
  
  private handleSubscribe(topic: string, ws: WebSocket) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    
    const handler = (data: any) => {
      ws.send(JSON.stringify({
        topic,
        data
      }));
    };
    
    // Store reference to WebSocket for cleanup
    (handler as any).ws = ws;
    
    this.subscribers.get(topic)!.add(handler);
    
    // Confirm subscription
    ws.send(JSON.stringify({
      action: 'subscribed',
      topic
    }));
  }
  
  private handleUnsubscribe(topic: string, ws: WebSocket) {
    if (this.subscribers.has(topic)) {
      const handlers = this.subscribers.get(topic)!;
      const newHandlers = new Set<MessageHandler>();
      
      handlers.forEach(handler => {
        if ((handler as any).ws !== ws) {
          newHandlers.add(handler);
        }
      });
      
      if (newHandlers.size === 0) {
        this.subscribers.delete(topic);
      } else {
        this.subscribers.set(topic, newHandlers);
      }
    }
    
    // Confirm unsubscription
    ws.send(JSON.stringify({
      action: 'unsubscribed',
      topic
    }));
  }
  
  private async handleGetPrice(payload: any, ws: WebSocket) {
    try {
      const price = await this.swapService.getPrice(payload);
      ws.send(JSON.stringify({
        action: 'price-result',
        data: price
      }));
    } catch (error) {
      this.sendError(ws, `Failed to get price: ${(error as Error).message}`);
    }
  }
  
  private async handleGetQuote(payload: any, ws: WebSocket) {
    try {
      const quote = await this.swapService.getQuote(payload);
      ws.send(JSON.stringify({
        action: 'quote-result',
        data: quote
      }));
    } catch (error) {
      this.sendError(ws, `Failed to get quote: ${(error as Error).message}`);
    }
  }
  
  private async handleExecuteSwap(payload: any, ws: WebSocket) {
    try {
      const { quote, sellToken, buyToken, walletAddress } = payload;
      
      if (!quote || !sellToken || !buyToken || !walletAddress) {
        this.sendError(ws, 'Missing required parameters for swap');
        return;
      }
      
      // In a production environment, the wallet signing would be handled by the client
      // The server would only facilitate the transaction building and submission
      // For demo purposes, we're just simulating the process
      
      // Generate a unique ID for this swap
      const swapId = `swap_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Store the active swap
      this.activeSwaps.set(swapId, {
        quote,
        sellToken,
        buyToken,
        walletAddress,
        status: 'pending',
        timestamp: Date.now()
      });
      
      // Send initial status
      ws.send(JSON.stringify({
        action: 'swap-status',
        data: {
          swapId,
          status: 'pending',
          message: 'Preparing transaction...'
        }
      }));
      
      // In a real implementation, this is where you would:
      // 1. Check token allowances
      // 2. Send approval transaction if needed
      // 3. Execute the swap transaction
      
      // Simulate the process
      setTimeout(() => {
        // Update status to simulated approval
        this.activeSwaps.get(swapId)!.status = 'approving';
        ws.send(JSON.stringify({
          action: 'swap-status',
          data: {
            swapId,
            status: 'approving',
            message: 'Approving token...'
          }
        }));
        
        // Then simulate the swap after a delay
        setTimeout(() => {
          // Update status to simulated swap
          this.activeSwaps.get(swapId)!.status = 'swapping';
          ws.send(JSON.stringify({
            action: 'swap-status',
            data: {
              swapId,
              status: 'swapping',
              message: 'Executing swap...'
            }
          }));
          
          // Finally, simulate the success
          setTimeout(() => {
            // Update status to completed
            this.activeSwaps.get(swapId)!.status = 'completed';
            this.activeSwaps.get(swapId)!.txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
            
            const completedSwap = this.activeSwaps.get(swapId)!;
            
            ws.send(JSON.stringify({
              action: 'swap-status',
              data: {
                swapId,
                status: 'completed',
                txHash: completedSwap.txHash,
                message: 'Swap completed successfully!'
              }
            }));
            
            // Clean up after a while
            setTimeout(() => {
              this.activeSwaps.delete(swapId);
            }, 60000); // Keep for 1 minute
          }, 3000);
          
        }, 2000);
        
      }, 2000);
      
    } catch (error) {
      this.sendError(ws, `Failed to execute swap: ${(error as Error).message}`);
    }
  }
  
  private sendError(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({
      action: 'error',
      message
    }));
  }
  
  // Method to publish messages to subscribers
  public publish(topic: string, data: any) {
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic)!.forEach(handler => {
        handler(data);
      });
    }
  }
  
  // Get active swap details
  public getActiveSwap(swapId: string) {
    return this.activeSwaps.get(swapId);
  }
  
  // Get all active swaps
  public getAllActiveSwaps() {
    return Array.from(this.activeSwaps.entries()).map(([id, swap]) => ({
      id,
      ...swap
    }));
  }
} 