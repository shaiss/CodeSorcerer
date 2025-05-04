import { generateText } from "ai";
import type { EventBus } from "../../comms";
import {
  getTaskManagerFinalReportSystemPrompt,
  getTaskManagerSystemPrompt,
} from "../../system-prompts";
import { IPAgent } from "../types/ip-agent";
import { openai } from "@ai-sdk/openai";
import { getTaskManagerToolkit } from "./toolkit";
import { saveThought, storeReport } from "../../memory";
import env from "../../env";
import { v4 as uuidv4 } from 'uuid';
import type { AIProvider, Tool } from "../../services/ai/types";
import type { Account } from "viem";
import { StorageInterface } from "../types/storage";
import { ATCPIPProvider } from "../plugins/atcp-ip";
import type { IPLicenseTerms, IPMetadata } from "../types/ip-agent";

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  result?: any;
  error?: string;
  toolResults?: any[];
  licenseId?: string;
  timestamp: string;
  operationType?: string;
  selectedChain?: {
    id: string;
    name: string;
    icon: string;
    agentId: string;
  };
}

/**
 * @dev The task manager agent is responsible for generating tasks to be executed.
 */
export class TaskManagerAgent extends IPAgent {
  private tasks: Map<string, Task> = new Map();
  private tools: Record<string, Tool>;
  private account: Account;

  /**
   * @param name - The name of the agent
   * @param eventBus - The event bus to emit events to other agents
   * @param account - The account associated with the agent
   * @param storage - The storage interface
   * @param atcpipProvider - The ATCPIP provider plugin
   */
  constructor(
    name: string,
    eventBus: EventBus,
    account: Account,
    storage: StorageInterface,
    atcpipProvider: ATCPIPProvider
  ) {
    super(name, eventBus, storage, atcpipProvider);
    this.account = account;
    this.tools = getTaskManagerToolkit(eventBus);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for hedera agent responses
    this.eventBus.register('hedera-task-manager', async (data: any) => {
      await this.handleHederaResult(data);
    });

    // Listen for executor agent responses
    this.eventBus.register('executor-task-manager', async (data: any) => {
      await this.handleExecutorResult(data);
    });

    // Listen for observer agent responses
    this.eventBus.register('observer-task-manager', async (data: any) => {
      await this.handleObserverResult(data);
    });
    
    // Listen for CDP agent responses
    this.eventBus.register('cdp-agent-task-manager', async (data: any) => {
      await this.handleCDPResult(data);
    });

    // Listen for task updates
    this.eventBus.on('task-update', async (data) => {
      console.log(`[${this.name}] ========== TASK UPDATE ==========`);
      console.log(`[${this.name}] Task ID: ${data.taskId}`);
      console.log(`[${this.name}] Status: ${data.status}`);
      console.log(`[${this.name}] Source: ${data.source}`);
      console.log(`[${this.name}] Destination: ${data.destination}`);
      console.log(`[${this.name}] Timestamp: ${new Date().toISOString()}`);
    });
  }

  private async handleExecutorResult(data: any): Promise<void> {
    console.log(`[${this.name}] ========== Handling Executor Result ==========`);
    console.log(`[${this.name}] Received result from executor for task: ${data.taskId}`);
    console.log(`[${this.name}] Result status: ${data.status}`);
    
    try {
      let task = this.tasks.get(data.taskId);
      
      if (!task) {
        console.warn(`[${this.name}] Task ${data.taskId} not found in memory, attempting recovery`);
        try {
          const storedTask = await this.storage.retrieve(`task:${data.taskId}`);
          if (storedTask.data) {
            task = storedTask.data as Task;
            this.tasks.set(data.taskId, task);
            console.log(`[${this.name}] Successfully recovered task ${data.taskId} from storage`);
          } else {
            throw new Error('Task not found in storage');
          }
        } catch (error) {
          console.error(`[${this.name}] Failed to recover task ${data.taskId}:`, error);
          // Create a new task if recovery fails
          task = {
            id: data.taskId,
            description: data.task || 'Unknown task',
            status: 'pending',
            timestamp: new Date().toISOString()
          };
          this.tasks.set(data.taskId, task);
          console.log(`[${this.name}] Created new task ${data.taskId} for untracked result`);
        }
      }

      // Store result in Recall with detailed logging
      console.log(`[${this.name}] Storing execution result in Recall for task: ${data.taskId}`);
      await this.storeIntelligence(`execution:${data.taskId}`, {
        result: data.result,
        status: data.status,
        toolResults: data.toolResults,
        error: data.error,
        timestamp: Date.now()
      });
      console.log(`[${this.name}] Successfully stored execution result`);

      // Update task status with logging
      console.log(`[${this.name}] Updating task status to: ${data.status}`);
      task.status = data.status;
      task.result = data.result;
      task.error = data.error;
      task.toolResults = data.toolResults;
      this.tasks.set(data.taskId, task);

      // Store task update in Recall
      console.log(`[${this.name}] Storing updated task in Recall`);
      await this.storeIntelligence(`task:${data.taskId}`, {
        ...task,
        timestamp: Date.now()
      });
      
      // Mint NFT for completed tasks using Story Protocol
      if (data.status === 'completed' && data.result) {
        try {
          console.log(`[${this.name}] ========== Minting NFT for completed task ==========`);
          
          // Prepare license terms
          const terms: IPLicenseTerms = {
            name: `Task Completion: ${task.description.substring(0, 50)}...`,
            description: `This NFT represents the successful completion of task ${data.taskId} by the AVA Portfolio Manager AI agent system.`,
            scope: 'commercial',
            transferability: true,
            duration: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
            royalty_rate: 0.05, // 5% royalty
            rev_share: 0.05, // 5% revenue share
            onchain_enforcement: true,
            ip_restrictions: ['No derivatives without attribution']
          };
          
          // Prepare metadata
          const metadata: IPMetadata = {
            issuer_id: this.name,
            holder_id: 'AVA Portfolio Manager',
            issue_date: Date.now(),
            version: '1.0',
            link_to_terms: `https://ava-portfolio-manager.io/licenses/${data.taskId}`
          };
          
          // Mint the license
          const licenseId = await this.mintLicense(terms, metadata);
          console.log(`[${this.name}] Successfully minted NFT with license ID: ${licenseId}`);
          
          // Update task with license information
          task.licenseId = licenseId;
          this.tasks.set(data.taskId, task);
          
          // Store updated task with license info
          await this.storeIntelligence(`task:${data.taskId}`, {
            ...task,
            licenseId,
            timestamp: Date.now()
          });
          
          console.log(`[${this.name}] Task ${data.taskId} updated with license ID: ${licenseId}`);
        } catch (error) {
          console.error(`[${this.name}] Error minting NFT for task ${data.taskId}:`, error);
          // Continue execution even if NFT minting fails
        }
      }

      // Emit task update with detailed event
      console.log(`[${this.name}] Emitting task update event`);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: data.status,
        result: data.result,
        error: data.error,
        toolResults: data.toolResults,
        timestamp: Date.now(),
        source: 'executor',
        destination: 'task-manager'
      });

      console.log(`[${this.name}] ========== Executor Result Processing Complete ==========\n`);
    } catch (error) {
      console.error(`[${this.name}] Error handling executor result:`, error);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        source: 'executor',
        destination: 'task-manager'
      });
    }
  }

  private async handleObserverResult(data: any): Promise<void> {
    console.log(`[${this.name}] ========== Handling Observer Result ==========`);
    console.log(`[${this.name}] Received result from observer for task: ${data.taskId}`);
    console.log(`[${this.name}] Result status: ${data.status}`);
    
    try {
      let task = this.tasks.get(data.taskId);
      
      if (!task) {
        console.warn(`[${this.name}] Task ${data.taskId} not found in memory, attempting recovery`);
        try {
          const storedTask = await this.storage.retrieve(`task:${data.taskId}`);
          if (storedTask.data) {
            task = storedTask.data as Task;
            this.tasks.set(data.taskId, task);
            console.log(`[${this.name}] Successfully recovered task ${data.taskId} from storage`);
          } else {
            throw new Error('Task not found in storage');
          }
        } catch (error) {
          console.error(`[${this.name}] Failed to recover task ${data.taskId}:`, error);
          return;
        }
      }

      // Store result in Recall with detailed logging
      console.log(`[${this.name}] Storing observation result in Recall for task: ${data.taskId}`);
      await this.storeIntelligence(`observation:${data.taskId}`, {
        result: data.result,
        status: data.status,
        toolResults: data.toolResults,
        error: data.error,
        timestamp: Date.now()
      });
      console.log(`[${this.name}] Successfully stored observation result`);

      // Update task status with logging
      console.log(`[${this.name}] Updating task status to: ${data.status}`);
      task.status = data.status;
      task.result = data.result;
      task.error = data.error;
      task.toolResults = data.toolResults;
      this.tasks.set(data.taskId, task);

      // Store task update in Recall with logging
      console.log(`[${this.name}] Storing updated task in Recall`);
      await this.storeIntelligence(`task:${data.taskId}`, {
        ...task,
        timestamp: Date.now()
      });

      // Emit task update with detailed event
      console.log(`[${this.name}] Emitting task update event`);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: data.status,
        result: data.result,
        error: data.error,
        toolResults: data.toolResults,
        timestamp: Date.now(),
        source: 'observer',
        destination: 'task-manager'
      });

      console.log(`[${this.name}] ========== Observer Result Handling Complete ==========\n`);

    } catch (error) {
      console.error(`[${this.name}] Error handling observer result:`, error);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        source: 'observer',
        destination: 'task-manager'
      });
    }
  }

  private async handleCDPResult(data: any): Promise<void> {
    console.log(`[${this.name}] ========== Handling CDP Agent Result ==========`);
    console.log(`[${this.name}] Received result from CDP agent for task: ${data.taskId}`);
    console.log(`[${this.name}] Result status: ${data.status}`);
    
    try {
      let task = this.tasks.get(data.taskId);
      
      if (!task) {
        console.warn(`[${this.name}] Task ${data.taskId} not found in memory, attempting recovery`);
        try {
          const storedTask = await this.storage.retrieve(`task:${data.taskId}`);
          if (storedTask.data) {
            task = storedTask.data as Task;
            this.tasks.set(data.taskId, task);
            console.log(`[${this.name}] Successfully recovered task ${data.taskId} from storage`);
          } else {
            throw new Error('Task not found in storage');
          }
        } catch (error) {
          console.error(`[${this.name}] Failed to recover task ${data.taskId}:`, error);
          // Create a new task if recovery fails
          task = {
            id: data.taskId,
            description: data.task || 'Unknown task',
            status: 'pending',
            timestamp: new Date().toISOString()
          };
          this.tasks.set(data.taskId, task);
          console.log(`[${this.name}] Created new task ${data.taskId} for untracked result`);
        }
      }

      // Store result in Recall with detailed logging
      console.log(`[${this.name}] Storing CDP execution result in Recall for task: ${data.taskId}`);
      await this.storeIntelligence(`cdp-execution:${data.taskId}`, {
        result: data.result,
        status: data.status,
        toolResults: data.toolResults,
        error: data.error,
        timestamp: Date.now()
      });
      console.log(`[${this.name}] Successfully stored CDP execution result`);

      // Update task status with logging
      console.log(`[${this.name}] Updating task status to: ${data.status}`);
      task.status = data.status;
      task.result = data.result;
      task.error = data.error;
      task.toolResults = data.toolResults;
      this.tasks.set(data.taskId, task);

      // Store task update in Recall
      console.log(`[${this.name}] Storing updated task in Recall`);
      await this.storeIntelligence(`task:${data.taskId}`, {
        ...task,
        timestamp: Date.now()
      });

      // Format and send the result to the client
      const formattedResult = {
        type: 'cdp-agent-response',
        taskId: data.taskId,
        status: data.status,
        message: typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2),
        result: data.result,
        timestamp: new Date().toLocaleTimeString(),
        role: 'assistant',
        agentName: 'CDP Agent'
      };

      // Emit the formatted result to the client through the event bus
      this.eventBus.emit('agent-message', formattedResult);
      
      // Emit task update with detailed event
      console.log(`[${this.name}] Emitting task update event`);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: data.status,
        result: data.result,
        error: data.error,
        toolResults: data.toolResults,
        timestamp: Date.now(),
        source: 'cdp-agent',
        destination: 'task-manager'
      });

      console.log(`[${this.name}] ========== CDP Agent Result Handling Complete ==========\n`);

    } catch (error) {
      console.error(`[${this.name}] Error handling CDP agent result:`, error);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        source: 'cdp-agent',
        destination: 'task-manager'
      });
    }
  }

  private async handleHederaResult(data: any): Promise<void> {
    console.log(`[${this.name}] ========== Handling Hedera Agent Result ==========`);
    console.log(`[${this.name}] Received result from Hedera agent for task: ${data.taskId}`);
    console.log(`[${this.name}] Result status: ${data.status}`);
    
    try {
      let task = this.tasks.get(data.taskId);
      
      if (!task) {
        console.warn(`[${this.name}] Task ${data.taskId} not found in memory, attempting recovery`);
        try {
          const storedTask = await this.storage.retrieve(`task:${data.taskId}`);
          if (storedTask.data) {
            task = storedTask.data as Task;
            this.tasks.set(data.taskId, task);
            console.log(`[${this.name}] Successfully recovered task ${data.taskId} from storage`);
          } else {
            throw new Error('Task not found in storage');
          }
        } catch (error) {
          console.error(`[${this.name}] Failed to recover task ${data.taskId}:`, error);
          // Create a new task if recovery fails
          task = {
            id: data.taskId,
            description: data.task || 'Unknown task',
            status: 'pending',
            timestamp: new Date().toISOString()
          };
          this.tasks.set(data.taskId, task);
          console.log(`[${this.name}] Created new task ${data.taskId} for untracked result`);
        }
      }

      // Store result in Recall with detailed logging
      console.log(`[${this.name}] Storing Hedera execution result in Recall for task: ${data.taskId}`);
      await this.storeIntelligence(`hedera-execution:${data.taskId}`, {
        result: data.result,
        status: data.status,
        toolResults: data.toolResults,
        error: data.error,
        timestamp: Date.now()
      });
      console.log(`[${this.name}] Successfully stored Hedera execution result`);

      // Update task status with logging
      console.log(`[${this.name}] Updating task status to: ${data.status}`);
      task.status = data.status;
      task.result = data.result;
      task.error = data.error;
      task.toolResults = data.toolResults;
      this.tasks.set(data.taskId, task);

      // Store task update in Recall
      console.log(`[${this.name}] Storing updated task in Recall`);
      await this.storeIntelligence(`task:${data.taskId}`, {
        ...task,
        timestamp: Date.now()
      });

      // Format and send the result to the client
      const formattedResult = {
        type: 'hedera-response',
        taskId: data.taskId,
        status: data.status,
        message: typeof data.result === 'string' ? data.result : JSON.stringify(data.result, null, 2),
        result: data.result,
        timestamp: new Date().toLocaleTimeString(),
        role: 'assistant',
        agentName: 'Hedera Agent'
      };

      // Emit the formatted result to the client through the event bus
      this.eventBus.emit('agent-message', formattedResult);
      
      // Emit task update with detailed event
      console.log(`[${this.name}] Emitting task update event`);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: data.status,
        result: data.result,
        error: data.error,
        toolResults: data.toolResults,
        timestamp: Date.now(),
        source: 'hedera-agent',
        destination: 'task-manager'
      });

      console.log(`[${this.name}] ========== Hedera Agent Result Handling Complete ==========\n`);

    } catch (error) {
      console.error(`[${this.name}] Error handling Hedera agent result:`, error);
      this.eventBus.emit('task-update', {
        taskId: data.taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        source: 'hedera-agent',
        destination: 'task-manager'
      });
    }
  }

  async createTask(description: string, options?: { 
    targetAgent?: string; 
    operationType?: string;
    selectedChain?: {
      id: string;
      name: string;
      icon: string;
      agentId: string;
    };
  }): Promise<string> {
    const taskId = uuidv4();  // Use UUID for consistent task IDs
    console.log(`[${this.name}] Creating new task with ID: ${taskId} and description: ${description}`);
    
    const task: Task = {
      id: taskId,
      description,
      status: 'pending',
      timestamp: new Date().toISOString(),
      assignedTo: options?.targetAgent,
      operationType: options?.operationType,
      selectedChain: options?.selectedChain
    };

    try {
      // Store task in memory first
      this.tasks.set(taskId, task);
      console.log(`[${this.name}] Task ${taskId} stored in memory`);

      // Then store in Recall
      // await this.storeIntelligence(`task:${taskId}`, {
      //   ...task,
      //   timestamp: Date.now()
      // });
      console.log(`[${this.name}] Task ${taskId} stored in Recall`);

      return taskId;
    } catch (error) {
      console.error(`[${this.name}] Error creating task ${taskId}:`, error);
      // Clean up memory if storage fails
      this.tasks.delete(taskId);
      throw error;
    }
  }

  // Get a task by ID
  async getTaskById(taskId: string): Promise<Task | null> {
    let task = this.tasks.get(taskId);
    
    if (!task) {
      console.warn(`[${this.name}] Task ${taskId} not found in memory, attempting recovery`);
      try {
        // Use the retrieveIntelligence method with enhanced error handling
        const storedTask = await this.retrieveIntelligence(`task:${taskId}`);
        if (storedTask && storedTask.data) {
          task = storedTask.data as Task;
          this.tasks.set(taskId, task);
          console.log(`[${this.name}] Successfully recovered task ${taskId} from storage`);
          return task;
        }
      } catch (error: any) {
        console.log(`[${this.name}] Failed to recover task ${taskId}: ${error.message}`);
        if (this.eventBus) {
          this.eventBus.emit("agent-error", {
            agent: this.name,
            error: `Task recovery failure (non-critical): ${error.message}`
          });
        }
      }
      console.log(`[${this.name}] Task ${taskId} not found or could not be recovered, creating a new empty task`);
      // Instead of returning null, create a new empty task
      const newTask: Task = {
        id: taskId,
        status: 'pending',
        description: 'Task created during recovery (original details lost)',
        assignedTo: undefined,
        result: undefined,
        timestamp: new Date().toISOString()
      };
      this.tasks.set(taskId, newTask);
      return newTask;
    }
    
    return task;
  }

  public async assignTask(task: Task): Promise<void> {
    console.log(`[${this.name}] ========= ASSIGNING TASK =========`);
    console.log(`[${this.name}] Task ID: ${task.id}`);

    let agentType = 'observer'; // Default agent
    
    // If task already has an assigned agent, use that
    if (task.assignedTo) {
      agentType = task.assignedTo;
      console.log(`[${this.name}] Using pre-assigned agent: ${agentType}`);
    }
    // If a specific chain is selected, use its agent
    else if (task.selectedChain && task.selectedChain.agentId) {
      agentType = task.selectedChain.agentId;
      console.log(`[${this.name}] Using chain-specific agent: ${agentType} for chain: ${task.selectedChain.name}`);
    }
    // Check if the task is related to Hedera
    else if (task.description.toLowerCase().includes('hedera')) {
      agentType = 'hedera-agent';
    }
    // Check if the task is related to CDP
    else if (task.description.toLowerCase().includes('cdp')) {
      agentType = 'cdp-agent';
      console.log(`[${this.name}] Detected CDP-related task, routing to CDP agent`);
    }
    
    console.log(`[${this.name}] Assigning to: ${agentType}`);
    console.log(`[${this.name}] Timestamp: ${new Date().toISOString()}`);

    task.assignedTo = agentType;
    task.status = 'in_progress';
    this.tasks.set(task.id, task);

    // Store task assignment in Recall
    await this.storeIntelligence(`assignment:${task.id}`, {
      taskId: task.id,
      assignedTo: agentType,
      status: 'in_progress',
      timestamp: Date.now()
    });

    // Store updated task in Recall
    await this.storeIntelligence(`task:${task.id}`, {
      ...task,
      timestamp: Date.now()
    });

    // Emit task to appropriate agent with enhanced logging
    console.log(`[${this.name}] ========== EMITTING TASK TO ${agentType.toUpperCase()} ==========`);
    
    if (agentType === 'hedera-agent') {
      // Use the hedera-agent event for Hedera tasks
      this.eventBus.emit('hedera-agent', {
        type: 'hedera-agent',
        action: 'process-task',
        taskId: task.id,
        task: task
      });
    } else if (agentType === 'sonic-agent') {
      // Use the sonic-agent event for Sonic tasks
      this.eventBus.emit('sonic-agent', {
        type: 'sonic-agent',
        action: 'process-task',
        taskId: task.id,
        task: task
      });
    } else {
      // Use the original format for other agents
      this.eventBus.emit(`task-manager-${agentType}`, {
        taskId: task.id,
        task: task.description,
        type: agentType === 'observer' ? 'analyze' : 'execute',
        timestamp: Date.now(),
        source: 'task-manager',
        destination: agentType
      });
    }
    
    console.log(`[${this.name}] Task ${task.id} emitted to ${agentType}`);
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    if (text) {
      // Store chain of thought in Recall
      await this.storeChainOfThought(`thought:${Date.now()}`, [text], {
        toolCalls: toolCalls || [],
        toolResults: toolResults || []
      });

      await saveThought({
        agent: "task-manager",
        text,
        toolCalls: toolCalls || [],
        toolResults: toolResults || []
      });
    }
  }

  private async processAnalysis(taskData: Task): Promise<string> {
    try {
      if (!this.aiProvider) {
        throw new Error('AI provider not initialized');
      }

      console.log(`[${this.name}] ========== Starting Analysis Processing ==========`);
      console.log(`[${this.name}] Processing analysis for task: ${taskData.id}`);

      // Check if this is a SUI-related task
      const isSuiTask = taskData.description.toLowerCase().includes('sui');
      
      if (isSuiTask) {
        console.log(`[${this.name}] Detected SUI-related task, forwarding to SUI agent...`);
        
        // Execute SUI agent tool
        const suiResult = await this.tools.sendMessageToSuiAgent.execute({
          message: taskData.description,
          taskId: taskData.id
        }, {
          toolCallId: `sui-${taskData.id}`,
          messages: [],
          severity: 'info'
        });

        // Update task status
        taskData.status = 'completed';
        taskData.result = suiResult;
        this.tasks.set(taskData.id, taskData);

        // Save the thought
        await saveThought({
          agent: this.name,
          text: `Forwarded SUI task to SUI agent: ${taskData.description}`,
          toolCalls: [],
          toolResults: [suiResult]
        });

        return `Task has been forwarded to the SUI agent for execution: ${taskData.description}`;
      }

      // Execute tools from toolkit for non-SUI tasks
      console.log(`[${this.name}] ========== Starting Tool Execution for non SUI tasks==========`);
      const toolResults = [];

      // Send message to observer
      console.log(`[${this.name}] Executing sendMessageToObserver tool...`);
      const observerResult = await this.tools.sendMessageToObserver.execute({
        message: taskData.description,
        taskId: taskData.id
      }, {
        toolCallId: `observer-${taskData.id}`,
        messages: [],
        severity: 'info'
      });
      toolResults.push({
        tool: 'sendMessageToObserver',
        result: observerResult
      });

      if (observerResult.success) {
        this.eventBus.emit('agent-message', {
          role: 'assistant',
          content: `Observer Analysis Request:\n${JSON.stringify(observerResult.result, null, 2)}`,
          timestamp: new Date().toLocaleTimeString(),
          agentName: this.name,
          collaborationType: 'tool-result'
        });
      }

      // Send message to executor if action needed
      if (taskData.status === 'in_progress') {
        console.log(`[${this.name}] Executing sendMessageToExecutor tool...`);
        const executorResult = await this.tools.sendMessageToExecutor.execute({
          message: taskData.description,
          taskId: taskData.id
        }, {
          toolCallId: `executor-${taskData.id}`,
          messages: [],
          severity: 'info'
        });
        toolResults.push({
          tool: 'sendMessageToExecutor',
          result: executorResult
        });

        if (executorResult.success) {
          this.eventBus.emit('agent-message', {
            role: 'assistant',
            content: `Executor Task Request:\n${JSON.stringify(executorResult.result, null, 2)}`,
            timestamp: new Date().toLocaleTimeString(),
            agentName: this.name,
            collaborationType: 'tool-result'
          });
        }
      }

      console.log(`[${this.name}] ========== Tool Execution Complete ==========`);
      console.log(`[${this.name}] Tool Results:`, JSON.stringify(toolResults, null, 2));

      // Generate final analysis using AI
      console.log(`[${this.name}] Generating final analysis...`);
      const response = await this.aiProvider.generateText(
        `Process this task and tool results to generate specific executable actions:\nTask: ${taskData.description}\nTool Results: ${JSON.stringify(toolResults, null, 2)}`,
        this.getSystemPrompt()
      );

      // Update task status
      taskData.status = 'completed';
      taskData.result = response.text;
      this.tasks.set(taskData.id, taskData);

      // Save the thought
      await saveThought({
        agent: this.name,
        text: response.text,
        toolCalls: response.toolCalls || [],
        toolResults
      });

      return response.text;

    } catch (error) {
      taskData.status = 'failed';
      this.tasks.set(taskData.id, taskData);
      throw error;
    }
  }

  private getSystemPrompt(): string {
    return `You are a task manager agent responsible for:
1. Analyzing tasks from the observer agent
2. Detecting and routing SUI blockchain tasks to the SUI agent
3. Breaking down complex tasks into executable steps
4. Coordinating with the executor agent
5. Maintaining task state and progress
6. Handling errors and retries

For any tasks related to SUI blockchain operations, make sure to route them to the SUI agent.
Please process the given task and provide clear, executable instructions.`;
  }

  updateAIProvider(newProvider: AIProvider): void {
    if (this.aiProvider) {
      this.aiProvider = newProvider;
      this.eventBus.emit("agent-action", {
        agent: this.name,
        action: "Updated AI provider"
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

  async handleEvent(event: string, data: any): Promise<void> {
    try {
      switch (event) {
        case 'executor-task-manager':
          await this.handleExecutorResult(data);
          break;
        case 'observer-task-manager':
          await this.handleObserverResult(data);
          break;
        case 'cdp-agent-task-manager':
          await this.handleCDPResult(data);
          break;
        case 'hedera-task-manager':
          await this.handleHederaResult(data);
          break;
        case 'sonic-agent-task-manager':
          // Handle Sonic agent results
          console.log(`[${this.name}] Received result from Sonic agent:`, data);
          // Process the result similar to other agent handlers
          break;
        default:
          // Check if this is a chain-specific agent result
          if (event.endsWith('-task-manager')) {
            console.log(`[${this.name}] Received result from chain-specific agent: ${event}`);
            // Process the result similar to other agent handlers
          } else {
            console.log(`[${this.name}] Unhandled event: ${event}`);
          }
      }
    } catch (error) {
      console.error(`[${this.name}] Error handling event:`, error);
      this.eventBus.emit('agent-error', {
        agent: this.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
