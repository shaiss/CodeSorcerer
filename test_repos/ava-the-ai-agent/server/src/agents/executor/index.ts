import { generateText } from "ai";
import type { EventBus } from "../../comms";
import { IPAgent } from "../types/ip-agent";
import { getExecutorToolkit } from "./toolkit";
import { openai } from "@ai-sdk/openai";
import { getExecutorSystemPrompt } from "../../system-prompts";
import { saveThought } from "../../memory";
import type { Account } from "viem";
import { StorageInterface } from "../types/storage";
import { ATCPIPProvider } from "../plugins/atcp-ip";
import type { IPLicenseTerms, IPMetadata } from "../types/ip-agent";

// Task types
type TaskType = 'defi_execution' | 'observation' | 'analysis' | 'unknown';

export class ExecutorAgent extends IPAgent {
  private account: Account;

  constructor(
    name: string, 
    eventBus: EventBus, 
    account: Account,
    storage: StorageInterface,
    atcpipProvider: ATCPIPProvider
  ) {
    super(name, eventBus, storage, atcpipProvider);
    this.account = account;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for task manager events
    this.eventBus.on('task-manager-executor', async (data) => {
      console.log(`[${this.name}] ========== RECEIVED TASK MANAGER EVENT ==========`);
      console.log(`[${this.name}] Event: task-manager-executor`);
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

  private determineTaskType(task: string): TaskType {
    // Keywords that indicate a DeFi execution task
    const defiKeywords = [
      'swap', 'bridge', 'transfer', 'send', 'buy', 'sell',
      'deposit', 'withdraw', 'stake', 'unstake', 'provide liquidity',
      'remove liquidity', 'borrow', 'repay', 'leverage', 'long', 'short'
    ];

    // Keywords that indicate an observation task
    const observationKeywords = [
      'monitor', 'check', 'analyze', 'observe', 'track',
      'get market data', 'get price', 'get balance', 'fetch',
      'retrieve', 'watch', 'review'
    ];

    // Check if task contains DeFi execution keywords
    if (defiKeywords.some(keyword => task.toLowerCase().includes(keyword))) {
      return 'defi_execution';
    }

    // Check if task contains observation keywords
    if (observationKeywords.some(keyword => task.toLowerCase().includes(keyword))) {
      return 'observation';
    }

    // If task contains analysis-related terms
    if (task.toLowerCase().includes('analysis') || task.toLowerCase().includes('report')) {
      return 'analysis';
    }

    return 'unknown';
  }

  async handleEvent(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case 'task-manager-executor':
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

  private async handleTaskManagerEvent(data: any): Promise<void> {
    console.log(`[${this.name}] ========== Starting Task Manager Event Handler ==========`);
    const toolResults: any[] = [];
    const startTime = Date.now();
    const bucketId = `task-bucket-${startTime}`; // Single bucket for entire task
    
    console.log(`[${this.name}] Using bucket ID: ${bucketId}`);
    console.log(`[${this.name}] Task: ${data.task}`);
    console.log(`[${this.name}] Start Time: ${new Date(startTime).toISOString()}`);
    
    try {
      // Validate task data
      if (!data.taskId || !data.task) {
        throw new Error('Invalid task data: missing taskId or task');
      }

      const taskId = data.taskId;
      const taskType = this.determineTaskType(data.task);
      
      console.log(`[${this.name}] Task Type Determined: ${taskType}`);

      // Store task in Recall
      await this.storeIntelligence(`task:${taskId}`, {
        task: data.task,
        timestamp: startTime,
        status: 'in_progress',
        type: taskType,
        bucketId
      });

      // Handle task based on type
      switch (taskType) {
        case 'defi_execution': {
          console.log(`[${this.name}] ========== Processing DeFi Execution Task ==========`);
          const executorTools = getExecutorToolkit(this.account);
          
          // Process DeFi execution task
          console.log(`[${this.name}] Fetching transaction data...`);
          const storeResult = await executorTools.getTransactionData.execute({
            tasks: [{
              task: data.task,
              taskId
            }],
            bucketId
          });

          if (!storeResult.success) {
            throw new Error(`Failed to process DeFi task: ${storeResult.error}`);
          }

          console.log(`[${this.name}] Transaction data fetched successfully`);
          toolResults.push({
            tool: 'getTransactionData',
            result: storeResult.result,
            status: 'success'
          });

          // Store transaction data
          await this.storeIntelligence(`tx:${taskId}`, {
            data: storeResult.result,
            timestamp: Date.now(),
            status: 'pending',
            bucketId
          });

          // Simulate the transaction
          console.log(`[${this.name}] ========== Starting Transaction Simulation ==========`);
          const simulationResult = await executorTools.simulateTasks.execute({
            bucketId
          });
          
          if (simulationResult.success) {
            console.log(`[${this.name}] Transaction simulation completed successfully`);
            toolResults.push({
              tool: 'simulateTasks',
              result: simulationResult.result,
              status: 'success'
            });

            // Store simulation result
            await this.storeIntelligence(`simulation:${taskId}`, {
              result: simulationResult.result,
              timestamp: Date.now(),
              status: 'completed',
              bucketId
            });

            // Send result back to task manager
            console.log(`[${this.name}] ========== Emitting Result to Task Manager ==========`);
            this.eventBus.emit('executor-task-manager', {
              taskId,
              result: simulationResult.result,
              status: 'completed',
              toolResults,
              timestamp: Date.now(),
              source: 'executor',
              destination: 'task-manager'
            });
          } else {
            throw new Error(simulationResult.error || 'Simulation failed');
          }
          break;
        }

        case 'observation': {
          console.log(`[${this.name}] ========== Routing Observation Task ==========`);
          this.eventBus.emit('executor-task-manager', {
            taskId,
            result: 'Task requires observation. Routing to observer.',
            status: 'routing',
            type: 'observation',
            toolResults,
            timestamp: Date.now(),
            source: 'executor',
            destination: 'task-manager'
          });
          break;
        }

        case 'analysis': {
          console.log(`[${this.name}] ========== Routing Analysis Task ==========`);
          this.eventBus.emit('executor-task-manager', {
            taskId,
            result: 'Task requires analysis. Routing back to task manager.',
            status: 'routing',
            type: 'analysis',
            toolResults,
            timestamp: Date.now(),
            source: 'executor',
            destination: 'task-manager'
          });
          break;
        }

        default: {
          console.log(`[${this.name}] ========== Routing Unknown Task Type ==========`);
          this.eventBus.emit('executor-task-manager', {
            taskId,
            result: 'Task type unclear. Please clarify the required action.',
            status: 'routing',
            type: 'unknown',
            toolResults,
            timestamp: Date.now(),
            source: 'executor',
            destination: 'task-manager'
          });
        }
      }

      console.log(`[${this.name}] ========== Task Manager Event Handler Complete ==========\n`);

    } catch (error) {
      console.error(`[${this.name}] Error processing task:`, error);
      
      // Store error in Recall
      await this.storeIntelligence(`error:${data.taskId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        task: data.task,
        toolResults,
        bucketId
      });

      // Send error back to task manager
      console.log(`[${this.name}] ========== Emitting Error to Task Manager ==========`);
      this.eventBus.emit('executor-task-manager', {
        taskId: data.taskId,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed',
        toolResults,
        timestamp: Date.now(),
        source: 'executor',
        destination: 'task-manager'
      });
    }
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    console.log(
      `[executor] step finished. tools called: ${toolCalls.length > 0
        ? toolCalls.map((tool: any) => tool.toolName).join(", ")
        : "none"
      }`
    );
    if (text) {
      // Store thought in Recall
      await this.storeChainOfThought(`thought:${Date.now()}`, [text], {
        toolCalls,
        toolResults
      });

      await saveThought({
        agent: "executor",
        text,
        toolCalls,
        toolResults,
      });
    }
  }
}
