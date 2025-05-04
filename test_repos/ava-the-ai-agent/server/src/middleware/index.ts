import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AgentCard, Message, TaskResponse, TaskState } from '../types/a2a';

type TaskProcessor = (message: Message) => Promise<TaskResponse>;

/**
 * Middleware for handling A2A protocol requests
 */
export class A2AMiddleware {
  private agentCard: AgentCard;
  private tasks: Map<string, TaskResponse> = new Map();
  private taskProcessor: TaskProcessor | null = null;

  constructor(agentCard: AgentCard) {
    this.agentCard = agentCard;
  }

  registerTaskProcessor(agentName: string, processor: TaskProcessor): void {
    this.taskProcessor = processor;
  }

  /**
   * Returns a middleware function to serve the agent card
   */
  getAgentCard(): RequestHandler {
    return (_req: Request, res: Response, next: NextFunction): void => {
      try {
        res.json(this.agentCard);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Returns a middleware function to process a task
   */
  processTask(agentName: string): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!this.taskProcessor) {
          res.status(500).json({
            error: 'No task processor registered for this agent'
          });
          return;
        }

        const taskId = uuidv4();
        const message: Message = req.body;
        
        // Initialize task in pending state
        const taskResponse: TaskResponse = {
          id: taskId,
          status: { state: TaskState.PENDING },
          messages: [message]
        };
        
        this.tasks.set(taskId, taskResponse);
        
        // Return task ID immediately
        res.status(202).json({
          taskId,
          status: { state: TaskState.PENDING }
        });
        
        // Process task asynchronously
        try {
          const result = await this.taskProcessor(message);
          this.tasks.set(taskId, {
            ...result,
            id: taskId,
            status: { state: TaskState.COMPLETED }
          });
        } catch (error) {
          this.tasks.set(taskId, {
            ...taskResponse,
            status: { 
              state: TaskState.FAILED,
              reason: error instanceof Error ? error.message : String(error)
            }
          });
        }
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Returns a middleware function to get task status
   */
  getTaskStatus(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { taskId } = req.params;
        const task = this.tasks.get(taskId);
        
        if (!task) {
          res.status(404).json({
            error: 'Task not found'
          });
          return;
        }
        
        res.json(task);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Returns a middleware function to cancel a task
   */
  cancelTask(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { taskId } = req.params;
        const task = this.tasks.get(taskId);
        
        if (!task) {
          res.status(404).json({
            error: 'Task not found'
          });
          return;
        }
        
        if (task.status.state === TaskState.COMPLETED || task.status.state === TaskState.FAILED) {
          res.status(400).json({
            error: 'Cannot cancel completed task'
          });
          return;
        }
        
        this.tasks.set(taskId, {
          ...task,
          status: { state: TaskState.CANCELLED }
        });
        
        res.json({
          taskId,
          status: { state: TaskState.CANCELLED }
        });
      } catch (error) {
        next(error);
      }
    };
  }
} 