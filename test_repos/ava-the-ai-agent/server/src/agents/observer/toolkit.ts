import { tool } from "ai";
import type { Hex } from "viem";
import { getAccountBalances, getMarketData } from "../../data";
import { z } from "zod";
import { retrievePastReports } from "../../memory";
import { CookieApiService } from "../../services/cookie-api";

// Updated Tool interface to match AI SDK requirements
export interface Tool<TParams = any, TResult = any> {
  parameters: z.ZodObject<any>;
  execute: (args: TParams, options?: ToolExecutionOptions) => Promise<TResult>;
  description: string;
}

// Type for tool execution options
interface ToolExecutionOptions {
  toolCallId?: string;
  messages?: any[];
  severity?: 'info' | 'warning' | 'error';
}

// Type for tool result
interface ToolResult {
  success: boolean;
  result: any;
  error?: string;
}

export const getObserverToolkit = (address: Hex): Record<string, Tool> => {
  const cookieApi = new CookieApiService();
  console.log("observer addr", address);
  return {
    getPastReports: {
      description: "A tool that returns the past reports that contain information about previously executed actions.",
      parameters: z.object({
        question: z.string().describe(
          "The question to retrieve past reports for. If you are thinking about performing operations with USDC for example, you could generate a question to ask to your memory."
        ),
      }),
      execute: async (args: { question: string }, options?: ToolExecutionOptions) => {
        console.log("======== getPastReports Tool =========");
        console.log(`[getPastReports] retrieving past reports with question: ${args.question}`);
        const reports = await retrievePastReports(args.question);

        if (!reports || reports.length === 0) {
          return "No past reports found. This is ok, it means that you're thinking about a new operation.";
        }

        console.log(`[getPastReports] reports retrieved: ${reports.length}`);

        return reports
          .map(
            (report: any) =>
              `Report containing the operations done the ${report.created_at}:\n${report.content}\n`
          )
          .join("\n");
      },
    },
    getWalletBalances: {
      description: "A tool that returns the current balances of your wallet.",
      parameters: z.object({}),
      execute: async (options?: ToolExecutionOptions) => {
        console.log("======== getWalletBalances Tool =========");
        console.log(`[getWalletBalances] fetching token balances for ${address}...`);
        const { balances } = await getAccountBalances(address);

        console.log(`[getWalletBalances] balances fetched: ${balances}`);

        const tokenBalances = balances
          ?.filter(
            (balance: any) =>
              balance.platform === "native" || balance.platform === "basic"
          )
          .map(
            (balance: any) =>
              `[${balance.symbol}] balance: ${balance.balance} $${balance.balanceUSD}) - price: $${balance.price}`
          )
          .join("\n");

        const formattedBalances = balances
          .filter(
            (balance: any) =>
              balance.platform !== "native" && balance.platform !== "basic"
          )
          .map(
            (balance: any) =>
              `[${balance.symbol}] balance: ${balance.balance} $${
                balance.balanceUSD
              }) on protocol ${balance.platform.replace("-", " ")} with APY ${
                balance.metrics.apy
              }%`
          )
          .join("\n");

        console.log(`[getWalletBalances] balances fetched correctly.`);
        return `This is the current status of the wallet with address ${address}:\nTokens:\n${tokenBalances}\nOpen positions:\n${formattedBalances}`;
      },
    },
    getMarketData: {
      description: "A tool that returns the current market data for USDC and EURC.",
      parameters: z.object({}),
      execute: async (options?: ToolExecutionOptions): Promise<ToolResult> => {
        console.log("======== getMarketData Tool =========");
        console.log(`[getMarketData] fetching market data...`);
        
        try {
          const marketData = await getMarketData();

          const formatTokens = (data: any) => {
            if (!data?.tokens || data.tokens.length === 0) {
              return "No opportunities found";
            }

            return data.tokens
              .map(
                (token: any) =>
                  `[${token.name}] APY: ${token.metrics.apy}% - volume 1d: $${token.metrics.volumeUsd1d} - volume 7d: $${token.metrics.volumeUsd7d}`
              )
              .join("\n");
          };

          const usdcFormatted = formatTokens(marketData[0]?.usdc);
          const eurcFormatted = formatTokens(marketData[0]?.eurc);

          console.log(`[getMarketData] market data fetched correctly.`);
          
          const formattedResult = `These are the current market opportunities:\n\nUSDC Opportunities:\n${usdcFormatted}\n\nEURC Opportunities:\n${eurcFormatted}`;
          
          return {
            success: true,
            result: formattedResult
          };
        } catch (error) {
          console.error(`[getMarketData] Error:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            result: null
          };
        }
      },
    },
    getCurrentEurUsdRate: {
      description: "A tool that returns the current EUR/USD exchange rate.",
      parameters: z.object({}),
      execute: async (options?: ToolExecutionOptions) => {
        console.log("======== getCurrentEurUsdRate Tool =========");
        console.log(`[getCurrentEurUsdRate] fetching EUR/USD rate...`);

        try {
          const response = await fetch(
            "https://api.frankfurter.dev/v1/latest?symbols=USD"
          );
          const data = await response.json();
          const rate = data.rates.USD;

          console.log(`[getCurrentEurUsdRate] rate fetched successfully: ${rate}`);
          return `Current EUR/USD exchange rate: 1 EUR = ${rate} USD (as of ${data.date})`;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          return `Error fetching EUR/USD rate: ${errorMessage}`;
        }
      },
    },
    noFurtherActionsTool: {
      description: "A tool that you decide to use when no further actions are needed.",
      parameters: z.object({
        reason: z.string().describe("The reason why no further actions are needed."),
        waitTime: z.number().describe(
          "The time to wait before executing the next action. This number must be logical to the operations you've done."
        ),
      }),
      execute: async (args: { reason: string; waitTime: number }, options?: ToolExecutionOptions) => {
        return { reason: args.reason, waitTime: args.waitTime };
      },
    },
    getPortfolioActivityCrossChain: {
      description: "A tool that will give activity of the wallet Address/portfolio across all the different chains",
      parameters: z.object({}),
      execute: async (options?: ToolExecutionOptions) => {
        console.log("======== Getting Portfolio Activity Cross Chains =========");
        console.log(`[getPortfolioActivityCrossChain] fetching cross chain portfolio activity for: ${address}...`);

        try {
          const response = await fetch(
            `https://api.covalenthq.com/v1/address/${address}/activity/`
          );
          console.log("Activity fetched >>>", response);

          const data = await response.json();
          const activityItems = data.data.items;

          return `Successfully fetched the data from all the chains for the wallet address: ${address}. Got ${activityItems.length} of the data and the data is an array of objects: ${activityItems}`;
        } catch (error) {
          console.log("Error in fetching data", error);
          return `Error in getting data for this wallet address: ${error}`;
        }
      },
    },
    getTokenBalanceForAddress: {
      description: "A tool that will get the multi chain balance for the wallet address.",
      parameters: z.object({
        chainName: z.enum([
          "eth",
          "base",
          "arbitrum",
          "avalanche",
          "btc",
          "solana",
          "mantle",
        ]),
      }),
      execute: async (args: { chainName: string }, options?: ToolExecutionOptions) => {
        console.log("======== Getting Token balance for the address =========");
        console.log(`[getTokenBalanceForAddress] fetching token balance for address: ${address} on chain: ${args.chainName}...`);

        try {
          const res = await fetch(
            `https://api.covalenthq.com/v1/${args.chainName}-mainnet/address/${address}/balances_v2/`
          );
          const data = await res.json();
          const items = data.data.items;
          
          return `Successfully fetched the data from all the chains for the wallet address: ${address}. Got ${items.length} of the data and the data is an array of objects: ${items}`;
        } catch (error) {
          console.log("[getTokenBalanceForAddress]: Error", error);
          return `Error in getting token balance for the wallet address: ${error}`;
        }
      },
    },
    getCookieAgentData: {
      description: "Get detailed metrics about specific AI agents",
      parameters: z.object({
        twitterUsername: z.string().optional(),
        contractAddress: z.string().optional(),
        interval: z.enum(['_3Days', '_7Days']).default('_7Days')
      }),
      execute: async (args: { 
        twitterUsername?: string; 
        contractAddress?: string; 
        interval: '_3Days' | '_7Days' 
      }, options?: ToolExecutionOptions): Promise<ToolResult> => {
        console.log("======== Getting Cookie Agent Data =========");

        try {
          if (args.twitterUsername) {
            const data = await cookieApi.getAgentByTwitter(args.twitterUsername, args.interval);
            return { success: true, result: data };
          } else if (args.contractAddress) {
            const data = await cookieApi.getAgentByContract(args.contractAddress, args.interval);
            return { success: true, result: data };
          }
          return { success: false, error: "Please provide either twitterUsername or contractAddress", result: null };
        } catch (error) {
          console.error("Error fetching Cookie agent data:", error);
          return { success: false, error: `Error fetching agent data: ${error}`, result: null };
        }
      }
    },
    searchCookieTweets: {
      description: "Search tweets using Cookie API",
      parameters: z.object({
        query: z.string().describe("Search query"),
        fromDate: z.string().describe("Start date (YYYY-MM-DD)"),
        toDate: z.string().describe("End date (YYYY-MM-DD)")
      }),
      execute: async (args: { 
        query: string; 
        fromDate: string; 
        toDate: string 
      }, options?: ToolExecutionOptions): Promise<ToolResult> => {
        console.log("======== Searching Cookie Tweets =========");

        try {
          const data = await cookieApi.searchTweets(args.query, args.fromDate, args.toDate);
          
          // Format the tweets data
          console.log("Tweets data", data);
          
          return { 
            success: true, 
            result: data 
          };
        } catch (error) {
          console.error("Error searching tweets:", error);
          return { 
            success: false, 
            error: `Error searching tweets: ${error}`, 
            result: null 
          };
        }
      }
    },
    getTopAgents: {
      description: "Get list of top AI agents by mindshare",
      parameters: z.object({
        interval: z.enum(['_3Days', '_7Days']).default('_7Days'),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(25).default(10)
      }),
      execute: async (args: {
        interval: '_3Days' | '_7Days';
        page: number;
        pageSize: number;
      }, options?: ToolExecutionOptions): Promise<ToolResult> => {
        console.log("======== Getting Top Agents =========");

        try {
          const data = await cookieApi.getAgentsPaged(args.interval, args.page, args.pageSize);
          return { success: true, result: data };
        } catch (error) {
          console.error("Error fetching top agents:", error);
          return { success: false, error: `Error fetching top agents: ${error}`, result: null };
        }
      }
    }
  };
};
