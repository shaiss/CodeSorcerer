import type { Tool, ToolExecutionOptions, ToolResult } from "../../services/ai/types";
import { z } from "zod";
// Use type imports for ESM modules
/**
 * Creates a toolkit of Hedera operations that can be used by the agent
 * @param hederaKit - The Hedera agent kit instance
 * @returns A record of tools for Hedera operations
 */
export function getHederaAgentToolkit(hederaKit: any): Record<string, Tool> {
  return {
    createFungibleToken: {
      description: "Create a new fungible token on the Hedera network",
      parameters: z.object({
        name: z.string().describe("The name of the token"),
        symbol: z.string().describe("The symbol of the token"),
        decimals: z.number().optional().describe("The number of decimal places (defaults to 0)"),
        initialSupply: z.number().optional().describe("The initial supply of tokens (defaults to 0)"),
        isSupplyKey: z.boolean().optional().describe("Whether to create a supply key (defaults to false)"),
        maxSupply: z.number().optional().describe("The maximum supply of tokens"),
        isMetadataKey: z.boolean().optional().describe("Whether to create a metadata key (defaults to false)"),
        isAdminKey: z.boolean().optional().describe("Whether to create an admin key (defaults to false)"),
        tokenMetadata: z.string().optional().describe("Optional metadata for the token"),
        memo: z.string().optional().describe("Optional memo for the token creation transaction")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          const result = await hederaKit.createFT(args);
          return {
            success: true,
            result: {
              tokenId: result.tokenId.toString(),
              transactionId: result.transactionId,
              message: `Successfully created token ${args.name} (${args.symbol})`
            }
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
    
    transferToken: {
      description: "Transfer tokens from your account to another account",
      parameters: z.object({
        tokenId: z.string().describe("The ID of the token to transfer"),
        toAccountId: z.string().describe("The account ID to transfer tokens to"),
        amount: z.number().describe("The amount of tokens to transfer")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          // Dynamic import for TokenId
          const { TokenId } = await import('@hashgraph/sdk');
          const result = await hederaKit.transferToken(
            TokenId.fromString(args.tokenId),
            args.toAccountId,
            args.amount
          );
          return {
            success: true,
            result: {
              transactionId: result.transactionId,
              message: `Successfully transferred ${args.amount} tokens to ${args.toAccountId}`
            }
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
    
    getHbarBalance: {
      description: "Get the HBAR balance of an account",
      parameters: z.object({
        accountId: z.string().optional().describe("The account ID to check (defaults to your account)")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          const balance = await hederaKit.getHbarBalance(args.accountId);
          return {
            success: true,
            result: {
              balance,
              accountId: args.accountId || "your account",
              message: `HBAR balance for ${args.accountId || "your account"}: ${balance}`
            }
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
    
    createTopic: {
      description: "Create a new topic on the Hedera Consensus Service",
      parameters: z.object({
        topicMemo: z.string().describe("The memo for the topic"),
        isSubmitKey: z.boolean().optional().describe("Whether to create a submit key (defaults to false)")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          const result = await hederaKit.createTopic(args.topicMemo, args.isSubmitKey);
          return {
            success: true,
            result: {
              topicId: result.topicId.toString(),
              transactionId: result.transactionId,
              message: `Successfully created topic with memo: ${args.topicMemo}`
            }
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
    
    submitTopicMessage: {
      description: "Submit a message to a topic on the Hedera Consensus Service",
      parameters: z.object({
        topicId: z.string().describe("The ID of the topic to submit a message to"),
        message: z.string().describe("The message to submit to the topic")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          // Dynamic import for TopicId
          const { TopicId } = await import('@hashgraph/sdk');
          const result = await hederaKit.submitTopicMessage(
            TopicId.fromString(args.topicId),
            args.message
          );
          return {
            success: true,
            result: {
              transactionId: result.transactionId,
              message: `Successfully submitted message to topic ${args.topicId}`
            }
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
    
    associateToken: {
      description: "Associate a token with an account",
      parameters: z.object({
        tokenId: z.string().describe("The ID of the token to associate"),
        accountId: z.string().optional().describe("The account ID to associate the token with (defaults to your account)")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          // Dynamic import for TokenId
          const { TokenId } = await import('@hashgraph/sdk');
          const result = await hederaKit.associateToken(
            TokenId.fromString(args.tokenId),
            args.accountId
          );
          return {
            success: true,
            result: {
              transactionId: result.transactionId,
              message: `Successfully associated token ${args.tokenId} with account ${args.accountId || "your account"}`
            }
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
    
    getTokenBalance: {
      description: "Get the balance of a specific token for an account",
      parameters: z.object({
        tokenId: z.string().describe("The ID of the token to check"),
        accountId: z.string().optional().describe("The account ID to check (defaults to your account)")
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          // Dynamic import for TokenId
          const { TokenId } = await import('@hashgraph/sdk');
          const balance = await hederaKit.getHtsBalance(
            TokenId.fromString(args.tokenId),
            args.accountId
          );
          return {
            success: true,
            result: {
              balance,
              tokenId: args.tokenId,
              accountId: args.accountId || "your account",
              message: `Token balance for ${args.tokenId}: ${balance}`
            }
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