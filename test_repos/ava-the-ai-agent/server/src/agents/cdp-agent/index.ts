import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { IPAgent } from "../types/ip-agent";
import type { EventBus } from "../../comms";
import env from "../../env";
import { StorageInterface } from "../types/storage";
import { ATCPIPProvider } from "../plugins/atcp-ip";
import type { IPLicenseTerms, IPMetadata } from "../types/ip-agent";
import { AIProvider, Tool } from "../../services/ai/types";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import {
  AgentKit,
  cdpApiActionProvider,
  erc20ActionProvider,
  NETWORK_ID_TO_VIEM_CHAIN,
  pythActionProvider,
  ViemWalletProvider,
  walletActionProvider,
  wethActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { cowSwapActionProvider } from "./actions/CowSwap.action";
import { wormholeActionProvider } from "./actions/Wormhole.action";
import { defiActionProvider } from "./actions/Defi.action";
import { HybridStorage } from "../plugins/hybrid-storage";

export class CdpAgent extends IPAgent {
  private agent: ReturnType<typeof createReactAgent> | undefined;
  public eventBus: EventBus;
  private taskResults: Map<string, any>;
  public aiProvider?: AIProvider;
  private currentTaskId: string | null = null;

  constructor(
    name: string,
    eventBus: EventBus,
    storage: StorageInterface,
    atcpipProvider: ATCPIPProvider,
    aiProvider?: AIProvider
  ) {
    super(name, eventBus, storage, atcpipProvider);

    this.eventBus = eventBus;
    this.taskResults = new Map();
    this.aiProvider = aiProvider;

    this.initialize();

    // Setup event handlers
    this.setupEventHandlers();

  }

  async initialize() {
    const agent = await initializeAgent();
    console.log(`[CDP Agent] Agentkit Initialized `);
    this.agent = agent;
  }

  private setupEventHandlers(): void {
    // Subscribe to events relevant to this agent
    this.eventBus.register('task-manager-cdp-agent', (data: any) => this.handleEvent('task-manager-cdp-agent', data));
    this.eventBus.register('task-manager-agentkit', (data: any) => this.handleEvent('task-manager-agentkit', data));
    
    console.log(`[${this.name}] Event handlers set up for CDP agent`);
  }

  async handleEvent(event: string, data: any): Promise<void> {
    // Handle events from other agents
    console.log(`[${this.name}] Received event: ${event}`, data);

    if (event === 'task-manager-agentkit' || event === 'task-manager-cdp-agent') {
      await this.handleTaskManagerRequest(data);
    }
  }

  private async handleTaskManagerRequest(data: any): Promise<void> {
    const { taskId, task, type } = data;

    if (!taskId) {
      console.error(`[${this.name}] No taskId provided in the request`);
      return;
    }

    this.currentTaskId = taskId;
    
    try {
      console.log(`[${this.name}] Processing task: ${task}`);
      
      // Emit an event to the frontend that we're starting to process a task
      this.emitToFrontend({
        type: 'TASK_STARTED',
        taskId,
        message: `Starting to process: ${task}`,
        timestamp: new Date().toISOString()
      });

      // Parse the task to determine what CDP operation to perform
      const result = await this.executeTask(task);

      // Store the result
      this.taskResults.set(taskId, result);

      // Send the result back to the task manager
      this.eventBus.emit('cdp-agent-task-manager', {
        taskId,
        result,
        status: 'completed'
      });

      // Emit an event to the frontend that we've completed the task
      this.emitToFrontend({
        type: 'TASK_COMPLETED',
        taskId,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error(`[${this.name}] Error processing task:`, error);

      // Emit an error event to the frontend
      this.emitToFrontend({
        type: 'TASK_ERROR',
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Send error back to task manager
      this.eventBus.emit('cdp-agent-task-manager', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed'
      });
    }
    
    this.currentTaskId = null;
  }

  /**
   * Emit an event to the frontend with the given data
   */
  private emitToFrontend(data: any): void {
    // Add source information
    const eventData = {
      ...data,
      source: this.name,
    };
    
    // Emit the event to the frontend via the event bus
    this.eventBus.emit('frontend-event', eventData);
    console.log(`[${this.name}] Emitted frontend event:`, eventData.type);
  }

  private async executeTask(task: string): Promise<any> {
    console.log(`[${this.name}] Executing task as text: "${task}"`);
    
    try {
      // Process the text message directly instead of trying to parse it as JSON
      const response = await this.processMessage(task);
      console.log(`[${this.name}] Response from the cdp agent:`, response);
      return response;
    } catch (error: unknown) {
      console.error(`[${this.name}] Error processing message:`, error);
      throw new Error(`Failed to process task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async parseTaskWithAI(task: string): Promise<{ operation: string, params: any }> {
    // Use AI to extract structured operation and parameters from natural language
    if (!this.aiProvider) {
      throw new Error("AI provider not initialized");
    }
    
    try {
      const systemPrompt = `You are a CDP (Coinbase Developer Platform) agent specialized in blockchain operations.
Your task is to extract structured information from user requests about blockchain operations.`;
      
      const userPrompt = `
      Extract the operation details from this request:
      "${task}"
      
      Return a JSON object with the following structure:
      {
        "operation": "bridge/swap/transfer/etc",
        "params": {
          // All relevant parameters like amount, source chain, destination chain, etc.
        }
      }
      `;
      
      const aiResponse = await this.aiProvider.generateText(userPrompt, systemPrompt);
      // Try to parse the AI response as JSON
      try {
        return JSON.parse(aiResponse.text);
      } catch (parseError) {
        // If parsing fails, return a simple object
        return {
          operation: "process",
          params: { message: task }
        };
      }
    } catch (error: unknown) {
      // Default fallback if AI parsing fails
      return {
        operation: "process",
        params: { message: task }
      };
    }
  }

  async processMessage(message: string) {
    console.log(`[${this.name}] processMessage called with: "${message}"`);
    
    // Emit message received event to frontend
    this.emitToFrontend({
      type: 'MESSAGE_RECEIVED',
      taskId: this.currentTaskId,
      message,
      timestamp: new Date().toISOString()
    });
    
    if (!this.agent) {
      console.log(`[${this.name}] Agent not initialized, initializing now...`);
      await this.initialize();
      if (!this.agent) {
        console.error(`[${this.name}] Agent initialization failed`);
        throw new Error("CDP Agent initialization failed");
      }
      console.log(`[${this.name}] Agent initialization successful`);
    }
    
    try {
      console.log(`[${this.name}] Starting stream with message`);
      const stream = await this.agent.stream(
        { messages: [{ role: "user", content: message }] },
        { configurable: { thread_id: "AgentKit Discussion" } }
      );
      console.log(`[${this.name}] Stream created successfully`);

      // Emit stream started event
      this.emitToFrontend({
        type: 'STREAM_STARTED',
        taskId: this.currentTaskId,
        timestamp: new Date().toISOString()
      });

      let responseMessage = "";
      console.log(`[${this.name}] Beginning to process stream chunks`);
      
      try {
        for await (const chunk of stream) {
          console.log(`[${this.name}] Received chunk type: ${Object.keys(chunk).join(', ')}`);
          
          if ("agent" in chunk) {
            console.log(`[${this.name}] Processing agent chunk`);
            responseMessage = chunk.agent.messages[0].content;
            console.log(`[${this.name}] Agent response: ${responseMessage.substring(0, 100)}...`);

            // Emit agent thinking event
            this.emitToFrontend({
              type: 'AGENT_THINKING',
              taskId: this.currentTaskId,
              content: responseMessage,
              timestamp: new Date().toISOString()
            });

            // try {
            //   // License the agent's response
            //   const responseLicenseTerms: IPLicenseTerms = {
            //     name: `CDP Agent Response - ${Date.now()}`,
            //     description: "License for CDP agent's response to user message",
            //     scope: 'commercial',
            //     transferability: true,
            //     onchain_enforcement: true,
            //     royalty_rate: 0.05
            //   };

            //   console.log(`[${this.name}] Minting license for agent response`);
            //   const licenseId = await this.mintLicense(responseLicenseTerms, {
            //     issuer_id: this.name,
            //     holder_id: 'user',
            //     issue_date: Date.now(),
            //     version: '1.0'
            //   });
            //   console.log(`[${this.name}] License minted with ID: ${licenseId}`);

            //   // Store response with license
            //   console.log(`[${this.name}] Storing intelligence for agent response`);
            //   await this.storeIntelligence(`response:${Date.now()}`, {
            //     message: responseMessage,
            //     licenseId,
            //     timestamp: Date.now()
            //   });
            //   console.log(`[${this.name}] Intelligence stored successfully`);
            // } catch (licenseError) {
            //   console.error(`[${this.name}] Error in licensing agent response:`, licenseError);
            //   // Continue despite licensing error
            // }

          } else if ("tools" in chunk) {
            console.log(`[${this.name}] Processing tools chunk`);
            responseMessage = chunk.tools.messages[0].content;
            console.log(`[${this.name}] Tools response: ${responseMessage.substring(0, 100)}...`);
            console.log(`[${this.name}] Tool execution details:`, JSON.stringify(chunk.tools.toolsExecutionHistory || {}, null, 2));

            // Emit tool execution event with details
            this.emitToFrontend({
              type: 'TOOL_EXECUTION',
              taskId: this.currentTaskId,
              content: responseMessage,
              toolDetails: chunk.tools.toolsExecutionHistory || {},
              timestamp: new Date().toISOString()
            });

            // try {
            //   // License the tool result
            //   const toolResultLicenseTerms: IPLicenseTerms = {
            //     name: `CDP Tool Result - ${Date.now()}`,
            //     description: "License for CDP tool execution result",
            //     scope: 'commercial',
            //     transferability: true,
            //     onchain_enforcement: true,
            //     royalty_rate: 0.05
            //   };

            //   console.log(`[${this.name}] Minting license for tool result`);
            //   const licenseId = await this.mintLicense(toolResultLicenseTerms, {
            //     issuer_id: this.name,
            //     holder_id: 'user',
            //     issue_date: Date.now(),
            //     version: '1.0'
            //   });
            //   console.log(`[${this.name}] License minted with ID: ${licenseId}`);

            //   // Store tool result with license
            //   console.log(`[${this.name}] Storing intelligence for tool result`);
            //   await this.storeIntelligence(`tool:${Date.now()}`, {
            //     result: responseMessage,
            //     licenseId,
            //     timestamp: Date.now()
            //   });
            //   console.log(`[${this.name}] Intelligence stored successfully`);
            // } catch (licenseError) {
            //   console.error(`[${this.name}] Error in licensing tool result:`, licenseError);
            //   // Continue despite licensing error
            // }
          }
        }
      } catch (streamError) {
        console.error(`[${this.name}] Error processing stream chunks:`, streamError);
        
        // Emit stream error event
        this.emitToFrontend({
          type: 'STREAM_ERROR',
          taskId: this.currentTaskId,
          error: streamError instanceof Error ? streamError.message : String(streamError),
          timestamp: new Date().toISOString()
        });
        
        // If we have a partial response, return it, otherwise rethrow
        if (responseMessage) {
          return `Partial response (error occurred): ${responseMessage}`;
        }
        throw streamError;
      }

      console.log(`[${this.name}] Stream processing complete`);
      console.log(`[${this.name}] Final response message:`, responseMessage);
      
      // Emit final response event
      this.emitToFrontend({
        type: 'FINAL_RESPONSE',
        taskId: this.currentTaskId,
        content: responseMessage,
        timestamp: new Date().toISOString()
      });
      
      return responseMessage;
    } catch (error) {
      console.error(`[${this.name}] Error in processMessage:`, error);
      if (error instanceof Error) {
        console.error(`[${this.name}] Error stack:`, error.stack);
      }
      
      // Emit error event
      this.emitToFrontend({
        type: 'PROCESSING_ERROR',
        taskId: this.currentTaskId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      return `Error processing your request: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    console.log(
      `[cdp-agent] step finished. tools called: ${toolCalls?.length > 0
        ? toolCalls.map((tool: any) => tool.toolName).join(", ")
        : "none"
      }`
    );

    // Emit step finish event
    this.emitToFrontend({
      type: 'STEP_FINISHED',
      taskId: this.currentTaskId,
      text,
      toolCalls: toolCalls?.map((tool: any) => tool.toolName) || [],
      timestamp: new Date().toISOString()
    });

    if (text) {
      console.log("i m on the step finish");
      // Store chain of thought with license
      const thoughtLicenseTerms: IPLicenseTerms = {
        name: `CDP Chain of Thought - ${Date.now()}`,
        description: "License for CDP agent's chain of thought",
        scope: 'commercial',
        transferability: true,
        onchain_enforcement: true,
        royalty_rate: 0.05
      };

      const licenseId = await this.mintLicense(thoughtLicenseTerms, {
        issuer_id: this.name,
        holder_id: 'user',
        issue_date: Date.now(),
        version: '1.0'
      });

      await this.storeChainOfThought(`thought:${Date.now()}`, [text], {
        toolCalls: toolCalls || [],
        toolResults: toolResults || [],
        licenseId
      });
    }
  }
}

/**
 * Initialize the agent with CDP AgentKit
 *
 * @returns Agent executor and config
 */
export async function initializeAgent() {
  //   Initialize LLM
  const groqModel = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
  });

  const account = privateKeyToAccount(
    env.PRIVATE_KEY as `0x${string}`
  );

  const networkId = env.NETWORK_ID

  const client = createWalletClient({
    account,
    chain: NETWORK_ID_TO_VIEM_CHAIN[networkId],
    transport: http(),
  });
  const walletProvider = await new ViemWalletProvider(client);

  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      wethActionProvider(),
      pythActionProvider(),
      wormholeActionProvider(),
      walletActionProvider(),
      erc20ActionProvider(),
      defiActionProvider(),
      cowSwapActionProvider(),
      // The CDP API Action Provider provides faucet functionality on base-sepolia. Can be removed if you do not need this functionality.
      cdpApiActionProvider({
        apiKeyName: env.CDP_API_KEY_NAME,
        apiKeyPrivateKey: env.CDP_API_KEY_PRIVATE_KEY,
      }),
    ],
  });

  try {
    // Get LangChain-compatible tools
    const agentTools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();

    // Create the agent - we're wrapping this in a try/catch to handle type issues
    console.log("[CDP Agent] Creating agent with LangChain tools");
    
    // Type assertion to handle compatibility with createReactAgent
    const agent = createReactAgent({
      llm: groqModel as any,
      tools: agentTools as any, 
      checkpointSaver: memory as any,
      messageModifier: `
              You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
              empowered to interact onchain using your tools.
              Remember to use:
              - Cow Swap when user asks to swap/change/exchage from one token to another token.
              - Wormhole Transfer and Redeem when user asks to bridge or transfer native token from one chain to another Chain.
              Before executing your first action, get the wallet details to see what network 
              you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. 
              If user ask for some action that is not mentioned or tools that is not present ask the user to try something else.
              `,
    });

    console.log("[CDP Agent] Agent creation successful");
    return agent;
  } catch (error) {
    console.error("[CDP Agent] Error creating agent:", error);
    throw new Error(`Failed to initialize CDP agent: ${error instanceof Error ? error.message : String(error)}`);
  }
}
