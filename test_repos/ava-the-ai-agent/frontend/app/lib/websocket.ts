import { EventBus } from '../types';

export class WebSocketEventBus implements EventBus {
  public ws: WebSocket | null = null;
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();

  connect(url: string): void {
    this.ws = new WebSocket(url);
    
    // Set up error handling
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Set up close handling
    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  onMessage(handler: (ev: MessageEvent) => void): void {
    if (this.ws) {
      this.ws.onmessage = handler;
    }
  }

  subscribe(event: string, callback: (data: any) => void): void {
    const callbacks = this.subscribers.get(event) || [];
    callbacks.push(callback);
    this.subscribers.set(event, callbacks);
  }

  unsubscribe(event: string, callback: (data: any) => void): void {
    const callbacks = this.subscribers.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
      this.subscribers.set(event, callbacks);
    }
  }

  emit(event: string, data: any): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getWebSocket(): WebSocket | null {
    return this.ws;
  }
} 