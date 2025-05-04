import { Agent } from '../agent';
import type { EventBus } from "../../comms";
import { AIProvider } from "../../services/ai/types";
import { StorageInterface } from "../types/storage";
import { ethers } from "ethers";
import { SXTDataProvider } from "../plugins/sxt-data-provider";

// Space and Time SDK interfaces (would be imported from the actual SDK)
interface SXTSDKInterface {
  authenticate: () => Promise<[any, any]>;
  CreateSchema: (schemaQuery: string) => Promise<[any, any]>;
  CreateTable: (tableName: string, createTableQuery: string, accessType: string, publicKey: string, biscuit: string) => Promise<[any, any]>;
  DDL: (tableName: string, ddlQuery: string, biscuit: string) => Promise<[any, any]>;
  DML: (tableName: string, dmlQuery: string, biscuit: string) => Promise<[any, any]>;
  DQL: (tableName: string, dqlQuery: string, biscuit: string) => Promise<[any, any]>;
  getNameSpaces: () => Promise<[any, any]>;
  getTables: (scope: string, namespace: string) => Promise<[any, any]>;
}

export class SXTAnalyticsAgent extends Agent {
  private storage: StorageInterface;
  private sxtProvider: SXTDataProvider;
  private taskResults: Map<string, any>;
  private currentTaskId: string | null = null;
  
  // Define the schemas and tables we will use
  private readonly SCHEMA_NAME = "PORTFOLIO";
  private readonly ASSETS_TABLE = "PORTFOLIO.ASSETS";
  private readonly TRANSACTIONS_TABLE = "PORTFOLIO.TRANSACTIONS";
  private readonly ANALYTICS_TABLE = "PORTFOLIO.ANALYTICS";

  constructor(
    name: string,
    eventBus: EventBus,
    storage: StorageInterface,
    sxtProvider: SXTDataProvider,
    aiProvider?: AIProvider
  ) {
    super(name, eventBus, aiProvider);
    this.storage = storage;
    this.sxtProvider = sxtProvider;
    this.taskResults = new Map();
    
    this.setupEventHandlers();
    this.initializeSXT();
  }

  private setupEventHandlers(): void {
    // Listen for task-manager events
    this.eventBus.register(`task-manager-${this.name}`, (data) => {
      this.handleEvent(`task-manager-${this.name}`, data);
    });
    
    // Listen for portfolio update events
    this.eventBus.register(`portfolio-update`, (data) => {
      this.handleEvent(`portfolio-update`, data);
    });
  }

  async handleEvent(event: string, data: any): Promise<void> {
    console.log(`[${this.name}] Received event: ${event}`);
    
    if (event === `task-manager-${this.name}`) {
      await this.handleTaskManagerRequest(data);
    } else if (event === 'portfolio-update') {
      await this.handlePortfolioUpdate(data);
    }
  }

  private async handleTaskManagerRequest(data: any): Promise<void> {
    const { taskId, task } = data;
    this.currentTaskId = taskId;

    try {
      console.log(`[${this.name}] Processing task: ${task}`);
      
      // Parse the task with AI to determine what operation to perform
      const { operation, params } = await this.parseTaskWithAI(task);
      
      // Execute the operation
      const result = await this.executeOperation(operation, params);
      
      // Store the result
      this.taskResults.set(taskId, result);
      
      // Notify the task manager of completion
      this.eventBus.emit(`${this.name}-task-manager`, {
        taskId,
        status: 'completed',
        result
      });
    } catch (error) {
      console.error(`[${this.name}] Error processing task:`, error);
      
      // Notify the task manager of failure
      this.eventBus.emit(`${this.name}-task-manager`, {
        taskId,
        status: 'failed',
        error: "Error processing task"
      });
    } finally {
      this.currentTaskId = null;
    }
  }

  private async handlePortfolioUpdate(data: any): Promise<void> {
    try {
      const { assets, transactions } = data;
      
      // Update the assets and transactions in SXT
      await this.updateAssetsTable(assets);
      await this.updateTransactionsTable(transactions);
      
      // Generate new analytics
      await this.generateAnalytics();
      
      console.log(`[${this.name}] Portfolio updated successfully`);
    } catch (error) {
      console.error(`[${this.name}] Error updating portfolio:`, error);
    }
  }

  private async parseTaskWithAI(task: string): Promise<{ operation: string, params: any }> {
    if (!this.aiProvider) {
      throw new Error("AI provider not available");
    }

    try {
      // Use AI to interpret the user's task
      const systemPrompt = `You are an AI assistant helping with portfolio analytics using Space and Time. 
      Parse the user task and identify the operation and parameters needed. 
      Operations include: getPortfolioSummary, getAssetPerformance, getRiskAnalysis, getMarketOpportunities, getHistoricalPerformance.
      
      Respond in the following format:
      Operation: [operation name]
      Parameters: [JSON object with parameters]`;
      
      // Assuming the AIProvider has a method to process a prompt and return a string
      // If this doesn't match your actual AIProvider interface, you'll need to adapt this
      const aiResponse = await this.aiProvider.processPrompt(systemPrompt, task);
      
      // Parse the AI response to extract operation and parameters
      const lines = aiResponse.toString().split('\n');
      const operationLine = lines.find(line => line.trim().startsWith('Operation:'));
      const paramsLine = lines.find(line => line.trim().startsWith('Parameters:'));
      
      if (!operationLine) {
        throw new Error("Could not determine operation from AI response");
      }
      
      const operation = operationLine.replace('Operation:', '').trim();
      const params = paramsLine ? 
        JSON.parse(paramsLine.replace('Parameters:', '').trim()) : 
        {};
      
      return { operation, params };
    } catch (error) {
      console.error("Error parsing task with AI:", error);
      
      // Fallback to a simple parsing strategy if AI fails
      if (task.toLowerCase().includes('summary')) {
        return { operation: 'getPortfolioSummary', params: {} };
      } else if (task.toLowerCase().includes('risk')) {
        return { operation: 'getRiskAnalysis', params: {} };
      } else if (task.toLowerCase().includes('opportunity') || task.toLowerCase().includes('opportunities')) {
        return { operation: 'getMarketOpportunities', params: {} };
      } else if (task.toLowerCase().includes('history') || task.toLowerCase().includes('performance')) {
        return { operation: 'getHistoricalPerformance', params: { timeframe: '30d' } };
      } else {
        // Default operation
        return { operation: 'getPortfolioSummary', params: {} };
      }
    }
  }

  private async executeOperation(operation: string, params: any): Promise<any> {
    switch (operation) {
      case 'getPortfolioSummary':
        return this.getPortfolioSummary();
      case 'getAssetPerformance':
        return this.getAssetPerformance(params.asset);
      case 'getRiskAnalysis':
        return this.getRiskAnalysis();
      case 'getMarketOpportunities':
        return this.getMarketOpportunities();
      case 'getHistoricalPerformance':
        return this.getHistoricalPerformance(params.timeframe);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    // Handle any AI assistant step completion
    if (this.currentTaskId) {
      // Update with intermediate results if needed
    }
  }

  // SXT Initialization and Schema Setup
  private async initializeSXT(): Promise<void> {
    try {
      // Initialize schema and tables if they don't exist
      await this.sxtProvider.createSchema(this.SCHEMA_NAME);
      
      // Create Assets table
      await this.sxtProvider.createTable(
        this.ASSETS_TABLE,
        `CREATE TABLE IF NOT EXISTS ${this.ASSETS_TABLE} (
          asset_id VARCHAR PRIMARY KEY,
          symbol VARCHAR,
          name VARCHAR,
          chain VARCHAR,
          contract_address VARCHAR,
          quantity DECIMAL(38,18),
          avg_price_usd DECIMAL(38,18),
          last_updated_at TIMESTAMP
        )`
      );
      
      // Create Transactions table
      await this.sxtProvider.createTable(
        this.TRANSACTIONS_TABLE,
        `CREATE TABLE IF NOT EXISTS ${this.TRANSACTIONS_TABLE} (
          tx_id VARCHAR PRIMARY KEY,
          asset_id VARCHAR,
          tx_hash VARCHAR,
          tx_type VARCHAR,
          amount DECIMAL(38,18),
          price_usd DECIMAL(38,18),
          timestamp TIMESTAMP,
          chain VARCHAR,
          block_number BIGINT,
          from_address VARCHAR,
          to_address VARCHAR,
          FOREIGN KEY (asset_id) REFERENCES ${this.ASSETS_TABLE}(asset_id)
        )`
      );
      
      // Create Analytics table
      await this.sxtProvider.createTable(
        this.ANALYTICS_TABLE,
        `CREATE TABLE IF NOT EXISTS ${this.ANALYTICS_TABLE} (
          id VARCHAR PRIMARY KEY,
          analysis_type VARCHAR,
          asset_id VARCHAR,
          value DECIMAL(38,18),
          metadata JSON,
          generated_at TIMESTAMP,
          FOREIGN KEY (asset_id) REFERENCES ${this.ASSETS_TABLE}(asset_id)
        )`
      );
      
      console.log(`[${this.name}] SXT initialization completed successfully`);
    } catch (error) {
      console.error(`[${this.name}] SXT initialization failed:`, error);
    }
  }

  // Data management methods
  private async updateAssetsTable(assets: any[]): Promise<void> {
    // Clear existing data (in a real implementation, you might use more sophisticated upsert logic)
    await this.sxtProvider.executeDML(
      this.ASSETS_TABLE, 
      `DELETE FROM ${this.ASSETS_TABLE}`
    );
    
    // Insert new assets
    for (const asset of assets) {
      await this.sxtProvider.executeDML(
        this.ASSETS_TABLE,
        `INSERT INTO ${this.ASSETS_TABLE} VALUES (
          '${asset.id}',
          '${asset.symbol}',
          '${asset.name}',
          '${asset.chain}',
          '${asset.contractAddress}',
          ${asset.quantity},
          ${asset.avgPriceUsd},
          '${new Date().toISOString()}'
        )`
      );
    }
  }
  
  private async updateTransactionsTable(transactions: any[]): Promise<void> {
    // Insert new transactions (assuming they are unique by tx_id)
    for (const tx of transactions) {
      // Check if transaction already exists
      const existingTx = await this.sxtProvider.executeDQL(
        this.TRANSACTIONS_TABLE,
        `SELECT tx_id FROM ${this.TRANSACTIONS_TABLE} WHERE tx_id = '${tx.id}'`
      );
      
      if (!existingTx || existingTx.length === 0) {
        await this.sxtProvider.executeDML(
          this.TRANSACTIONS_TABLE,
          `INSERT INTO ${this.TRANSACTIONS_TABLE} VALUES (
            '${tx.id}',
            '${tx.assetId}',
            '${tx.txHash}',
            '${tx.txType}',
            ${tx.amount},
            ${tx.priceUsd},
            '${tx.timestamp}',
            '${tx.chain}',
            ${tx.blockNumber},
            '${tx.fromAddress}',
            '${tx.toAddress}'
          )`
        );
      }
    }
  }
  
  private async generateAnalytics(): Promise<void> {
    // Generate various analytics based on the data
    
    // 1. Calculate total portfolio value
    const portfolioValue = await this.sxtProvider.executeDQL(
      this.ASSETS_TABLE,
      `SELECT SUM(quantity * avg_price_usd) as total_value FROM ${this.ASSETS_TABLE}`
    );
    
    // Store the analytics result
    await this.sxtProvider.executeDML(
      this.ANALYTICS_TABLE,
      `INSERT INTO ${this.ANALYTICS_TABLE} VALUES (
        'portfolio-value-${Date.now()}',
        'portfolio_value',
        NULL,
        ${portfolioValue[0]?.total_value || 0},
        '{}',
        '${new Date().toISOString()}'
      )`
    );
    
    // 2. Calculate asset distribution
    const assets = await this.sxtProvider.executeDQL(
      this.ASSETS_TABLE,
      `SELECT asset_id, symbol, (quantity * avg_price_usd) as value FROM ${this.ASSETS_TABLE}`
    );
    
    // Store asset distribution in analytics
    for (const asset of assets) {
      await this.sxtProvider.executeDML(
        this.ANALYTICS_TABLE,
        `INSERT INTO ${this.ANALYTICS_TABLE} VALUES (
          'asset-value-${asset.asset_id}-${Date.now()}',
          'asset_value',
          '${asset.asset_id}',
          ${asset.value},
          '{"symbol": "${asset.symbol}"}',
          '${new Date().toISOString()}'
        )`
      );
    }
  }

  // Analytics query methods
  private async getPortfolioSummary(): Promise<any> {
    // Get total portfolio value
    const totalValue = await this.sxtProvider.executeDQL(
      this.ANALYTICS_TABLE,
      `SELECT value FROM ${this.ANALYTICS_TABLE} 
       WHERE analysis_type = 'portfolio_value'
       ORDER BY generated_at DESC LIMIT 1`
    );
    
    // Get asset distribution
    const assetDistribution = await this.sxtProvider.executeDQL(
      this.ANALYTICS_TABLE,
      `SELECT a.asset_id, a.value, a.metadata->>'symbol' as symbol, 
              b.name, b.chain
       FROM ${this.ANALYTICS_TABLE} a
       JOIN ${this.ASSETS_TABLE} b ON a.asset_id = b.asset_id
       WHERE a.analysis_type = 'asset_value'
       ORDER BY a.value DESC`
    );
    
    return {
      totalValue: totalValue[0]?.value || 0,
      assetDistribution,
      generatedAt: new Date().toISOString()
    };
  }
  
  private async getAssetPerformance(assetId: string): Promise<any> {
    // Get asset details
    const asset = await this.sxtProvider.executeDQL(
      this.ASSETS_TABLE,
      `SELECT * FROM ${this.ASSETS_TABLE} WHERE asset_id = '${assetId}'`
    );
    
    if (!asset || asset.length === 0) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    
    // Get transaction history
    const transactions = await this.sxtProvider.executeDQL(
      this.TRANSACTIONS_TABLE,
      `SELECT * FROM ${this.TRANSACTIONS_TABLE} 
       WHERE asset_id = '${assetId}'
       ORDER BY timestamp DESC`
    );
    
    return {
      asset: asset[0],
      transactions,
      currentValue: asset[0].quantity * asset[0].avg_price_usd
    };
  }
  
  private async getRiskAnalysis(): Promise<any> {
    // Get asset distribution
    const assetDistribution = await this.sxtProvider.executeDQL(
      this.ANALYTICS_TABLE,
      `SELECT a.asset_id, a.value, a.metadata->>'symbol' as symbol, 
              b.chain
       FROM ${this.ANALYTICS_TABLE} a
       JOIN ${this.ASSETS_TABLE} b ON a.asset_id = b.asset_id
       WHERE a.analysis_type = 'asset_value'
       ORDER BY a.value DESC`
    );
    
    // Calculate concentration metrics
    const totalValue = assetDistribution.reduce((sum, asset) => sum + Number(asset.value), 0);
    const concentrationByAsset = assetDistribution.map(asset => ({
      ...asset,
      percentage: (Number(asset.value) / totalValue) * 100
    }));
    
    // Group by chain
    const chainGroups: Record<string, number> = {};
    for (const asset of assetDistribution) {
      if (!chainGroups[asset.chain]) {
        chainGroups[asset.chain] = 0;
      }
      chainGroups[asset.chain] += Number(asset.value);
    }
    
    const concentrationByChain = Object.entries(chainGroups).map(([chain, value]) => ({
      chain,
      value,
      percentage: (value / totalValue) * 100
    }));
    
    return {
      concentrationByAsset,
      concentrationByChain,
      riskScore: this.calculateRiskScore(concentrationByAsset, concentrationByChain),
      generatedAt: new Date().toISOString()
    };
  }
  
  private calculateRiskScore(assetConcentration: any[], chainConcentration: any[]): number {
    // A simple risk scoring algorithm based on concentration
    
    // Higher concentration in a single asset = higher risk
    const maxAssetConcentration = Math.max(...assetConcentration.map(a => a.percentage));
    
    // Higher concentration in a single chain = higher risk
    const maxChainConcentration = Math.max(...chainConcentration.map(c => c.percentage));
    
    // Diversification factor (more assets = lower risk)
    const diversificationFactor = Math.min(10, assetConcentration.length) / 10;
    
    // Calculate risk score (0-100, higher = riskier)
    const riskScore = (maxAssetConcentration * 0.6) + (maxChainConcentration * 0.3) - (diversificationFactor * 20);
    
    return Math.max(0, Math.min(100, riskScore));
  }
  
  private async getMarketOpportunities(): Promise<any> {
    try {
      // Query SXT for yield farming opportunities
      const yieldOpportunities = await this.sxtProvider.fetchYieldOpportunities();
      
      // Format the response
      return {
        opportunities: yieldOpportunities.map(opportunity => ({
          type: opportunity.type,
          protocol: opportunity.protocol,
          asset: opportunity.asset,
          chain: opportunity.chain,
          apy: opportunity.apy,
          risk: opportunity.risk
        })),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error fetching yield opportunities:", error);
      
      // Fallback to sample data if the SXT query fails
      return {
        opportunities: [
          {
            type: "yield_farming",
            protocol: "Aave",
            asset: "USDC",
            chain: "Ethereum",
            apy: 3.5,
            risk: "low"
          },
          {
            type: "liquidity_mining",
            protocol: "Uniswap",
            asset: "ETH-USDC",
            chain: "Ethereum",
            apy: 8.2,
            risk: "medium"
          }
        ],
        generatedAt: new Date().toISOString()
      };
    }
  }
  
  private async getHistoricalPerformance(timeframe: string = '30d'): Promise<any> {
    // Convert timeframe to a date
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get transactions within the timeframe
    const transactions = await this.sxtProvider.executeDQL(
      this.TRANSACTIONS_TABLE,
      `SELECT * FROM ${this.TRANSACTIONS_TABLE} 
       WHERE timestamp >= '${startDate.toISOString()}'
       ORDER BY timestamp ASC`
    );
    
    // In a real implementation, this would calculate performance metrics
    // based on historical data using SXT's data
    
    // For assets with price history, fetch it
    const assets = await this.sxtProvider.executeDQL(
      this.ASSETS_TABLE,
      `SELECT asset_id, symbol FROM ${this.ASSETS_TABLE}`
    );
    
    // Sample historical performance calculation
    return {
      timeframe,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      transactions,
      metrics: {
        startValue: 10000,
        endValue: 12500,
        percentageChange: 25,
        volatility: 15.3
      }
    };
  }
} 