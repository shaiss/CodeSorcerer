import { ethers } from "ethers";


export interface SXTSDKInterface {
  authenticate: () => Promise<[any, any]>;
  CreateSchema: (schemaQuery: string) => Promise<[any, any]>;
  CreateTable: (tableName: string, createTableQuery: string, accessType: string, publicKey: string, biscuit: string) => Promise<[any, any]>;
  DDL: (tableName: string, ddlQuery: string, biscuit: string) => Promise<[any, any]>;
  DML: (tableName: string, dmlQuery: string, biscuit: string) => Promise<[any, any]>;
  DQL: (tableName: string, dqlQuery: string, biscuit: string) => Promise<[any, any]>;
  getNameSpaces: () => Promise<[any, any]>;
  getTables: (scope: string, namespace: string) => Promise<[any, any]>;
  getTableColumns: (namespace: string, tableName: string) => Promise<[any, any]>;
  getTableIndexes: (namespace: string, tableName: string) => Promise<[any, any]>;
  getPrimaryKeys: (namespace: string, tableName: string) => Promise<[any, any]>;
  getTableRelationships: (namespace: string, scope: string) => Promise<[any, any]>;
  getPrimaryKeyReferences: (namespace: string, tableName: string, columnName: string) => Promise<[any, any]>;
  getForeignKeyReferences: (namespace: string, tableName: string, columnName: string) => Promise<[any, any]>;
  write_to_file: (accessToken: string, refreshToken: string, accessTokenExpires: number, refreshTokenExpires: number) => void;
  read_file_contents: () => any;
}


export interface SXTDataProviderConfig {
  apiKey?: string;
  privateKey: string;
  publicKey: string;
}


export class SXTDataProvider {
  private sxtSDK: SXTSDKInterface;
  private config: SXTDataProviderConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(sxtSDK: SXTSDKInterface, config: SXTDataProviderConfig) {
    this.sxtSDK = sxtSDK;
    this.config = config;
  }

  // Initialize and authenticate with Space and Time
  public async initialize(): Promise<void> {
    try {
      const [tokenResponse, tokenError] = await this.sxtSDK.authenticate();
      
      if (tokenError) {
        throw new Error(`SXT authentication failed: ${tokenError}`);
      }
      
      this.accessToken = tokenResponse.accessToken;
      this.refreshToken = tokenResponse.refreshToken;
      this.tokenExpiry = Date.now() + 25 * 60 * 1000; // Token valid for 25 minutes
      

      if (this.accessToken && this.refreshToken) {
        this.sxtSDK.write_to_file(
          this.accessToken,
          this.refreshToken,
          this.tokenExpiry,
          this.tokenExpiry + 5 * 60 * 1000
        );
      } else {
        throw new Error("Authentication succeeded but tokens were not provided");
      }
      
      console.log("Successfully authenticated with Space and Time");
    } catch (error) {
      console.error("Failed to authenticate with Space and Time:", error);
      throw error;
    }
  }

  // Check if token is expired and refresh if needed
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.initialize();
    }
  }

  // Generate a biscuit token for table access
  public generateBiscuit(resourceName: string, operations: string[]): string {
    // This is a placeholder. In a real implementation, this would use the biscuit library
    // to generate a token with the specified capabilities
    
    return `generated-biscuit-token-for-${resourceName}-${operations.join('-')}`;
  }

  // Create a new schema
  public async createSchema(schemaName: string): Promise<void> {
    await this.ensureValidToken();
    
    const [response, error] = await this.sxtSDK.CreateSchema(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    if (error) {
      throw new Error(`Failed to create schema ${schemaName}: ${error}`);
    }
    
    console.log(`Schema ${schemaName} created or already exists`);
  }

  // Create a new table
  public async createTable(
    tableName: string, 
    createTableQuery: string, 
    accessType: string = "permissioned"
  ): Promise<void> {
    await this.ensureValidToken();
    
    const biscuit = this.generateBiscuit(
      tableName, 
      ["ddl_create", "dml_insert", "dml_update", "dml_delete", "dql_select"]
    );
    
    const [response, error] = await this.sxtSDK.CreateTable(
      tableName,
      createTableQuery,
      accessType,
      this.config.publicKey,
      biscuit
    );
    
    if (error) {
      throw new Error(`Failed to create table ${tableName}: ${error}`);
    }
    
    console.log(`Table ${tableName} created successfully`);
  }

  // Execute DDL query (ALTER, DROP)
  public async executeDDL(tableName: string, ddlQuery: string): Promise<void> {
    await this.ensureValidToken();
    
    const biscuit = this.generateBiscuit(tableName, ["ddl_create", "ddl_alter", "ddl_drop"]);
    
    const [response, error] = await this.sxtSDK.DDL(tableName, ddlQuery, biscuit);
    
    if (error) {
      throw new Error(`Failed to execute DDL query on ${tableName}: ${error}`);
    }
    
    console.log(`DDL query executed successfully on ${tableName}`);
  }

  // Execute DML query (INSERT, UPDATE, DELETE, MERGE)
  public async executeDML(tableName: string, dmlQuery: string): Promise<void> {
    await this.ensureValidToken();
    
    const biscuit = this.generateBiscuit(tableName, ["dml_insert", "dml_update", "dml_delete"]);
    
    const [response, error] = await this.sxtSDK.DML(tableName, dmlQuery, biscuit);
    
    if (error) {
      throw new Error(`Failed to execute DML query on ${tableName}: ${error}`);
    }
    
    console.log(`DML query executed successfully on ${tableName}`);
  }

  // Execute DQL query (SELECT)
  public async executeDQL<T = any>(tableName: string, dqlQuery: string): Promise<T[]> {
    await this.ensureValidToken();
    
    const biscuit = this.generateBiscuit(tableName, ["dql_select"]);
    
    const [response, error] = await this.sxtSDK.DQL(tableName, dqlQuery, biscuit);
    
    if (error) {
      throw new Error(`Failed to execute DQL query on ${tableName}: ${error}`);
    }
    
    return response as T[];
  }

  // Get list of namespaces
  public async getNamespaces(): Promise<string[]> {
    await this.ensureValidToken();
    
    const [response, error] = await this.sxtSDK.getNameSpaces();
    
    if (error) {
      throw new Error(`Failed to get namespaces: ${error}`);
    }
    
    return response;
  }

  // Get list of tables in a namespace
  public async getTables(namespace: string, scope: string = "ALL"): Promise<string[]> {
    await this.ensureValidToken();
    
    const [response, error] = await this.sxtSDK.getTables(scope, namespace);
    
    if (error) {
      throw new Error(`Failed to get tables for namespace ${namespace}: ${error}`);
    }
    
    return response;
  }

  // Get columns for a table
  public async getTableColumns(namespace: string, tableName: string): Promise<any[]> {
    await this.ensureValidToken();
    
    const [response, error] = await this.sxtSDK.getTableColumns(namespace, tableName);
    
    if (error) {
      throw new Error(`Failed to get columns for table ${namespace}.${tableName}: ${error}`);
    }
    
    return response;
  }

  // Helper methods for blockchain data access

  // Fetch ERC-20 token transfers for an address
  public async fetchERC20Transfers(chain: string, address: string, startBlock: number = 0): Promise<any[]> {
    const query = `
      SELECT * FROM ${chain}.TOKEN_TRANSFERS 
      WHERE (from_address = '${address.toLowerCase()}' OR to_address = '${address.toLowerCase()}')
      AND block_number > ${startBlock}
      ORDER BY block_number DESC
    `;
    
    return this.executeDQL(`${chain}.TOKEN_TRANSFERS`, query);
  }

  // Fetch NFT transfers for an address
  public async fetchNFTTransfers(chain: string, address: string, startBlock: number = 0): Promise<any[]> {
    const query = `
      SELECT * FROM ${chain}.NFT_TRANSFERS 
      WHERE (from_address = '${address.toLowerCase()}' OR to_address = '${address.toLowerCase()}')
      AND block_number > ${startBlock}
      ORDER BY block_number DESC
    `;
    
    return this.executeDQL(`${chain}.NFT_TRANSFERS`, query);
  }

  // Fetch DeFi transactions for an address
  public async fetchDeFiTransactions(protocol: string, address: string): Promise<any[]> {
    const query = `
      SELECT * FROM DEFI.${protocol}_TRANSACTIONS 
      WHERE user_address = '${address.toLowerCase()}'
      ORDER BY block_timestamp DESC
    `;
    
    return this.executeDQL(`DEFI.${protocol}_TRANSACTIONS`, query);
  }

  // Fetch current token prices
  public async fetchTokenPrices(symbols: string[]): Promise<any[]> {
    const symbolList = symbols.map(s => `'${s.toUpperCase()}'`).join(',');
    const query = `
      SELECT * FROM MARKET.TOKEN_PRICES 
      WHERE symbol IN (${symbolList})
    `;
    
    return this.executeDQL(`MARKET.TOKEN_PRICES`, query);
  }

  // Fetch historical token prices
  public async fetchHistoricalPrices(symbol: string, startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT * FROM MARKET.HISTORICAL_PRICES 
      WHERE symbol = '${symbol.toUpperCase()}'
      AND timestamp >= '${startDate.toISOString()}'
      AND timestamp <= '${endDate.toISOString()}'
      ORDER BY timestamp ASC
    `;
    
    return this.executeDQL(`MARKET.HISTORICAL_PRICES`, query);
  }

  // Fetch DEX liquidity pools
  public async fetchLiquidityPools(dex: string): Promise<any[]> {
    const query = `
      SELECT * FROM DEX.${dex}_POOLS 
      ORDER BY total_value_locked DESC
    `;
    
    return this.executeDQL(`DEX.${dex}_POOLS`, query);
  }

  // Fetch yield farming opportunities
  public async fetchYieldOpportunities(): Promise<any[]> {
    const query = `
      SELECT * FROM DEFI.YIELD_OPPORTUNITIES 
      WHERE active = true
      ORDER BY apy DESC
    `;
    
    return this.executeDQL(`DEFI.YIELD_OPPORTUNITIES`, query);
  }
} 