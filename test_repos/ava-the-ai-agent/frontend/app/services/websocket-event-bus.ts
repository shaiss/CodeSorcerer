import { EventBus, ConnectionStatus, StatusCallback } from "../types/event-bus";

export class WebSocketEventBus implements EventBus {
    private ws: WebSocket | null = null;
    private subscribers: { [event: string]: Function[] } = {};
    private allMessageSubscribers: Function[] = [];
    private connectionStatusCallbacks: StatusCallback[] = [];
    private openCallbacks: Function[] = [];
    private closeCallbacks: Function[] = [];
    private errorCallbacks: ((error: Event) => void)[] = [];
    private connectionStatus: ConnectionStatus = 'disconnected';

    constructor(url?: string) {
        this.subscribers = {};
        this.allMessageSubscribers = [];
        
        // Connect to WebSocket if URL is provided
        if (url) {
            this.connect(url);
        }
    }

    connect(url: string): void {
        if (this.ws) {
            this.disconnect();
        }

        console.log(`Connecting to WebSocket: ${url}`);
        
        try {
            this.ws = new WebSocket(url);
            this.setConnectionStatus('connecting');

            this.ws.onopen = (event) => {
                console.log('WebSocket connection established');
                this.setConnectionStatus('connected');
                this.openCallbacks.forEach(callback => callback(event));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Emit to specific event subscribers
                    const eventType = data?.type as string;
                    if (eventType && this.subscribers[eventType]) {
                        this.subscribers[eventType].forEach(callback => callback(data));
                    }
                    
                    // Emit to all message subscribers
                    this.allMessageSubscribers.forEach(callback => callback(data));
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket connection closed', event);
                this.setConnectionStatus('disconnected');
                this.closeCallbacks.forEach(callback => callback(event));
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.setConnectionStatus('error');
                this.errorCallbacks.forEach(callback => callback(error));
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            this.setConnectionStatus('error');
        }
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.setConnectionStatus('disconnected');
        }
    }

    emit(event: string, data: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return;
        }

        try {
            const message = JSON.stringify({
                type: event,
                ...data
            });
            this.ws.send(message);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    subscribe(event: string, callback: Function): void {
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
    }

    unsubscribe(event: string, callback: Function): void {
        if (this.subscribers[event]) {
            this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
        }
    }

    // Alias methods for backward compatibility
    register(event: string, callback: Function): void {
        this.subscribe(event, callback);
    }

    unregister(event: string, callback: Function): void {
        this.unsubscribe(event, callback);
    }

    subscribeToAllMessages(callback: Function): void {
        this.allMessageSubscribers.push(callback);
    }

    unsubscribeFromAllMessages(callback: Function): void {
        this.allMessageSubscribers = this.allMessageSubscribers.filter(cb => cb !== callback);
    }

    // Connection status methods
    onConnectionStatusChange(callback: StatusCallback): void {
        this.connectionStatusCallbacks.push(callback);
        // Immediately call with current status
        callback(this.connectionStatus);
    }

    private setConnectionStatus(status: ConnectionStatus): void {
        this.connectionStatus = status;
        this.connectionStatusCallbacks.forEach(callback => callback(status));
    }

    // Connection event methods
    onOpen(callback: Function): void {
        this.openCallbacks.push(callback);
    }

    onClose(callback: Function): void {
        this.closeCallbacks.push(callback);
    }

    onError(callback: (error: Event) => void): void {
        this.errorCallbacks.push(callback);
    }

    getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    // Required by interface
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    // Optional methods from interface
    getWebSocket(): WebSocket | null {
        return this.ws;
    }

    sendRaw(data: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return;
        }
        this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }

    onMessage(handler: (ev: MessageEvent) => void): void {
        if (this.ws) {
            this.ws.addEventListener('message', handler);
        }
    }
}
