import EventEmitter from "events";
import type { EventBus as IEventBus } from "./index";

/**
 * EventBus is a simple event bus implementation using the EventEmitter from Node.js.
 * It allows you to register callbacks for specific events and emit events with data.
 * In this context, it's used to communicate between agents.
 *  */

export class EventBus implements IEventBus {

  protected eventEmitter: EventEmitter;

  private subscribers: Map<string, Array<(data: any) => Promise<void>>>;


  constructor() {
    this.eventEmitter = new EventEmitter();
    this.subscribers = new Map();
  }

  register(event: string, callback: (data: any) => void) {

    if (!this.eventEmitter.eventNames().includes(event)) {
      this.eventEmitter.on(event, callback);
    }
  }

    /**
   * Unregister a callback for an event.
   * @param event - The event name.
   * @param callback - The callback function.
   */
    unregister(event: string, callback: (data: any) => void) {
      if (this.eventEmitter.eventNames().includes(event)) {
        this.eventEmitter.off(event, callback);
      }
    }


    

  // async emit(event: string, data: any): Promise<void> {
  //   const handlers = this.subscribers.get(event);
  //   if (handlers) {
  //     await Promise.all(handlers.map(handler => handler(data)));
  //   }
  // }

 
  emit(event: string, data: any) {
    this.eventEmitter.emit(event, data);
  }

  on(event: string, handler: (data: any) => Promise<void>): void {
    // Store in subscribers map for reference
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)?.push(handler);
    
    // Actually register with the EventEmitter
    this.eventEmitter.on(event, async (data) => {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  unsubscribe(event: string, handler: (data: any) => Promise<void>): void {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        // Note: We can't easily remove the specific handler from eventEmitter
        // since we wrapped it in an anonymous function
      }
    }
  }
}
