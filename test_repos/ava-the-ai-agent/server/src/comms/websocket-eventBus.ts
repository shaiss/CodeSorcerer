import { EventBus } from "./websocket-eventBus.types";

export class WebSocketEventBus implements EventBus {
  public ws: WebSocket | null = null;
  private subscribers: Map<string, Function[]> = new Map();

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type && this.subscribers.has(data.type)) {
          this.subscribers
            .get(data.type)
            ?.forEach((callback) => callback(data));
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    this.ws.onopen = () => {
      console.log("WebSocket connected");
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  receiveMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type && this.subscribers.has(data.type)) {
          this.subscribers
            .get(data.type)
            ?.forEach((callback) => callback(data));
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  emit(event: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }
    this.ws.send(JSON.stringify({ type: event, ...data }));
  }

  subscribe(event: string, callback: Function): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)?.push(callback);
  }

  unsubscribe(event: string, callback: Function): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  register(event: string, callback: (data: any) => void): void {
    this.subscribe(event, callback);
  }
}
