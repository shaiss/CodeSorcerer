import { privateKeyToAccount } from 'viem/accounts';
import { EventBus } from '../../../comms';
import env from '../../../env';
import type { Address, Hex } from 'viem';
import { RecallStorage, RecallStorageConfig } from '../recall-storage';
// @ts-ignore
import { EthStorage, FlatDirectory, UploadCallback, DownloadCallback, UploadRequest } from 'ethstorage-sdk';
import { StorageInterface } from '../../types/storage';

export interface HybridStorageConfig extends RecallStorageConfig {
  ethStorageRpc?: string;
  flatDirectoryAddress?: string;
}

export class HybridStorage implements StorageInterface {
  private recallStorage: RecallStorage;
  private ethStorage: EthStorage | null = null;
  private flatDirectory: FlatDirectory | null = null;
  private useEthStorageFallback: boolean = false;
  private ethStorageInitPromise: Promise<void>;
  private flatDirectoryDeployed: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  constructor(config: HybridStorageConfig) {
    // Initialize Recall Storage
    this.recallStorage = new RecallStorage(config);

    // Initialize EthStorage if config is provided
    this.ethStorageInitPromise = this.initializeStorage(config);
  }

  private async initializeStorage(config: HybridStorageConfig): Promise<void> {
    try {
      // Wait for Recall to initialize
      await this.recallStorage.waitForInitialization();
      
      // Try to initialize EthStorage if RPC is provided
      if (config.ethStorageRpc) {
        try {
          const privateKey = env.WALLET_PRIVATE_KEY;
          if (!privateKey) {
            throw new Error('WALLET_PRIVATE_KEY is required for EthStorage');
          }

          // Default to QuarkChain SWC testnet if not specified
          const rpc = config.network === 'mainnet' 
            ? "https://rpc.sepolia.org" 
            : "https://rpc.beta.testnet.l2.quarkchain.io:8545";
          
          // Initialize EthStorage
          this.ethStorage = await EthStorage.create({
            rpc: rpc,
            ethStorageRpc: config.ethStorageRpc,
            privateKey: privateKey as Hex,
          });

          // Initialize FlatDirectory if address is provided or create a new one
          if (config.flatDirectoryAddress) {
            this.flatDirectory = await FlatDirectory.create({
              rpc: rpc,
              privateKey: privateKey as Hex,
              address: config.flatDirectoryAddress as Address,
            });
            this.flatDirectoryDeployed = true; // If we're using an existing address, we assume it's already deployed
            console.log(`[HybridStorage] Using existing FlatDirectory at ${config.flatDirectoryAddress}`);
          } else {
            this.flatDirectory = await FlatDirectory.create({
              rpc: rpc,
              privateKey: privateKey as Hex,
            });
            
            // Deploy a new FlatDirectory contract with retry logic
            await this.deployFlatDirectory();
          }

          console.log('[HybridStorage] EthStorage initialized successfully as fallback');
        } catch (error) {
          console.error('[HybridStorage] Failed to initialize EthStorage:', error);
          this.ethStorage = null;
          this.flatDirectory = null;
          this.flatDirectoryDeployed = false;
        }
      }
    } catch (error) {
      console.error('[HybridStorage] Initialization error:', error);
      // If Recall fails to initialize, try to use EthStorage as primary
      this.useEthStorageFallback = true;
    }
  }

  private async deployFlatDirectory(): Promise<void> {
    if (!this.flatDirectory) {
      throw new Error('FlatDirectory not initialized');
    }

    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        console.log(`[HybridStorage] Deploying FlatDirectory (attempt ${attempts + 1}/${this.maxRetries})...`);
        await this.flatDirectory.deploy();
        this.flatDirectoryDeployed = true;
        console.log('[HybridStorage] FlatDirectory deployed successfully');
        return;
      } catch (error) {
        attempts++;
        console.error(`[HybridStorage] FlatDirectory deployment failed (attempt ${attempts}/${this.maxRetries}):`, error);
        if (attempts >= this.maxRetries) {
          console.error('[HybridStorage] All deployment attempts failed');
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async waitForInitialization(): Promise<void> {
    // Wait for both the parent class initialization and our own initialization
    await Promise.all([
      this.recallStorage.waitForInitialization(),
      this.ethStorageInitPromise.catch(err => {
        console.error('[HybridStorage] Error during initialization:', err);
        // Don't rethrow, we'll fallback to Recall
      })
    ]);
  }

  async store(key: string, data: any, metadata: Record<string, any> = {}): Promise<void> {
    await this.waitForInitialization();

    try {
      // Try Recall first if not in fallback mode
      if (!this.useEthStorageFallback) {
        await this.recallStorage.store(key, data, metadata);
        return;
      }
    } catch (error) {
      console.log('[HybridStorage] Recall storage failed, trying EthStorage fallback');
      this.useEthStorageFallback = true;
    }

    // Fallback to EthStorage
    if (this.ethStorage && this.flatDirectory) {
      try {
        // Check if FlatDirectory is deployed
        if (!this.flatDirectoryDeployed) {
          console.log('[HybridStorage] FlatDirectory not deployed, attempting deployment...');
          await this.deployFlatDirectory();
        }

        // Serialize data with metadata
        const serializedData = JSON.stringify({
          data,
          metadata: {
            ...metadata,
            timestamp: Date.now()
          }
        });

        // Create upload callback
        const callback: UploadCallback = {
          onProgress: (progress: number, count: number, isChange: boolean) => {
            if (isChange) {
              console.log(`[HybridStorage] Upload progress: ${progress}%, chunks: ${count}`);
            }
          },
          onFail: (err: Error) => {
            console.error('[HybridStorage] Upload failed:', err);
          },
          onFinish: (totalUploadChunks: number, totalUploadSize: number, totalStorageCost: number) => {
            console.log(`[HybridStorage] Upload complete: ${totalUploadChunks} chunks, ${totalUploadSize} bytes, cost: ${totalStorageCost}`);
          }
        };

        // Create upload request
        const uploadRequest: UploadRequest = {
          key: key,
          content: Buffer.from(serializedData),
          type: 2, // Use blob storage
          callback: callback
        };

        // Store in FlatDirectory
        await this.flatDirectory.upload(uploadRequest);
      } catch (err) {
        console.error('[HybridStorage] EthStorage fallback failed:', err);
        // Fall back to Recall as a last resort
        try {
          console.log('[HybridStorage] Attempting to use Recall as last resort');
          await this.recallStorage.store(key, data, metadata);
        } catch (recallErr) {
          console.error('[HybridStorage] All storage methods failed:', recallErr);
          throw new Error(`Failed to store data: ${err}`);
        }
      }
    } else {
      // If EthStorage is not available, use Recall as fallback
      try {
        console.log('[HybridStorage] EthStorage not available, using Recall');
        await this.recallStorage.store(key, data, metadata);
      } catch (err) {
        console.error('[HybridStorage] Recall fallback failed:', err);
        throw new Error('No storage provider available');
      }
    }
  }

  async retrieve(key: string): Promise<{ data: any; metadata?: Record<string, any> }> {
    await this.waitForInitialization();

    try {
      // Try Recall first if not in fallback mode
      if (!this.useEthStorageFallback) {
        return await this.recallStorage.retrieve(key);
      }
    } catch (error) {
      console.log('[HybridStorage] Recall retrieval failed, trying EthStorage fallback');
      this.useEthStorageFallback = true;
    }

    // Fallback to EthStorage
    if (this.flatDirectory) {
      try {
        // Check if FlatDirectory is deployed
        if (!this.flatDirectoryDeployed) {
          console.log('[HybridStorage] FlatDirectory not deployed for retrieve, attempting deployment...');
          await this.deployFlatDirectory();
        }

        // Download from FlatDirectory
        let downloadedData = '';
        
        // Create download callback
        const callback: DownloadCallback = {
          onProgress: (progress: number, count: number, chunk: Uint8Array) => {
            if (chunk) {
              downloadedData += new TextDecoder().decode(chunk);
            }
          },
          onFail: (error: Error) => {
            console.error('[HybridStorage] Download failed:', error);
            throw error;
          },
          onFinish: () => {
            console.log('[HybridStorage] Download complete');
          }
        };

        await this.flatDirectory.download(key, callback);

        // Parse the downloaded data
        const parsed = JSON.parse(downloadedData);
        return {
          data: parsed.data,
          metadata: parsed.metadata,
        };
      } catch (err) {
        console.error('[HybridStorage] EthStorage retrieval failed:', err);
        
        // Fall back to Recall as a last resort
        try {
          console.log('[HybridStorage] Attempting to use Recall as last resort for retrieval');
          return await this.recallStorage.retrieve(key);
        } catch (recallErr) {
          console.error('[HybridStorage] All retrieval methods failed:', recallErr);
          throw new Error(`Failed to retrieve data: ${err}`);
        }
      }
    } else {
      // If EthStorage is not available, use Recall as fallback
      try {
        console.log('[HybridStorage] EthStorage not available for retrieval, using Recall');
        return await this.recallStorage.retrieve(key);
      } catch (err) {
        console.error('[HybridStorage] Recall fallback retrieval failed:', err);
        throw new Error('No storage provider available for retrieval');
      }
    }
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
    await this.waitForInitialization();

    try {
      // Try Recall first if not in fallback mode
      if (!this.useEthStorageFallback) {
        return await this.recallStorage.search(query, options);
      }
    } catch (error) {
      console.log('[HybridStorage] Recall search failed, trying EthStorage fallback');
      this.useEthStorageFallback = true;
    }

    // EthStorage doesn't have a direct search capability like Recall
    // We'll implement a basic prefix search using FlatDirectory
    if (this.flatDirectory) {
      try {
        // This is a simplified implementation - in a real-world scenario,
        // you might want to implement a more sophisticated search mechanism
        // or maintain an index of keys in a separate contract
        
        // For now, we'll just return an empty array
        return [];
      } catch (err) {
        console.error('[HybridStorage] EthStorage search failed:', err);
        return [];
      }
    }

    return [];
  }

  public async initializeBucket(bucketAlias: string): Promise<void> {
    await this.waitForInitialization();
    
    try {
      if (!this.useEthStorageFallback) {
        await this.recallStorage.initializeBucket(bucketAlias);
      }
    } catch (error) {
      console.log('[HybridStorage] Recall bucket initialization failed, using EthStorage');
      this.useEthStorageFallback = true;
    }
  }

  // Method to force using EthStorage (useful for testing)
  public forceEthStorageFallback(): void {
    this.useEthStorageFallback = true;
  }

  // Method to reset to Recall if it becomes available again
  public resetToRecall(): void {
    this.useEthStorageFallback = false;
  }
} 