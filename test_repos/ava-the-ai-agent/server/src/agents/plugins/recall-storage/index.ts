import { privateKeyToAccount } from 'viem/accounts';
import { EventBus } from '../../../comms';
import env from '../../../env';
import type { Address, Hex } from 'viem';
import { StorageInterface } from '../../types/storage';

export interface RecallStorageConfig {
  network: 'testnet' | 'mainnet';
  syncInterval: number;
  batchSize: number;
  eventBus: any;
  bucketAlias: string;
  maxRetries?: number;
  retryDelay?: number;
}

interface BucketObject {
  key: string;
  data: Uint8Array;
  metadata?: Record<string, unknown>;
}

interface BucketMetadata {
  alias: string;
  [key: string]: unknown;
}

interface RecallBucket {
  addr: Address;
  metadata: BucketMetadata;
}

interface RecallResult<T> {
  result: T;
}

export class RecallStorage implements StorageInterface {
  private client: any;
  private bucketManager: any;
  private initialized: boolean = false;
  private initPromise: Promise<void>;
  private syncIntervalId?: ReturnType<typeof setInterval>;
  private intervalMs: number;
  private batchSizeKB: number;
  private eventBus?: EventBus;
  private bucketAlias: string;
  private lastNonce: number = 0;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private bucketCache: Map<string, Address> = new Map();
  private activeBucket?: Address;

  constructor(config: RecallStorageConfig) {
    const privateKey = env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY is required in environment variables');
    }

    this.intervalMs = config.syncInterval || 2 * 60 * 1000; // Default 2 minutes
    this.batchSizeKB = config.batchSize || 4; // Default 4KB
    this.eventBus = config.eventBus;
    this.bucketAlias = config.bucketAlias || 'default-bucket';
    

    this.initPromise = this.initializeClient(privateKey).then(async () => {
      // Initialize nonce
      try {
        const wallet = await this.client.walletClient;
        const address = await wallet.account.address;
        const nonce = await wallet.transport.request({
          method: 'eth_getTransactionCount',
          params: [address, 'latest']
        });
        this.lastNonce = parseInt(nonce, 16);
      } catch (error) {
        console.error('Failed to initialize nonce:', error);
      }
      this.startPeriodicSync();
    });
  }

  private async initializeClient(privateKey: string): Promise<void> {
    try {
      // Dynamic imports to handle ESM modules
      const { testnet } = await import('@recallnet/chains');
      const { RecallClient, walletClientFromPrivateKey } = await import('@recallnet/sdk/client');
      
      // Cast the testnet chain to any to avoid type incompatibility issues
      const wallet = walletClientFromPrivateKey(privateKey as Hex, testnet as any);
      
      this.client = new RecallClient({ walletClient: wallet });
      this.bucketManager = await this.client.bucketManager();
      this.initialized = true;

      // Initialize nonce with retry logic
      await this.initializeNonce();
    } catch (error) {
      console.error('Failed to initialize Recall client:', error);
      throw error;
    }
  }

  private async initializeNonce(): Promise<void> {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        // Access the wallet directly from the client
        const address = this.client.walletClient.account.address;


      
        // Get both pending and latest nonce using the provider
        const [pendingNonce, latestNonce] = await Promise.all([
          this.client.walletClient.request({
            method: 'eth_getTransactionCount',
            params: [address, 'pending']
          }),
          this.client.walletClient.request({
            method: 'eth_getTransactionCount',
            params: [address, 'latest']
          })
        ]);

        // Use the higher nonce value
        const pendingNonceNum = parseInt(pendingNonce, 16);
        const latestNonceNum = parseInt(latestNonce, 16);
        this.lastNonce = Math.max(pendingNonceNum, latestNonceNum);
        console.log(`Initialized nonce to ${this.lastNonce}`);
        return;
      } catch (error) {
        attempts++;
        if (attempts === this.maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async waitForInitialization(): Promise<void> {
    await this.initPromise;
  }

  private serializeData(data: any): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(data));
  }

  async store(key: string, data: any, metadata: Record<string, any> = {}): Promise<void> {
    try {
      await this.waitForInitialization();
      
      // Get the bucket
      const bucketAddress = await this.getOrCreateBucket(this.bucketAlias);
      
      // Prepare the data
      const serializedData = this.serializeData({
        data,
        metadata: {
          ...metadata,
          timestamp: Date.now()
        }
      });

      // Get next nonce
      const nonce = await this.getNextNonce();

      // Add to bucket with proper parameters
      await this.bucketManager.add(
        bucketAddress,
        key,
        serializedData,
        {
          nonce,
          waitForTransaction: true,
          overwrite: metadata.overwrite || false
        }
      );
    } catch (err: any) {
      console.error('[RecallStorage] Error storing data:', err);
      throw new Error(`Failed to store data: ${err.message}`);
    }
  }

  async retrieve(
    key: string
  ): Promise<{ data: any; metadata?: Record<string, any> }> {
    await this.waitForInitialization();

    const bucketManager = await this.client.bucketManager();
    const bucket = await this.getOrCreateBucket(this.bucketAlias);
    
    const result = await bucketManager.get(bucket, key) as RecallResult<Uint8Array>;
    
    if (!result.result) {
      throw new Error(`No data found for key: ${key}`);
    }

    const decoded = new TextDecoder().decode(result.result);
    const parsed = JSON.parse(decoded);
    return {
      data: parsed.data,
      metadata: parsed.metadata,
    };
  }

  async storeCoT(
    key: string,
    thoughts: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.store(`cot:${key}`, {
      thoughts,
      metadata: metadata || {},
      timestamp: Date.now(),
    });
  }

  async retrieveCoT(
    key: string
  ): Promise<{ thoughts: string[]; metadata?: Record<string, any> }> {
    const result = await this.retrieve(`cot:${key}`);
    return {
      thoughts: result.data.thoughts,
      metadata: result.data.metadata,
    };
  }

  async search(
    query: string,
    options?: {
      limit?: number;
      filter?: Record<string, any>;
    }
  ): Promise<Array<{ key: string; score: number; data: any }>> {
    const bucketAddress = await this.getOrCreateBucket(this.bucketAlias);
    const result = await this.client.bucketManager().query(bucketAddress, {
      prefix: query,
      limit: options?.limit,
    }) as RecallResult<{ objects: { key: string; data: Uint8Array }[] }>;

    if (!result.result?.objects) {
      return [];
    }

    return result.result.objects
      .filter(obj => {
        if (!options?.filter) return true;
        try {
          const decoded = new TextDecoder().decode(obj.data);
          const parsed = JSON.parse(decoded);
          return Object.entries(options.filter).every(
            ([key, value]) => parsed.metadata?.[key] === value
          );
        } catch {
          return false;
        }
      })
      .map(obj => {
        const decoded = new TextDecoder().decode(obj.data);
        const parsed = JSON.parse(decoded);
        return {
          key: obj.key,
          score: 1, // Recall doesn't provide relevance scores
          data: parsed.data,
        };
      });
  }

  private async getNextNonce(): Promise<number> {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        const address = this.client.walletClient.account.address;
        
        // Get current nonce from network
        const currentNonce = await this.client.walletClient.request({
          method: 'eth_getTransactionCount',
          params: [address, 'pending']
        });
        
        const networkNonce = parseInt(currentNonce, 16);
        this.lastNonce = Math.max(this.lastNonce, networkNonce);
        this.lastNonce++;
        
        return this.lastNonce;
      } catch (error) {
        attempts++;
        if (attempts === this.maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    throw new Error('Failed to get next nonce after retries');
  }

  private async getOrCreateBucket(bucketAlias: string): Promise<Address> {
    await this.waitForInitialization();

    // First check if we have an active bucket
    if (this.activeBucket) {
      return this.activeBucket;
    }

    // Then check the cache
    const cachedBucket = this.bucketCache.get(bucketAlias);
    if (cachedBucket) {
      this.activeBucket = cachedBucket;
      return cachedBucket;
    }

    try {
      const bucketManager = await this.client.bucketManager();
      const buckets = await bucketManager.list() as RecallResult<{ buckets: RecallBucket[] }>;
      
      if (buckets?.result?.buckets) {
        const bucket = buckets.result.buckets.find((b: RecallBucket) => 
          b.metadata?.alias === bucketAlias
        );
        if (bucket) {
          this.bucketCache.set(bucketAlias, bucket.addr);
          this.activeBucket = bucket.addr;
          return bucket.addr;
        }
      }

      // Create new bucket only if none exists
      let attempts = 0;
      while (attempts < this.maxRetries) {
        try {
          const nonce = await this.getNextNonce();
          console.log(`Creating new bucket for ${bucketAlias} with nonce: ${nonce}`);
          
          const result = await bucketManager.create({
            metadata: { alias: bucketAlias },
            nonce,
            waitForTransaction: true
          }) as RecallResult<{ bucket: Address }>;

          console.log(`[RecallStorage] Created new bucket for ${bucketAlias} with address: ${result.result.bucket}`);

          if (!result.result) {
            throw new Error(`Failed to create bucket: ${bucketAlias}`);
          }

          // Cache the new bucket
          this.bucketCache.set(bucketAlias, result.result.bucket);
          this.activeBucket = result.result.bucket;
          return result.result.bucket;
        } catch (error) {
          attempts++;
          if (attempts === this.maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          await this.initializeNonce();
        }
      }
      throw new Error(`Failed to create bucket after ${this.maxRetries} attempts`);
    } catch (error) {
      const err = error as Error;
      console.log(`Error in getOrCreateBucket: ${err.message}`);
      throw error;
    }
  }

  private startPeriodicSync(): void {
    if (this.syncIntervalId) {
      return;
    }

    this.syncIntervalId = setInterval(async () => {
      try {
        await this.syncLogsToRecall();
      } catch (error) {
        console.error('Error in periodic log sync:', error);
      }
    }, this.intervalMs);

    // Initial sync
    this.syncLogsToRecall().catch(error => {
      console.error('Error in initial log sync:', error);
    });
  }

  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }

  private async syncLogsToRecall(): Promise<void> {
    await this.waitForInitialization();

    try {
      const bucketAddress = await this.getOrCreateBucket(this.bucketAlias);
      const result = await this.client.bucketManager().query(bucketAddress, {
        prefix: 'log:',
      }) as RecallResult<{ objects: { key: string; data: Uint8Array }[] }>;

      if (!result.result?.objects) {
        return;
      }

      let batch: string[] = [];
      let batchSize = 0;

      for (const obj of result.result.objects) {
        try {
          const decoded = new TextDecoder().decode(obj.data);
          const parsed = JSON.parse(decoded);
          
          if (parsed.metadata?.synced) continue;

          const logEntry = JSON.stringify({
            key: obj.key,
            data: parsed.data,
            metadata: parsed.metadata,
            timestamp: parsed.timestamp,
          });

          const logSize = new TextEncoder().encode(logEntry).length;
          if (batchSize + logSize > this.batchSizeKB * 1024) {
            await this.storeBatchToRecall(batch);
            batch = [];
            batchSize = 0;
          }

          batch.push(logEntry);
          batchSize += logSize;
        } catch (error) {
          console.error('Error processing log entry:', error);
          continue;
        }
      }

      if (batch.length > 0) {
        await this.storeBatchToRecall(batch);
      }
    } catch (error) {
      console.log('Error syncing logs to Recall:', error);
      throw error;
    }
  }

  private async storeBatchToRecall(batch: string[]): Promise<void> {
    await this.waitForInitialization();

    try {
      const bucketAddress = await this.getOrCreateBucket(this.bucketAlias);
      const timestamp = Date.now();
      const batchKey = `batch:${timestamp}`;
      const batchData = batch.join('\n');
      const nonce = await this.getNextNonce();

      await this.client.bucketManager().add(
        bucketAddress,
        batchKey,
        new TextEncoder().encode(batchData),
        { nonce }
      );

      // Mark logs as synced
      for (const logEntry of batch) {
        const parsed = JSON.parse(logEntry);
        const syncNonce = await this.getNextNonce();
        await this.client.bucketManager().add(
          bucketAddress,
          parsed.key,
          new TextEncoder().encode(JSON.stringify({
            ...parsed,
            metadata: {
              ...parsed.metadata,
              synced: true,
              syncedAt: timestamp,
            },
          })),
          { nonce: syncNonce }
        );
      }
    } catch (error) {
      console.error('Error storing batch to Recall:', error);
      throw error;
    }
  }

  public async initializeBucket(bucketAlias: string): Promise<void> {
    await this.waitForInitialization();
    await this.getOrCreateBucket(bucketAlias);
  }
} 