export * from "./event-bus";
export * from "./a2a-bus";

export interface EventBus {
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => Promise<void>) => void;
  register: (event: string, callback: (data: any) => void) => void;
  unregister: (event: string, callback: (data: any) => void) => void;
}
