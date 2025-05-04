import { z } from "zod";
import type { Tool, ToolExecutionOptions, ToolResult } from "../../services/ai/types";
import type { Account } from "viem";
import env from "../../env";
import {
  deleteTask,
  retrieveTaskById,
  retrieveTasks,
  storeTask,
  updateTask,
} from "../../memory";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
} from "viem";
import { getChain } from "../../utils/chain";

export const getExecutorToolkit = (account: Account): Record<string, Tool> => {
  return {
    simulateTasks: {
      description: "A tool that simulates the output of all the tasks. It is useful to check the outputs and to fix the inputs of other tasks. Always use this tool before the executeTransaction tool.",
      parameters: z.object({}),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          console.log("======== simulateTasks Tool =========");
          const { data: tasks, error } = await retrieveTasks();

          if (error) {
            console.error(`[simulateTasks] Error retrieving tasks:`, error);
            return {
              success: false,
              result: null,
              error: `Failed to retrieve tasks: ${error.message}`
            };
          }

          if (!tasks || tasks.length === 0) {
            return {
              success: false,
              result: null,
              error: "No tasks found."
            };
          }

          const simulations = await Promise.all(
            tasks.map(async (taskData) => {
              if (!taskData || !taskData.steps) {
                return `Task [id: ${taskData?.id}] is invalid or missing steps.`;
              }

              return [
                `[taskId: ${taskData.id}] "${taskData.task}"`,
                `Transaction: ${taskData.from_token?.symbol || 'Unknown'} -> ${taskData.to_token?.symbol || 'Unknown'}`,
                `Amount: ${taskData.from_amount || '0'} ${taskData.from_token?.symbol || ''} -> ${taskData.to_amount || '0'} ${taskData.to_token?.symbol || ''}`,
                `Status: ${taskData.status || 'pending'}`,
                `Steps: ${JSON.stringify(taskData.steps, null, 2)}`,
              ].join("\n");
            })
          );

          return {
            success: true,
            result: simulations.join("\n\n")
          };
        } catch (error) {
          console.error(`[simulateTasks] Unexpected error:`, error);
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },
    getTransactionData: {
      description: "A tool that transforms the tasks into transactions.",
      parameters: z.object({
        tasks: z.array(
          z.object({
            task: z.string(),
            taskId: z.string().nullable(),
          })
        ),
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          if (!args.tasks || !Array.isArray(args.tasks)) {
            return {
              success: false,
              result: null,
              error: "Invalid tasks parameter. Expected array of tasks."
            };
          }

          console.log("======== getTransactionData Tool =========");
          console.log(`[getTransactionData] Processing ${args.tasks.length} tasks`);
          
          const transactions = await Promise.all(
            args.tasks.map(async ({ task, taskId }: { task: string; taskId: string | null }) => {
              if (!task) {
                console.error(`[getTransactionData] Invalid task object:`, { task, taskId });
                return null;
              }

              console.log(`[getTransactionData] Fetching transaction data for task: "${task.substring(0, 100)}..."`);
              try {
                const brianResponse = await fetch(
                  `${env.BRIAN_API_URL || "https://api.brianknows.org/api/v0/agent/transaction"}`,
                  {
                    method: "POST",
                    body: JSON.stringify({
                      prompt: task,
                      chainId: env.CHAIN_ID,
                      address: account.address,
                    }),
                    headers: {
                      "Content-Type": "application/json",
                      "x-brian-api-key": env.BRIAN_API_KEY,
                    },
                  }
                );

                if (!brianResponse.ok) {
                  throw new Error(`Brian API returned ${brianResponse.status}: ${await brianResponse.text()}`);
                }

                const { result } = await brianResponse.json();
                if (!result || !result[0]?.data) {
                  throw new Error('Invalid response from Brian API');
                }

                const data = result[0].data;
                console.log(`[getTransactionData] Brian says: ${data.description}`);
                
                return {
                  task,
                  steps: data.steps,
                  taskId,
                  fromToken: data.fromToken,
                  fromAmountUSD: `$${data.fromAmountUSD}`,
                  toToken: data.toToken,
                  toAmountUSD: `$${data.toAmountUSD}`,
                  fromAmount: formatUnits(data.fromAmount, data.fromToken.decimals),
                  outputAmount: formatUnits(data.toAmountMin, data.toToken.decimals),
                };
              } catch (error) {
                console.error(`[getTransactionData] Error processing task:`, error);
                return null;
              }
            })
          );

          const validTransactions = transactions.filter(t => t !== null);
          if (validTransactions.length === 0) {
            return {
              success: false,
              result: null,
              error: "Failed to process any transactions. Please check the task format and try again."
            };
          }

          const taskResults = [];

          for (const transaction of validTransactions) {
            if (!transaction) continue;

            try {
              let result;
              if (transaction.taskId) {
                result = await updateTask(
                  transaction.taskId,
                  transaction.task,
                  transaction.steps,
                  transaction.fromToken,
                  transaction.toToken,
                  transaction.fromAmount,
                  transaction.outputAmount
                );
              } else {
                result = await storeTask(
                  transaction.task,
                  transaction.steps,
                  transaction.fromToken,
                  transaction.toToken,
                  transaction.fromAmount,
                  transaction.outputAmount
                );
              }

              if (result.error) {
                console.error(`[getTransactionData] Error storing/updating task:`, result.error);
                continue;
              }

              const taskData = result.data?.[0];
              if (taskData) {
                taskResults.push({
                  taskId: taskData.id,
                  task: transaction.task,
                  createdAt: taskData.created_at,
                  status: taskData.status
                });
              }
            } catch (error) {
              console.error(`[getTransactionData] Error storing task:`, error);
            }
          }

          if (taskResults.length === 0) {
            return {
              success: false,
              result: null,
              error: "Failed to store any tasks. Please try again."
            };
          }

          return {
            success: true,
            result: taskResults
          };
        } catch (error) {
          console.error(`[getTransactionData] Unexpected error:`, error);
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },
    executeTransaction: {
      description: "A tool that executes a transaction. Execute transactions in chronological order.",
      parameters: z.object({
        task: z.string(),
        taskId: z.string(),
      }),
      execute: async (args: Record<string, any>, options?: ToolExecutionOptions): Promise<ToolResult> => {
        try {
          if (!args.task || !args.taskId) {
            return {
              success: false,
              result: null,
              error: "Missing required parameters: task and taskId"
            };
          }

          console.log("======== executeTransaction Tool =========");
          console.log(`[executeTransaction] executing transaction with task id: ${args.taskId}`);

          const { data: taskData } = await retrieveTaskById(args.taskId);

          if (!taskData) {
            return {
              success: false,
              result: null,
              error: `Transaction not found for task: "${args.task}" [id: ${args.taskId}].`
            };
          }

          const walletClient = createWalletClient({
            account,
            chain: getChain(parseInt(env.CHAIN_ID)),
            transport: http(),
          });
          const publicClient = createPublicClient({
            chain: getChain(parseInt(env.CHAIN_ID)),
            transport: http(),
          });

          const hashes: string[] = [];

          for (const step of taskData[0].steps) {
            try {
              const hash = await walletClient.sendTransaction({
                to: step.to,
                value: BigInt(step.value),
                data: step.data,
              });
              console.log(`[executeTransaction] transaction hash: ${hash}`);
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              console.log(`[executeTransaction] transaction receipt: ${receipt.transactionHash}`);
              hashes.push(receipt.transactionHash);
            } catch (error) {
              console.log(`[executeTransaction] transaction for task "${args.task}" failed: ${error}`);
              return {
                success: false,
                result: null,
                error: `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              };
            }
          }

          await deleteTask(args.taskId);

          return {
            success: true,
            result: `Transaction executed successfully. Transaction hashes: ${hashes.join(", ")}`
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
};

export const getOdosSwapTransaction = (account: Account) => {
  return {
    generateQuote: {
      description: `This will generate Quote for the swap. 
       It takes the following inputs:
        - The source chain ID
        - The token on the source chain (address)
        - The token on the destination chain (address)
        - The amount to transfer (in the smallest unit of the token)
        - The address from which the tokens are being transferred
      `,
      parameters: z.object({
        chainId: z.number().describe("Chain Id of the Chain"),
        fromToken: z.string().describe("Address of the source token"),
        toToken: z.string().describe("Address of the destination token"),
        fromAmount: z.string().describe(
          "The amount to be transferred from the source chain, specified in the smallest unit of the token (e.g., wei for ETH)."
        ),
      }),
      execute: async (args: {
        chainId: number;
        fromToken: string;
        toToken: string;
        fromAmount: string;
      }): Promise<ToolResult> => {
        try {
          console.log("======== Fetching Quote for the Transaction Tool =========");
          console.log(` Fetching Quote`);

          const quoteConfig = {
            chainId: args.chainId,
            inputToken: [
              {
                tokenAddress: args.fromToken,
                amount: args.fromAmount,
              },
            ],
            outputTokens: [
              {
                tokenAddress: args.toToken,
                proportion: 1,
              },
            ],
            userAddr: account.address,
            slippageLimitPercent: 0.3,
            referralCode: 0,
            disableRFQs: true,
            compact: true,
          };

          const quoteUrl = "https://api.odos.xyz/sor/quote/v2";
          const response = await fetch(quoteUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quoteConfig),
          });

          if (response.status === 200) {
            const quote = await response.json();
            console.log("Quote fetched successfully >>>", quote);

            console.log("======== Assembling transaction =========");
            const assembleUrl = "https://api.odos.xyz/sor/assemble";
            const assembleRequestBody = {
              userAddr: account.address,
              pathId: quote.pathId,
              simulate: true,
            };

            const assembledTransactionRaw = await fetch(assembleUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(assembleRequestBody),
            });

            const assembledTransaction = await assembledTransactionRaw.json();
            console.log("Transaction fetched successfully", assembledTransaction);

            console.log("======== Executing transaction =========");
            const walletClient = createWalletClient({
              account,
              chain: getChain(parseInt(env.CHAIN_ID)),
              transport: http(),
            });
            const publicClient = createPublicClient({
              chain: getChain(parseInt(env.CHAIN_ID)),
              transport: http(),
            });

            const hash = await walletClient.sendTransaction(assembledTransaction.transaction);
            console.log(`[executeTransaction] transaction hash: ${hash}`);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log(`[executeTransaction] transaction receipt: ${receipt.transactionHash}`);

            return {
              success: true,
              result: `Transaction executed successfully. Transaction hash: ${receipt.transactionHash}`
            };
          }

          return {
            success: false,
            result: null,
            error: "Failed to fetch quote"
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
};