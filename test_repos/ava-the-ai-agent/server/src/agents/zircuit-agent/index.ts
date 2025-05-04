import { generateText } from "ai";
import type { EventBus } from "../../comms";
import { Agent } from "../agent";
import { getZircuitToolkit } from "./toolkit";
import { openai } from "@ai-sdk/openai";
import { getZircuitSystemPrompt } from "../../system-prompts";
import { saveThought } from "../../memory";
import type { Account } from "viem";
import type { AIProvider, Tool } from "../../services/ai/types";

export class ZircuitAgent extends Agent {
  private account: Account;
  private tools: Record<string, Tool>;

  constructor(
    name: string, 
    eventBus: EventBus, 
    account: Account,
    aiProvider?: AIProvider
  ) {
    super(name, eventBus, aiProvider);
    this.account = account;
    this.tools = getZircuitToolkit(account);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for task manager events
    this.eventBus.on('task-manager-zircuit', async (data) => {
      console.log(`[${this.name}] ========== RECEIVED TASK MANAGER EVENT ==========`);
      console.log(`[${this.name}] Event: task-manager-zircuit`);
      console.log(`[${this.name}] Task ID: ${data.taskId}`);
      console.log(`[${this.name}] Task Type: ${data.type}`);
      console.log(`[${this.name}] Source: ${data.source}`);
      console.log(`[${this.name}] Timestamp: ${new Date().toISOString()}`);
      
      try {
        await this.handleTaskManagerEvent(data);
      } catch (error) {
        console.error(`[${this.name}] Error handling task:`, error);
        this.eventBus.emit('agent-error', {
          agent: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          taskId: data.taskId,
          timestamp: Date.now()
        });
      }
    });
  }

  private async handleTaskManagerEvent(data: any): Promise<void> {
    const { taskId, task, type } = data;
    
    console.log(`[${this.name}] Processing task: ${task}`);
    console.log(`[${this.name}] Task ID: ${taskId}`);
    console.log(`[${this.name}] Task Type: ${type}`);

    // Notify task manager that we're working on it
    this.eventBus.emit('task-update', {
      taskId,
      status: 'in_progress',
      source: this.name,
      destination: 'task-manager',
      timestamp: Date.now()
    });

    try {
      // Process the task using AI
      const result = await this.processTask(task, taskId);
      
      // Send the result back to the task manager
      this.eventBus.emit('zircuit-task-manager', {
        taskId,
        result,
        status: 'completed',
        timestamp: Date.now()
      });
      
      console.log(`[${this.name}] Task completed: ${taskId}`);
    } catch (error) {
      console.error(`[${this.name}] Error processing task:`, error);
      
      // Notify task manager of failure
      this.eventBus.emit('zircuit-task-manager', {
        taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed',
        timestamp: Date.now()
      });
    }
  }

  private async processTask(task: string, taskId: string): Promise<any> {
    console.log(`[${this.name}] Processing Zircuit task: ${task}`);
    
    try {
      const systemPrompt = getZircuitSystemPrompt();
      
      const result = await generateText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Task ID: ${taskId}\n\nTask: ${task}\n\nPlease analyze this task and determine the appropriate Zircuit operations to perform. The user wants to interact with Zircuit protocols like Zerolend for lending, borrowing, or staking.`
          }
        ],
        tools: this.tools,
        temperature: 0.2,
        maxTokens: 4000,
      });

      // Save the thought process
      await saveThought({ agent : this.name, text : result.text, toolCalls : result.toolCalls, toolResults : result.toolResults});
      
      return {
        text: result.text,
        toolCalls: result.toolCalls,
        toolResults: result.toolResults
      };
    } catch (error) {
      console.error(`[${this.name}] Error in processTask:`, error);
      throw error;
    }
  }

  async handleEvent(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case 'task-manager-zircuit':
          return this.handleTaskManagerEvent(data);
        default:
          console.log(`[${this.name}] Unhandled event: ${event}`);
      }
    } catch (error) {
      console.error(`[${this.name}] Error in handleEvent:`, error);
      this.eventBus.emit('agent-error', {
        agent: this.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    // This method is called after each step of the AI's execution
    console.log(`[${this.name}] Step completed`);
    console.log(`[${this.name}] Tool calls:`, toolCalls?.length || 0);
    console.log(`[${this.name}] Tool results:`, toolResults?.length || 0);
  }
} 