import { Agent } from '../agent';
import { EventBus } from '../../comms';
import { AIProvider } from '../../services/ai/types';
import { StorageInterface } from './storage';
import { ATCPIPProvider } from '../plugins/atcp-ip';

export interface IPMetadata {
  license_id?: string;
  issuer_id: string;
  holder_id: string;
  issue_date: number;
  expiry_date?: number;
  version: string;
  link_to_terms?: string;
  previous_license_id?: string;
  signature?: string;
}

export interface IPLicenseTerms {
  name: string;
  description: string;
  scope: 'personal' | 'commercial' | 'sublicensable';
  duration?: number;
  jurisdiction?: string;
  governing_law?: string;
  royalty_rate?: number;
  transferability: boolean;
  revocation_conditions?: string[];
  dispute_resolution?: string;
  onchain_enforcement: boolean;
  offchain_enforcement?: string;
  compliance_requirements?: string[];
  ip_restrictions?: string[];
  chain_of_ownership?: string[];
  rev_share?: number;
}

export abstract class IPAgent extends Agent {
  protected storage: StorageInterface;
  protected atcpipProvider: ATCPIPProvider;
  private bucketAlias: string;

  constructor(
    name: string, 
    eventBus: EventBus, 
    storage: StorageInterface,
    atcpipProvider: ATCPIPProvider,
    aiProvider?: AIProvider
  ) {
    super(name, eventBus, aiProvider);
    this.storage = storage;
    this.atcpipProvider = atcpipProvider;
    this.bucketAlias = `${name}-bucket`;
    this.initializeRecallBucket();
  }

  private async initializeRecallBucket(): Promise<void> {
    try {
      await this.storage.initializeBucket(this.bucketAlias);
    } catch (error) {
      console.log(`Error initializing storage bucket for ${this.name}:`);
      // console.log(error);
    }
  }

  protected async mintLicense(
    terms: IPLicenseTerms,
    metadata: IPMetadata
  ): Promise<string> {
    const licenseId = await this.atcpipProvider.mintLicense(terms, metadata);
    
    // Store license in storage
    await this.storeIntelligence(`license:${licenseId}`, {
      terms,
      metadata: {
        ...metadata,
        license_id: licenseId,
      },
    });

    return licenseId;
  }

  protected async verifyLicense(licenseId: string): Promise<boolean> {
    return this.atcpipProvider.verifyLicense(licenseId);
  }

  // Storage Methods
  protected async storeIntelligence(
    key: string,
    data: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.storage.store(key, data, {
        ...metadata,
        agent: this.name,
        timestamp: Date.now(),
        type: 'intelligence',
        overwrite: true
      });
      console.log(`[${this.name}] Stored intelligence for ${key}`);
    } catch (error: any) {
      // Log the error but continue execution - don't let storage failures block operation
      console.log(`[${this.name}] Failed to store intelligence for ${key}, continuing without storage: ${error.message}`);
      // Notify through eventBus if available
      // if (this.eventBus) {
      //   this.eventBus.emit("agent-error", {
      //     agent: this.name,
      //     error: `Storage failure (non-critical): ${error.message}`
      //   });
      // }
      // Return without error - the application should continue functioning
      return;
    }
  }

  protected async retrieveIntelligence(
    key: string
  ): Promise<{ data: any; metadata?: Record<string, any> } | null> {
    try {
      return await this.storage.retrieve(key);
    } catch (error: any) {
      console.warn(`[${this.name}] Failed to retrieve intelligence for ${key}: ${error.message}`);
      if (this.eventBus) {
        this.eventBus.emit("agent-error", {
          agent: this.name,
          error: `Storage retrieval failure (non-critical): ${error.message}`
        });
      }
      // Return null instead of throwing an error
      return null;
    }
  }

  protected async storeChainOfThought(
    key: string,
    thoughts: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.storage.storeCoT(key, thoughts, {
        ...metadata,
        agent: this.name,
        timestamp: Date.now(),
        type: 'chain-of-thought',
      });
    } catch (error: any) {
      console.warn(`[${this.name}] Failed to store chain of thought for ${key}: ${error.message}`);
      if (this.eventBus) {
        this.eventBus.emit("agent-error", {
          agent: this.name,
          error: `CoT storage failure (non-critical): ${error.message}`
        });
      }
      // Return without error
      return;
    }
  }

  protected async retrieveChainOfThought(
    key: string
  ): Promise<{ thoughts: string[]; metadata?: Record<string, any> } | null> {
    try {
      return await this.storage.retrieveCoT(key);
    } catch (error: any) {
      console.warn(`[${this.name}] Failed to retrieve chain of thought for ${key}: ${error.message}`);
      if (this.eventBus) {
        this.eventBus.emit("agent-error", {
          agent: this.name,
          error: `CoT retrieval failure (non-critical): ${error.message}`
        });
      }
      // Return null instead of throwing an error
      return null;
    }
  }

  protected async searchIntelligence(
    query: string,
    options?: {
      limit?: number;
      filter?: Record<string, any>;
    }
  ): Promise<Array<{ key: string; score: number; data: any }>> {
    try {
      return await this.storage.search(query, {
        ...options,
        filter: {
          ...options?.filter,
          agent: this.name,
        },
      });
    } catch (error: any) {
      console.warn(`[${this.name}] Failed to search intelligence with query '${query}': ${error.message}`);
      if (this.eventBus) {
        this.eventBus.emit("agent-error", {
          agent: this.name,
          error: `Search failure (non-critical): ${error.message}`
        });
      }
      // Return empty array instead of throwing an error
      return [];
    }
  }

  protected async retrieveRecentThoughts(
    limit: number = 10
  ): Promise<Array<{ thoughts: string[]; metadata?: Record<string, any> }>> {
    try {
      const results = await this.storage.search('type:chain-of-thought', {
        limit,
        filter: {
          agent: this.name,
        },
      });
      
      // Convert search results to thought objects
      return await Promise.all(
        results.map(async (result) => {
          try {
            return await this.retrieveChainOfThought(result.key);
          } catch (error: any) {
            console.warn(`[${this.name}] Failed to retrieve thought for ${result.key}: ${error.message}`);
            return null;
          }
        })
      ).then(results => results.filter(r => r !== null) as Array<{ thoughts: string[]; metadata?: Record<string, any> }>);
    } catch (error: any) {
      console.warn(`[${this.name}] Failed to retrieve recent thoughts: ${error.message}`);
      if (this.eventBus) {
        this.eventBus.emit("agent-error", {
          agent: this.name,
          error: `Recent thoughts retrieval failure (non-critical): ${error.message}`
        });
      }
      // Return empty array instead of throwing an error
      return [];
    }
  }
} 