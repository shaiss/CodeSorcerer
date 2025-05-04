export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type StatusCallback = (status: ConnectionStatus) => void;

export interface EventBus {
    connect(url: string): void;
    disconnect(): void;
    emit(event: string, data: any): void;
    subscribe(event: string, callback: Function): void;
    unsubscribe(event: string, callback: Function): void;
    register(event: string, callback: Function): void;
    unregister(event: string, callback: Function): void;
    subscribeToAllMessages(callback: Function): void;
    unsubscribeFromAllMessages(callback: Function): void;
    
    // Connection status methods
    onConnectionStatusChange(callback: StatusCallback): void;
    getConnectionStatus(): ConnectionStatus;
    
    // Connection event methods
    onOpen(callback: Function): void;
    onClose(callback: Function): void;
    onError(callback: (error: Event) => void): void;
    
    // For backward compatibility
    isConnected(): boolean;
    sendRaw?(data: any): void;
    onMessage?(handler: (ev: MessageEvent) => void): void;
    getWebSocket?(): WebSocket | null;
}