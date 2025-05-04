export interface StorageInterface {
  waitForInitialization(): Promise<void>;
  
  store(key: string, data: any, metadata?: Record<string, any>): Promise<void>;
  
  retrieve(key: string): Promise<{ data: any; metadata?: Record<string, any> }>;
  
  storeCoT(
    key: string,
    thoughts: string[],
    metadata?: Record<string, any>
  ): Promise<void>;
  
  retrieveCoT(
    key: string
  ): Promise<{ thoughts: string[]; metadata?: Record<string, any> }>;
  
  search(
    query: string,
    options?: {
      limit?: number;
      filter?: Record<string, any>;
    }
  ): Promise<Array<{ key: string; score: number; data: any }>>;
  
  initializeBucket(bucketAlias: string): Promise<void>;
} 