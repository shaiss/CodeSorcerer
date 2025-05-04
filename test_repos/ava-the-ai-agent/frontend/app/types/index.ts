export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  message?: string;
  agent?: any;
}

export interface AgentState {
  isAutonomous: boolean;
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  activeAgent: string | null;
  systemEvents: SystemEvent[];
  selectedExample: string;
  isConnected: boolean;
}

export interface ExampleResponse {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentName: string;
  collaborationType: CollaborationType;
  timestamp: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agentName?: string | undefined;
  collaborationType?: CollaborationType | undefined;
  toolResults?: Array<{
    tool: string;
    result: any;
    error?: string | undefined;
    status?: string | undefined;
  }>;
  data?: {
    result: any;
    error?: string | undefined;
    status?: string | undefined;
  };
}

export interface SystemEvent {
  event: string;
  agent?: string | undefined;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export type CollaborationType = 
  | 'task'
  | 'observation'
  | 'execution'
  | 'analysis'
  | 'response'
  | 'suggestion'
  | 'decision'
  | 'simulation'
  | 'transaction'
  | 'tool-result'
  | 'handoff'
  | 'task-creation'
  | 'status'
  | 'error'
  | 'completion';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  agentName?: string;
  agentId?: string;
  collaborationType?: CollaborationType;
  type?: string;
  action?: string;
  event?: string;
  eventType?: 'info' | 'warning' | 'error' | 'success';
  toolResults?: Array<{
    tool: string;
    result: any;
    error?: string | undefined;
    status?: string | undefined;
  }>;
  data?: {
    result: any;
    error?: string | undefined;
    status?: string | undefined;
  };
}

export interface EventBus {
  isConnected(): boolean;
  onMessage(handler: (ev: MessageEvent) => void): void;
  subscribe(event: string, callback: (data: any) => void): void;
  unsubscribe(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;
  disconnect(): void;
  getWebSocket(): WebSocket | null;
}

export class WebSocketEventBus implements EventBus {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Array<(data: any) => void>> = new Map();

  connect(url: string): void {
    this.ws = new WebSocket(url);
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

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  emit(event: string, data: any): void {
    // Implementation needed
  }

  getWebSocket(): WebSocket | null {
    return this.ws;
  }
} 