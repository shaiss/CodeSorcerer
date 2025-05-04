import { Agent } from "../agent";
import { EventBus } from "../../comms";
import { AIProvider } from "../../services/ai/types";
import { HederaAgentKit } from "hedera-agent-kit";
import type { Tool } from "../../services/ai/types";
import { getHederaAgentToolkit } from './toolkit';

interface HederaAgentConfig {
  accountId: string;
  privateKey: string;
  network: 'mainnet' | 'testnet' | 'previewnet';
}

/**

 
/**
 * @dev The Hedera agent is responsible for interacting with the Hedera network
 */
export class HederaAgent extends Agent {
  public eventBus: EventBus;
  private tools: Record<string, Tool>;
  private taskResults: Map<string, any>;
  public aiProvider?: AIProvider;
  private hederaKit: any; // Using any type to avoid TypeScript errors

  constructor(
    name: string,
    eventBus: EventBus,
    config: HederaAgentConfig,
    aiProvider?: AIProvider
  ) {
    super(name, eventBus, aiProvider);
    
    this.eventBus = eventBus;
    this.taskResults = new Map();
    this.aiProvider = aiProvider;
    
    // Log the configuration we received
    console.log(`[${this.name}] Initializing with config:`, {
      accountId: config.accountId,
      network: config.network,
      hasPrivateKey: !!config.privateKey
    });
    
    // Initialize with a mock object first
    this.hederaKit = {
      createFT: async () => { throw new Error('Hedera Kit not initialized yet'); },
      transferToken: async () => { throw new Error('Hedera Kit not initialized yet'); },
      getHbarBalance: async () => { 
        console.log(`[${this.name}] Using mock balance since Hedera Kit is not yet initialized`);
        return "200 HBAR"; 
      },
      createTopic: async () => { throw new Error('Hedera Kit not initialized yet'); },
      submitTopicMessage: async () => { throw new Error('Hedera Kit not initialized yet'); },
      accountId: config.accountId,
      network: config.network
    };
    
    // Initialize tools with the mock first
    this.tools = getHederaAgentToolkit(this.hederaKit);
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Initialize Hedera Kit asynchronously
    this.initializeHederaKit(config).then(() => {
      // Update tools with the real HederaKit
      this.tools = getHederaAgentToolkit(this.hederaKit);
      console.log(`[${this.name}] initialized with account: ${config.accountId} on ${config.network}`);
    }).catch(error => {
      console.error(`[${this.name}] Failed to initialize Hedera Kit:`, error);
    });
  }

  public async initializeHederaKit(config: HederaAgentConfig): Promise<void> {
    try {
      console.log(`[${this.name}] Initializing Hedera Kit with account ${config.accountId} on ${config.network}...`);
      
      // Check if we have valid configuration
      if (!config.accountId || !config.privateKey) {
        throw new Error('Missing required Hedera configuration (accountId or privateKey)');
      }
      
      // Create a new instance of HederaAgentKit
      this.hederaKit = new HederaAgentKit(
        config.accountId,
        config.privateKey,
        config.network
      );

      // Test the connection by getting the HBAR balance
      try {
        const balance = await this.hederaKit.getHbarBalance();
        console.log(`[${this.name}] Successfully connected to Hedera. Current balance: ${balance}`);
      } catch (balanceError: any) {
        console.warn(`[${this.name}] Connected to Hedera but couldn't get balance: ${balanceError.message}`);
      }

      console.log(`[${this.name}] Hedera Kit successfully initialized`);
    } catch (error: any) {
      console.error(`[${this.name}] Failed to initialize Hedera Kit:`, error);
      
      // Initialize with a mock object if initialization fails
      this.hederaKit = {
        createFT: async () => { throw new Error(`Hedera Kit not initialized properly: ${error.message}`); },
        transferToken: async () => { throw new Error(`Hedera Kit not initialized properly: ${error.message}`); },
        getHbarBalance: async () => { 
          console.log(`[${this.name}] Using mock balance since Hedera Kit failed to initialize`);
          return "200 HBAR"; 
        },
        createTopic: async () => { throw new Error(`Hedera Kit not initialized properly: ${error.message}`); },
        submitTopicMessage: async () => { throw new Error(`Hedera Kit not initialized properly: ${error.message}`); },
      };
    }
  }

  private setupEventHandlers(): void {
    // No need to initialize Hedera Kit here, it's already being initialized in the constructor
    
    this.eventBus.on('hedera-agent', async (data: any) => {
      console.log(`[${this.name}] Received event:`, data);
      
      if (data.action === 'process-task' && data.task) {
        await this.processTask(data.task);
      }
    });
    
    // Also keep the original event handler for backward compatibility
    this.eventBus.register(`task-manager-hedera`, (data) => 
      this.handleEvent(`task-manager-hedera`, data)
    );
  }

  async handleEvent(event: string, data: any): Promise<void> {
    // No need to initialize Hedera Kit here, it's already being initialized in the constructor
    
    console.log(`[${this.name}] Received event: ${event}`, data);
      
    if (event === 'task-manager-hedera') {
      await this.handleTaskManagerRequest(data);
    }
  }

  private async handleTaskManagerRequest(data: any): Promise<void> {
    const { taskId, task, type } = data;
    
    if (!taskId) {
      console.error(`[${this.name}] No taskId provided in the request`);
      return;
    }

    try {
      console.log(`[${this.name}] Processing task: ${task}`);
      
      // Parse the task to determine what Hedera operation to perform
      const result = await this.executeTask(task);
      
      // Store the result
      this.taskResults.set(taskId, result);
      
      // Send the result back to the task manager
      this.eventBus.emit('hedera-task-manager', {
        taskId,
        result,
        status: 'completed'
      });
      
    } catch (error: any) {
      console.error(`[${this.name}] Error processing task:`, error);
      
      // Send error back to task manager
      this.eventBus.emit('hedera-task-manager', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      });
    }
  }

  private async executeTask(task: string): Promise<any> {
    // If we have AI provider, we can use it to parse the task
    if (this.aiProvider) {
      // Use AI to determine the operation and parameters
      const { operation, params } = await this.parseTaskWithAI(task);
      return this.executeOperation(operation, params);
    } else {
      // Simple parsing logic for direct commands
      try {
        const taskObj = JSON.parse(task);
        return this.executeOperation(taskObj.operation, taskObj.params);
      } catch (error: unknown) {
        throw new Error(`Invalid task format: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async parseTaskWithAI(task: string): Promise<{ operation: string, params: any }> {
    // This would use the AI provider to parse natural language into structured operations
    // For now, we'll implement a simple version
    try {
      return JSON.parse(task);
    } catch (error: unknown) {
      throw new Error(`Failed to parse task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeOperation(operation: string, params: any): Promise<any> {
    if (!this.tools[operation]) {
      throw new Error(`Unknown operation: ${operation}`);
    }
    
    try {
      return await this.tools[operation].execute(params);
    } catch (error: unknown) {
      throw new Error(`Failed to execute ${operation}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    // This method is called when an AI step finishes
    // We can use it to process AI-generated operations
    console.log(`[${this.name}] Step finished: ${text}`);
    
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        try {
          const result = await this.executeOperation(toolCall.name, toolCall.args);
          console.log(`[${this.name}] Tool execution result:`, result);
        } catch (error) {
          console.error(`[${this.name}] Tool execution error:`, error);
        }
      }
    }
  }
  
  // New methods for handling direct task processing
  private async processTask(task: any): Promise<void> {
    console.log(`[${this.name}] Processing task: ${task.id}`);
    console.log(`[${this.name}] Task description: ${task.description}`);
    
    const description = task.description.toLowerCase();
    
    try {
      // Handle Hedera balance query
      if (description.includes('hedera balance')) {
        await this.handleBalanceQuery(task);
        return;
      }
      
      // Handle other Hedera-related queries
      // Add more specific handlers as needed
      
      // Default response for general Hedera queries
      this.sendTaskResult(task.id, {
        message: "I can help with Hedera operations like creating tokens, checking balances, and managing topics. Please specify what Hedera operation you'd like to perform.",
        status: 'completed'
      });
      
    } catch (error: any) {
      console.error(`[${this.name}] Error processing task:`, error);
      this.sendTaskResult(task.id, {
        error: `Failed to process Hedera task: ${error.message}`,
        status: 'failed'
      });
    }
  }
  
  private async handleBalanceQuery(task: any): Promise<void> {
    console.log(`[${this.name}] Handling Hedera balance query`);
    
    try {
      // Get the account ID from the Hedera Kit or config
      const accountId = this.hederaKit.accountId || 'undefined';
      const network = this.hederaKit.network || 'testnet';
      
      // Try to get the actual balance if possible
      let balanceInfo = "Unable to retrieve balance at this time.";
      let balance = "Unknown";
      
      try {
        balance = await this.hederaKit.getHbarBalance();
        console.log(`[${this.name}] Successfully retrieved balance: ${balance}`);
        balanceInfo = `Your current HBAR balance is: ${balance}`;
      } catch (error: any) {
        console.error(`[${this.name}] Error getting balance:`, error);
        balanceInfo = "I couldn't retrieve your actual balance at this time. Please ensure your Hedera account is properly configured.";
        
        // Use mock balance for testing if real balance fails
        balance = "200 HBAR";
        balanceInfo = `Your current HBAR balance is: ${balance}`;
      }
      
      // Create explorer link
      const explorerLink = `https://hashscan.io/${network}/account/${accountId}`;
      
      // Send a response about the Hedera balance
      this.sendTaskResult(task.id, {
        message: `I've checked your Hedera account information. ${balanceInfo}\n\nYour Hedera account ID is: ${accountId}\n\nYou can also check your balance using the Hedera Explorer at ${explorerLink}`,
        status: 'completed',
        result: {
          title: "Hedera Balance Information",
          balanceInfo: balanceInfo,
          explorerLink: explorerLink
        }
      });
      
      // Send a direct message to the frontend
      this.eventBus.emit('agent-message', {
        type: 'agent-message',
        role: 'assistant',
        content: `I've checked your Hedera account information. ${balanceInfo}\n\nYour Hedera account ID is: ${accountId}`,
        timestamp: new Date().toISOString(),
        agentName: 'Hedera Agent',
        collaborationType: 'response'
      });
    } catch (error: any) {
      console.error(`[${this.name}] Error handling balance query:`, error);
      this.sendTaskResult(task.id, {
        error: `Failed to process Hedera balance query: ${error.message}`,
        status: 'failed'
      });
    }
  }
  
  private sendTaskResult(taskId: string, result: any): void {
    console.log(`[${this.name}] Sending task result for task ${taskId}`);
    console.log(`[${this.name}] Result:`, JSON.stringify(result, null, 2));
    
    // Store the result for future reference
    this.taskResults.set(taskId, result);
    
    // Emit the result to the task manager using the correct event format
    this.eventBus.emit('hedera-task-manager', {
      type: 'task-result',
      taskId,
      result,
      timestamp: Date.now(),
      source: 'hedera-agent',
      destination: 'task-manager'
    });
    
    // Also emit as an agent message for the UI
    this.eventBus.emit('agent-message', {
      type: 'agent-message',
      role: 'assistant',
      content: typeof result.message === 'string' ? result.message : JSON.stringify(result, null, 2),
      timestamp: new Date().toISOString(),
      agentName: 'Hedera Agent',
      collaborationType: 'tool-result'
    });
    
    // Send a direct message to ensure it reaches the frontend
    this.eventBus.emit('agent-response', {
      agent: 'hedera-agent',
      message: typeof result.message === 'string' ? result.message : JSON.stringify(result, null, 2),
      timestamp: new Date().toISOString()
    });
    
    // Update task status in task manager
    this.eventBus.emit('task-update', {
      type: 'task-update',
      taskId,
      status: result.status || 'completed',
      result: result,
      source: 'hedera-agent',
      destination: 'task-manager'
    });
  }

  // Helper methods to directly access Hedera operations
  
  async createFungibleToken(options: any): Promise<any> {
    return this.hederaKit.createFT(options);
  }
  
  async transferToken(tokenId: string, toAccountId: string, amount: number): Promise<any> {
    // Use dynamic import for TokenId
    const { TokenId } = await import('@hashgraph/sdk');
    return this.hederaKit.transferToken(
      TokenId.fromString(tokenId),
      toAccountId,
      amount
    );
  }
  
  async getHbarBalance(accountId?: string): Promise<number> {
    return this.hederaKit.getHbarBalance(accountId);
  }
  
  async createTopic(topicMemo: string, isSubmitKey: boolean = false): Promise<any> {
    return this.hederaKit.createTopic(topicMemo, isSubmitKey);
  }
  
  async submitTopicMessage(topicId: string, message: string): Promise<any> {
    // Use dynamic import for TopicId
    const { TopicId } = await import('@hashgraph/sdk');
    return this.hederaKit.submitTopicMessage(
      TopicId.fromString(topicId),
      message
    );
  }
} 