export interface EventBus {
  register(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;
  subscribe(event: string, callback: Function): void;
  unsubscribe(event: string, callback: Function): void;
  connect(url: string): void;
  disconnect(): void;
}
