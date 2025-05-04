import { Agent } from "../agent";
import type { EventBus } from "../../comms";
import type { AIProvider } from "../../services/ai/types";
import Tools from "@atoma-agents/sui-agent/src/utils/tools";
import AfterMathTools from "@atoma-agents/sui-agent/src/protocols/aftermath/tools";
import NaviTools from "@atoma-agents/sui-agent/src/protocols/navi/tools";
import type { toolResponse } from "@atoma-agents/sui-agent/src/@types/interface";
import Atoma from "@atoma-agents/sui-agent/src/config/atoma";
import env from "../../env";

export class SuiAgent extends Agent {
  private tools: Tools;
  private taskResults: Map<string, any>;
  private atomaInstance: Atoma;

  constructor(eventBus: EventBus, aiProvider: AIProvider) {
    super("sui-agent", eventBus, aiProvider);
    
    if (!env.ATOMA_API_KEY) {
      throw new Error('ATOMA_API_KEY is required for SUI agent');
    }
    
    this.atomaInstance = new Atoma(env.ATOMA_API_KEY);
    this.tools = new Tools(
      env.ATOMA_API_KEY,
      `You are a SUI blockchain agent. Please analyze the following tools and select the most appropriate one for the given task: \${toolsList}`
    );
    this.taskResults = new Map();
    
    // Register all SUI-related tools
    AfterMathTools.registerTools(this.tools);
    NaviTools.registerTools(this.tools);
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle task manager events
    this.eventBus.on('task-manager-sui-agent', async (data) => {
      try {
        await this.handleEvent('task-manager-sui-agent', data);
      } catch (error) {
        console.error(`[${this.name}] Error handling task manager request:`, error);
        this.eventBus.emit('agent-error', {
          agent: this.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  async handleEvent(event: string, data: any): Promise<void> {
    console.log(`[${this.name}] Handling event: ${event}`, data);

    switch (event) {
      case 'task-manager-sui-agent':
        const { taskId, task, type } = data;
        
        if (type === 'execute') {
          try {
            // Parse the task and execute appropriate SUI operations
            const result = await this.executeSuiTask(task);
            
            // Store result
            this.taskResults.set(taskId, result);
            
            // Notify task manager of completion
            this.eventBus.emit('sui-agent-task-manager', {
              taskId,
              result,
              status: 'completed',
              timestamp: new Date().toISOString()
            });

            // Emit success message
            this.eventBus.emit('agent-message', {
              role: 'assistant',
              content: `Successfully executed SUI task: ${task}`,
              timestamp: new Date().toLocaleTimeString(),
              agentName: this.name,
              collaborationType: 'execution'
            });
          } catch (error) {
            console.error(`[${this.name}] Error executing SUI task:`, error);
            
            // Notify task manager of failure
            this.eventBus.emit('sui-agent-task-manager', {
              taskId,
              error: error instanceof Error ? error.message : 'Unknown error',
              status: 'failed',
              timestamp: new Date().toISOString()
            });
          }
        }
        break;

      default:
        console.log(`[${this.name}] Unhandled event: ${event}`);
    }
  }

  private async executeSuiTask(task: string): Promise<any> {
    if (!this.aiProvider) {
      throw new Error('AI provider not initialized');
    }

    // Use AI to determine which tool to use and how to execute the task
    const response = await this.aiProvider.generateText(
      task,
      this.getSystemPrompt()
    );

    if (!response?.text) {
      throw new Error('No response generated for task');
    }

    // Use Atoma's tool selection
    const toolResponse = await this.tools.selectAppropriateTool(
      this.atomaInstance,
      task
    );

    if (!toolResponse || !toolResponse.selected_tool) {
      throw new Error('No appropriate tool found for task');
    }

    // Execute the selected tool
    const tool = this.tools.getAllTools().find(t => t.name === toolResponse.selected_tool);
    if (!tool) {
      throw new Error(`Tool not found: ${toolResponse.selected_tool}`);
    }

    // Execute the tool with the provided arguments
    const result = await tool.process(...toolResponse.tool_arguments);
    return result;
  }

  private getSystemPrompt(): string {
    return `You are a SUI blockchain agent capable of executing various operations on the SUI network.
Your task is to analyze user requests and determine which SUI operations to execute using the available tools.
Focus on providing accurate and efficient execution of defi actions on sui while maintaining security.`;
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    // Handle completion of each step in the task execution
    console.log(`[${this.name}] Step completed:`, { text, toolCalls, toolResults });
    
    this.eventBus.emit('agent-message', {
      role: 'assistant',
      content: text || 'Step completed successfully',
      timestamp: new Date().toLocaleTimeString(),
      agentName: this.name,
      collaborationType: 'status'
    });
  }
}