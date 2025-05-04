import type { Tool, ToolExecutionOptions, ToolResult } from "../../services/ai/types";
import type { EventBus } from "../../comms";
import { z } from "zod";

export function getTaskManagerToolkit(eventBus: EventBus): Record<string, Tool> {
  return {
    sendMessageToObserver: {
      description: "Send a message to the observer agent for analysis",
      parameters: z.object({
        message: z.string().describe("The message to send to the observer"),
        taskId: z.string().describe("The ID of the task")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          eventBus.emit('task-manager-observer', {
            taskId: args.taskId,
            task: args.message,
            type: 'analyze'
          });
          return {
            success: true,
            result: `Message sent to observer: ${args.message}`
          };
        } catch (error) {
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },
    sendMessageToExecutor: {
      description: "Send a message to the executor agent for execution",
      parameters: z.object({
        message: z.string().describe("The message to send to the executor"),
        taskId: z.string().describe("The ID of the task")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          eventBus.emit('task-manager-executor', {
            taskId: args.taskId,
            task: args.message,
            type: 'execute'
          });
          return {
            success: true,
            result: `Message sent to executor: ${args.message}`
          };
        } catch (error) {
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },
    sendMessageToZircuit: {
      description: "Send a message to the Zircuit agent for operations on Zircuit L2 and Zerolend protocol",
      parameters: z.object({
        message: z.string().describe("The message to send to the Zircuit agent"),
        taskId: z.string().describe("The ID of the task")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          eventBus.emit('task-manager-zircuit', {
            taskId: args.taskId,
            task: args.message,
            type: 'execute'
          });
          return {
            success: true,
            result: `Message sent to Zircuit agent: ${args.message}`
          };
        } catch (error) {
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },
    sendMessageToSuiAgent: {
      description: "Send a blockchain-related task to the SUI agent for execution",
      parameters: z.object({
        message: z.string().describe("The blockchain task to execute"),
        taskId: z.string().describe("The ID of the task")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          eventBus.emit('task-manager-sui-agent', {
            taskId: args.taskId,
            task: args.message,
            type: 'execute'
          });
          return {
            success: true,
            result: `Message sent to SUI agent: ${args.message}`
          };
        } catch (error) {
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },
    sendMessageToHederaAgent: {
      description: "Send a Hedera blockchain-related task to the Hedera agent for execution",
      parameters: z.object({
        message: z.string().describe("The Hedera task to execute (can be a natural language description or a JSON string with operation and params)"),
        taskId: z.string().describe("The ID of the task")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          eventBus.emit('task-manager-hedera', {
            taskId: args.taskId,
            task: args.message,
            type: 'execute'
          });
          return {
            success: true,
            result: `Message sent to Hedera agent: ${args.message}`
          };
        } catch (error) {
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },
    sendMessageToSafeWallet: {
      description: "Send a transaction or spending limit request to the Safe Wallet agent",
      parameters: z.object({
        action: z.enum(['propose-transaction', 'set-spending-limit', 'spend-allowance']),
        data: z.object({
          to: z.string().optional(),
          data: z.string().optional(),
          value: z.string().optional(),
          agentPrivateKey: z.string(),
          tokenAddress: z.string().optional(),
          amount: z.string().optional(),
          resetTimeInMinutes: z.number().optional(),
          ownerPrivateKey: z.string().optional(),
          agentAddress: z.string().optional(),
        }),
        taskId: z.string()
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          eventBus.emit('task-manager-safe-wallet', {
            taskId: args.taskId,
            action: args.action,
            data: args.data,
          });
          return {
            success: true,
            result: `Message sent to Safe Wallet agent: ${args.action}`
          };
        } catch (error) {
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }
  };
}
