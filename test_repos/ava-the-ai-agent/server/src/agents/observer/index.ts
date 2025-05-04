import { generateText } from "ai";
import type { EventBus } from "../../comms";
import { IPAgent } from "../types/ip-agent";
import { openai } from "@ai-sdk/openai";
import { getObserverSystemPrompt } from "../../system-prompts";
import type { Hex, Account } from "viem";
import { getObserverToolkit } from "./toolkit";
import { saveThought } from "../../memory";
import env from "../../env";
import type { AIProvider, AIResponse, Tool } from "../../services/ai/types";
import { v4 as uuidv4 } from 'uuid';
import { StorageInterface } from "../types/storage";
import { ATCPIPProvider } from "../plugins/atcp-ip";
import type { IPLicenseTerms, IPMetadata } from "../types/ip-agent";

const OBSERVER_STARTING_PROMPT = `Analyze the current market situation using Cookie API data. 
Focus on:
1. Top agents by mindshare
2. Recent relevant tweets and social sentiment
3. Specific agent performance metrics
Use this information to identify potential opportunities and risks.`;
const oldprompt = "Based on the current market data and the tokens that you hold, generate a report explaining what steps could be taken.";

interface AgentData {
  agentName: string;
  mindshare: number;
  marketCap: number;
  volume24Hours: number;
}

interface TweetData {
  text: string;
  engagementsCount: number;
  smartEngagementPoints: number;
}

interface ToolResult {
  tool: string;
  result?: any;
  error?: string;
  status: 'success' | 'error';
}

/**
 * @dev The observer agent is responsible for generating a report about the best opportunities to make money.
 */
export class ObserverAgent extends IPAgent {
  private address: Hex;
  private account: Account;
  private isRunning: boolean = false;
  private tools: Record<string, Tool>;
  protected aiProvider: AIProvider;
  private taskId: string | null = null;
  private taskData: any = null;
  private taskResults: ToolResult[] = [];
  private taskStartTime: number = 0;

  /**
   * @param name - The name of the agent
   * @param eventBus - The event bus to emit events to other agents
   * @param account - The account to observe
   * @param aiProvider - The AI provider to use for generating text
   * @param storage - The storage plugin
   * @param atcpipProvider - The ATCPIP provider
   */
  constructor(
    name: string,
    eventBus: EventBus,
    account: Account,
    aiProvider: AIProvider,
    storage: StorageInterface,
    atcpipProvider: ATCPIPProvider
  ) {
    super(name, eventBus, storage, atcpipProvider, aiProvider);
    this.address = account.address;
    this.account = account;
    this.aiProvider = aiProvider;
    this.tools = getObserverToolkit(this.address);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for task manager events
    this.eventBus.on('task-manager-observer', async (data) => {
      console.log(`[${this.name}] ========== RECEIVED TASK MANAGER EVENT ==========`);
      console.log(`[${this.name}] Event: task-manager-observer`);
      console.log(`[${this.name}] Task ID: ${data.taskId}`);
      console.log(`[${this.name}] Task Type: ${data.type}`);
      console.log(`[${this.name}] Source: ${data.source}`);
      console.log(`[${this.name}] Timestamp: ${new Date().toISOString()}`);
      
      try {
        if (data.type === 'analyze') {
          await this.handleTaskManagerEvent(data);
        }
      } catch (error) {
        console.error(`[${this.name}] Error handling task-manager-observer event:`, error);
        this.eventBus.emit('agent-error', {
          agent: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          taskId: data.taskId,
          timestamp: Date.now()
        });
      }
    });

    // Listen for market updates
    this.eventBus.on('market-update', async (data) => {
      console.log(`[${this.name}] ========== RECEIVED MARKET UPDATE ==========`);
      console.log(`[${this.name}] Timestamp: ${new Date().toISOString()}`);
      await this.handleMarketUpdate(data);
    });

    // Listen for sentiment updates
    this.eventBus.on('sentiment-update', async (data) => {
      console.log(`[${this.name}] ========== RECEIVED SENTIMENT UPDATE ==========`);
      console.log(`[${this.name}] Timestamp: ${new Date().toISOString()}`);
      await this.handleSentimentUpdate(data);
    });
  }

  /**
   * Implementation of abstract method from IPAgent class
   */
  async onStepFinish({ text, toolCalls, toolResults }: {
    text?: string;
    toolCalls?: any[];
    toolResults?: any[];
  }): Promise<void> {
    console.log(
        // @ts-ignore
      `[observer] step finished. tools called: ${toolCalls?.length > 0
        // @ts-ignore
        ? toolCalls.map((tool: any) => tool.toolName).join(", ")
        : "none"
      }`
    );
    if (text) {
      // Store chain of thought in Recall
      await this.storeChainOfThought(`thought:${Date.now()}`, [text], {
        toolCalls: toolCalls || [],
        toolResults: toolResults || []
      });

      await saveThought({
        agent: "observer",
        text,
        toolCalls: toolCalls || [],
        toolResults: toolResults || [],
      });
    }
  }

  /**
   * @param event - The event to handle
   * @param data - The data to handle
   */
  async handleEvent(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case `task-manager-${this.name}`:
          await this.handleTaskManagerEvent(data);
          break;
        case 'market-update':
          await this.handleMarketUpdate(data);
          break;
        case 'sentiment-update':
          await this.handleSentimentUpdate(data);
          break;
        default:
          console.log(`[${this.name}] Unhandled event: ${event}`);
      }
    } catch (error) {
      console.error(`[${this.name}] Error handling event:`, error);
      this.eventBus.emit('agent-error', {
        agent: this.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * @param data - The data to handle
   */
  private async handleTaskManagerEvent(data: any): Promise<void> {
    console.log(`[${this.name}] ========== Starting Task Manager Event Handler ==========`);
    const toolResults: ToolResult[] = [];
    
    try {
      if (!data.taskId || !data.task) {
        throw new Error('Invalid task data: missing taskId or task');
      }

      const taskId = data.taskId;
      console.log(`[${this.name}] Received task from Task Manager:`);
      console.log(`[${this.name}] Task ID: ${taskId}`);
      console.log(`[${this.name}] Task Description: ${data.task}`);

      // Store task in Recall
      console.log(`[${this.name}] Storing task in Recall...`);
      
      await this.storeIntelligence(`task:${taskId}`, {
        task: data.task,
        type: 'analysis',
        status: 'in_progress',
        timestamp: Date.now()
      });
      console.log(`[${this.name}] Task stored successfully`);
      
      // Process the task
      console.log(`[${this.name}] Starting task processing...`);
      const result = await this.processTask(data.task);
      console.log(`[${this.name}] Task processing completed`);

      // Store the result in Recall
      console.log(`[${this.name}] Storing task result in Recall...`);
      await this.storeIntelligence(`result:${taskId}`, {
        result,
        status: 'completed',
        timestamp: Date.now()
      });
      console.log(`[${this.name}] Result stored successfully`);

      // Emit result back to task manager
      console.log(`[${this.name}] Emitting result back to Task Manager...`);
      this.eventBus.emit('observer-task-manager', {
        taskId,
        result,
        status: 'completed',
        toolResults,
        timestamp: Date.now(),
        source: 'observer',
        destination: 'task-manager'
      });

      console.log(`[${this.name}] ========== Task Manager Event Handler Complete ==========\n`);
    } catch (error) {
      console.error(`[${this.name}] Error processing task:`, error);
      
      // Store error in Recall
      await this.storeIntelligence(`error:${data.taskId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        task: data.task
      });
      
      // Emit error result to task manager
      this.eventBus.emit('observer-task-manager', {
        taskId: data.taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed',
        toolResults,
        timestamp: Date.now(),
        source: 'observer',
        destination: 'task-manager'
      });
    }
  }

  private async handleMarketUpdate(data: any): Promise<void> {
    // Handle market updates
    this.eventBus.emit('agent-action', {
      agent: this.name,
      action: 'Processing market update'
    });
  }

  private async handleSentimentUpdate(data: any): Promise<void> {
    // Handle sentiment updates
    this.eventBus.emit('agent-action', {
      agent: this.name,
      action: 'Processing sentiment update'
    });
  }

  /**
   * @dev Starts the observer agent
   * @param taskManagerData - The data from the task manager agent
   */
  async start(taskManagerData?: any): Promise<void> {
    if (!this.address) {
      throw new Error("Observer agent not initialized with account address");
    }

    this.eventBus.emit('agent-action', {
      agent: this.name,
      action: 'Starting market analysis'
    });

    try {
      const systemPrompt = getObserverSystemPrompt(this.address);
      const response = await this.aiProvider?.generateText(
        taskManagerData ? 
          `Analyze the following task manager data and provide recommendations:\n${JSON.stringify(taskManagerData)}` :
          'Perform a complete market and portfolio analysis.',
        systemPrompt.content
      );

      // Process tool calls if any
      if (response?.toolCalls) {
        for (const toolCall of response.toolCalls) {
          try {
            const result = await this.executeTool(toolCall);
            this.eventBus.emit('agent-action', {
              agent: this.name,
              action: `Tool ${toolCall.name} executed successfully`
            });
          } catch (error) {
            console.error(`[${this.name}] Tool execution error:`, error);
          }
        }
      }

      // Emit results to task manager
      this.eventBus.emit(`${this.name}-task-manager`, {
        report: response?.text,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`[${this.name}] Error in start:`, error);
      this.eventBus.emit('agent-error', {
        agent: this.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async executeTool(toolCall: { name: string; args: any }): Promise<any> {
    const tool = this.tools[toolCall.name];
    if (!tool) {
      throw new Error(`Tool ${toolCall.name} not found`);
    }
    return tool.execute(toolCall.args);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.eventBus.emit('agent-action', {
      agent: this.name,
      action: 'Stopping observation'
    });
  }

  async processTask(task: string): Promise<ToolResult[]> {
    console.log(`[${this.name}] ========== Starting Task Processing ==========`);
    const toolResults: ToolResult[] = [];
    const startTime = Date.now();
    const bucketId = `task-bucket-${startTime}`; // Single bucket for entire task
    
    console.log(`[${this.name}] Using bucket ID: ${bucketId}`);
    console.log(`[${this.name}] Task: ${task}`);
    console.log(`[${this.name}] Start Time: ${new Date(startTime).toISOString()}`);

    // Emit task start event
    this.eventBus.emit('agent-message', {
      role: 'assistant',
      content: `Starting task analysis: ${task}`,
      timestamp: new Date().toLocaleTimeString(),
      agentName: this.name,
      collaborationType: 'analysis'
    });

    try {
      // Execute getMarketData tool
      console.log(`[${this.name}] ========== Executing getMarketData Tool ==========`);
      try {
        // Emit tool execution start
        this.eventBus.emit('agent-message', {
          role: 'assistant',
          content: 'Fetching market data...',
          timestamp: new Date().toLocaleTimeString(),
          agentName: this.name,
          collaborationType: 'execution'
        });

        const marketDataResult = await this.tools.getMarketData.execute({
          bucketId
        }, {
          toolCallId: `market-data-${startTime}`,
          messages: [],
          severity: 'info'
        });
        
        if (marketDataResult.success) {
          console.log(`[${this.name}] Market data retrieved successfully`);
          toolResults.push({
            tool: 'getMarketData',
            result: marketDataResult.result,
            status: 'success'
          });

          // Emit market data result
          this.eventBus.emit('agent-message', {
            role: 'assistant',
            content: marketDataResult.result,
            timestamp: new Date().toLocaleTimeString(),
            agentName: this.name,
            collaborationType: 'tool-result',
            status: 'success'
          });
          
          await this.storeIntelligence(`market-data:${startTime}`, {
            data: marketDataResult.result,
            timestamp: Date.now(),
            bucketId
          });
        } else {
          console.error(`[${this.name}] Error executing getMarketData:`, marketDataResult.error);
          toolResults.push({
            tool: 'getMarketData',
            error: marketDataResult.error,
            status: 'error'
          });

          // Emit error message
          this.eventBus.emit('agent-message', {
            role: 'assistant',
            content: `Error fetching market data: ${marketDataResult.error}`,
            timestamp: new Date().toLocaleTimeString(),
            agentName: this.name,
            collaborationType: 'tool-result',
            status: 'error'
          });
        }
      } catch (error) {
        console.error(`[${this.name}] Error executing getMarketData:`, error);
        toolResults.push({
          tool: 'getMarketData',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        });
      }

      // Execute getTopAgents tool
      console.log(`[${this.name}] ========== Executing getTopAgents Tool ==========`);
      try {
        // Emit tool execution start
        this.eventBus.emit('agent-message', {
          role: 'assistant',
          content: 'Fetching top agents data...',
          timestamp: new Date().toLocaleTimeString(),
          agentName: this.name,
          collaborationType: 'execution'
        });

        const topAgentsResult = await this.tools.getTopAgents.execute({
          bucketId
        }, {
          toolCallId: `top-agents-${startTime}`,
          messages: [],
          severity: 'info'
        });

        if (topAgentsResult.success) {
          console.log(`[${this.name}] Top agents data retrieved successfully`);
          toolResults.push({
            tool: 'getTopAgents',
            result: topAgentsResult.result,
            status: 'success'
          });

          // Emit top agents result
          this.eventBus.emit('agent-message', {
            role: 'assistant',
            content: topAgentsResult.result,
            timestamp: new Date().toLocaleTimeString(),
            agentName: this.name,
            collaborationType: 'tool-result',
            status: 'success'
          });
          
          await this.storeIntelligence(`top-agents:${startTime}`, {
            data: topAgentsResult.result,
            timestamp: Date.now(),
            bucketId
          });
        } else {
          console.error(`[${this.name}] Error executing getTopAgents:`, topAgentsResult.error);
          toolResults.push({
            tool: 'getTopAgents',
            error: topAgentsResult.error,
            status: 'error'
          });

          // Emit error message
          this.eventBus.emit('agent-message', {
            role: 'assistant',
            content: `Error fetching top agents: ${topAgentsResult.error}`,
            timestamp: new Date().toLocaleTimeString(),
            agentName: this.name,
            collaborationType: 'tool-result',
            status: 'error'
          });
        }
      } catch (error) {
        console.error(`[${this.name}] Error executing getTopAgents:`, error);
        toolResults.push({
          tool: 'getTopAgents',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        });
      }

      // Execute searchCookieTweets tool
      console.log(`[${this.name}] ========== Executing searchCookieTweets Tool ==========`);
      try {
        // Emit tool execution start
        this.eventBus.emit('agent-message', {
          role: 'assistant',
          content: 'Searching relevant tweets...',
          timestamp: new Date().toLocaleTimeString(),
          agentName: this.name,
          collaborationType: 'execution'
        });

        const tweetResult = await this.tools.searchCookieTweets.execute({
          bucketId
        }, {
          toolCallId: `tweets-${startTime}`,
          messages: [],
          severity: 'info'
        });

        if (tweetResult.success) {
          console.log(`[${this.name}] Tweet data retrieved successfully`);
          toolResults.push({
            tool: 'searchCookieTweets',
            result: tweetResult.result,
            status: 'success'
          });

          // Emit tweet search result
          this.eventBus.emit('agent-message', {
            role: 'assistant',
            content: tweetResult.result,
            timestamp: new Date().toLocaleTimeString(),
            agentName: this.name,
            collaborationType: 'tool-result',
            status: 'success'
          });
          
          await this.storeIntelligence(`tweets:${startTime}`, {
            data: tweetResult.result,
            timestamp: Date.now(),
            bucketId
          });
        } else {
          console.error(`[${this.name}] Error executing searchCookieTweets:`, tweetResult.error);
          toolResults.push({
            tool: 'searchCookieTweets',
            error: tweetResult.error,
            status: 'error'
          });

          // Emit error message
          this.eventBus.emit('agent-message', {
            role: 'assistant',
            content: `Error searching tweets: ${tweetResult.error}`,
            timestamp: new Date().toLocaleTimeString(),
            agentName: this.name,
            collaborationType: 'tool-result',
            status: 'error'
          });
        }
      } catch (error) {
        console.error(`[${this.name}] Error executing searchCookieTweets:`, error);
        toolResults.push({
          tool: 'searchCookieTweets',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        });
      }

      console.log(`[${this.name}] ========== Task Processing Complete ==========`);
      console.log(`[${this.name}] Total tools executed: ${toolResults.length}`);
      console.log(`[${this.name}] Successful tools: ${toolResults.filter(r => r.status === 'success').length}`);
      console.log(`[${this.name}] Failed tools: ${toolResults.filter(r => r.status === 'error').length}`);
      
      // Store all tool results together
      await this.storeIntelligence(`tool-results:${startTime}`, {
        results: toolResults,
        timestamp: Date.now(),
        bucketId
      });

      // Emit task completion summary
      this.eventBus.emit('agent-message', {
        role: 'assistant',
        content: `Task processing complete.\nTotal tools executed: ${toolResults.length}\nSuccessful tools: ${toolResults.filter(r => r.status === 'success').length}\nFailed tools: ${toolResults.filter(r => r.status === 'error').length}`,
        timestamp: new Date().toLocaleTimeString(),
        agentName: this.name,
        collaborationType: 'report',
        status: 'success'
      });
      
      return toolResults;
    } catch (error) {
      console.error(`[${this.name}] Error in processTask:`, error);
      
      // Emit error message
      this.eventBus.emit('agent-message', {
        role: 'assistant',
        content: `Error processing task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString(),
        agentName: this.name,
        collaborationType: 'report',
        status: 'error'
      });
      
      throw error;
    }
  }

  private async analyzeTask(task: string): Promise<string> {
    // Implement task analysis logic
    // This should use your existing AI tools to analyze the task
    // and determine the best course of action
    return "Task analysis result";
  }

  async processMessage(message: string): Promise<string> {
    try {
      const systemPrompt = getObserverSystemPrompt(this.address!);
      const response = await this.aiProvider?.generateText(
        message,
        systemPrompt.content
      );

      await saveThought({
        agent: this.name,
        text: response?.text || '',
        toolCalls: response?.toolCalls || [],
        toolResults: []
      });

      return response?.text || '';
    } catch (error) {
      console.error('Observer agent error:', error);
      throw error;
    }
  }

  updateAIProvider(newProvider: AIProvider): void {
    this.aiProvider = newProvider;
    this.eventBus.emit('agent-action', {
      agent: this.name,
      action: 'Updated AI provider'
    });
  }
}
