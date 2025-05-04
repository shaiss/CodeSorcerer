import { Request, Response, NextFunction } from 'express';
import { AgentCard, TaskRequest, TaskResponse, TaskState, MessageRole, Message } from '../types/a2a';
import { v4 as uuidv4 } from 'uuid';

/**
 * A2A Protocol Middleware for Express
 * Provides standardized endpoints according to Google's Agent-to-Agent Protocol
 */

// Storage for active tasks
interface TaskStore {
  [taskId: string]: {
    task: TaskResponse;
    processor: (request: TaskRequest) => Promise<TaskResponse>;
  };
}

export class A2AMiddleware {
  private agentCard: AgentCard;
  private tasks: TaskStore = {};
  private taskProcessors: Map<string, (request: TaskRequest) => Promise<TaskResponse>> = new Map();

  constructor(agentCard: AgentCard) {
    this.agentCard = agentCard;
  }

  /**
   * Register a task processor for handling task requests
   * @param processorName Identifier for the processor
   * @param processor Function that processes task requests
   */
  registerTaskProcessor(
    processorName: string, 
    processor: (request: TaskRequest) => Promise<TaskResponse>
  ): void {
    this.taskProcessors.set(processorName, processor);
    console.log(`[A2AMiddleware] Registered task processor: ${processorName}`);
  }

  /**
   * Get the agent card as middleware
   */
  getAgentCard() {
    return (req: Request, res: Response) => {
      res.status(200).json(this.agentCard);
    };
  }

  /**
   * Process a task request
   */
  processTask(processorName: string) {
    return async (req: Request, res: Response) => {
      const processor = this.taskProcessors.get(processorName);
      if (!processor) {
        return res.status(404).json({
          error: `Task processor '${processorName}' not found`
        });
      }

      const taskRequest: TaskRequest = req.body;
      if (!taskRequest || !taskRequest.id || !taskRequest.message) {
        return res.status(400).json({
          error: 'Invalid task request format'
        });
      }

      try {
        // Create initial task with pending status
        const initialTask: TaskResponse = {
          id: taskRequest.id,
          status: { state: TaskState.PENDING },
          messages: [taskRequest.message]
        };

        // Store task and processor
        this.tasks[taskRequest.id] = {
          task: initialTask,
          processor
        };

        // Process the task (this can be immediate or async)
        const processingPromise = this.processTaskAsync(taskRequest, processor);

        // If agent supports streaming, we would handle differently
        // For now, we'll just wait for the result and return
        if (!this.agentCard.capabilities.streaming) {
          const result = await processingPromise;
          return res.status(200).json(result);
        } else {
          // For streaming, we'd return the initial task status
          return res.status(202).json(initialTask);
        }
      } catch (error) {
        console.error(`[A2AMiddleware] Error processing task:`, error);
        return res.status(500).json({
          id: taskRequest.id,
          status: { 
            state: TaskState.FAILED,
            reason: error instanceof Error ? error.message : 'Unknown error'
          },
          messages: [taskRequest.message]
        });
      }
    };
  }

  /**
   * Get task status
   */
  getTaskStatus() {
    return (req: Request, res: Response) => {
      const taskId = req.params.taskId;
      if (!taskId || !this.tasks[taskId]) {
        return res.status(404).json({
          error: `Task ${taskId} not found`
        });
      }

      return res.status(200).json(this.tasks[taskId].task);
    };
  }

  /**
   * Cancel a task
   */
  cancelTask() {
    return (req: Request, res: Response) => {
      const taskId = req.params.taskId;
      if (!taskId || !this.tasks[taskId]) {
        return res.status(404).json({
          error: `Task ${taskId} not found`
        });
      }

      // Update task status to cancelled
      this.tasks[taskId].task.status = {
        state: TaskState.CANCELLED,
        reason: 'Task cancelled by client'
      };

      return res.status(200).json(this.tasks[taskId].task);
    };
  }

  /**
   * Process a task asynchronously
   */
  private async processTaskAsync(
    taskRequest: TaskRequest,
    processor: (request: TaskRequest) => Promise<TaskResponse>
  ): Promise<TaskResponse> {
    try {
      // Update task status to running
      this.tasks[taskRequest.id].task.status = {
        state: TaskState.RUNNING
      };

      // Process the task
      const result = await processor(taskRequest);

      // Update the task in storage with the result
      this.tasks[taskRequest.id].task = result;

      return result;
    } catch (error) {
      // Update task status to failed
      const failedTask: TaskResponse = {
        id: taskRequest.id,
        status: {
          state: TaskState.FAILED,
          reason: error instanceof Error ? error.message : 'Unknown error'
        },
        messages: this.tasks[taskRequest.id].task.messages
      };

      // Update the task in storage
      this.tasks[taskRequest.id].task = failedTask;

      return failedTask;
    }
  }
} 