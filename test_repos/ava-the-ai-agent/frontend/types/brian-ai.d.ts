declare module "@brian-ai/langchain" {
  import { BaseToolkit } from "@langchain/core/tools";
  import { AgentExecutor } from "langchain/agents";
  import { DynamicStructuredTool } from "langchain/tools";
  import { Wallet } from "@coinbase/coinbase-sdk";

  // Base interfaces
  interface BrianAgentOptions {
    instructions?: string;
    apiKey: string;
    apiUrl?: string;
    privateKeyOrAccount: `0x${string}`;
    llm: any;
    xmtpHandler?: any;
    xmtpHandlerOptions?: any;
  }

  interface BrianCDPToolkitOptions {
    apiKey: string;
    apiUrl?: string;
    coinbaseApiKeyName?: string;
    coinbaseApiKeySecret?: string;
    coinbaseFilePath?: string;
    coinbaseOptions?: Record<string, any>;
  }

  interface BrianToolkitOptions {
    apiKey: string;
    apiUrl?: string;
    privateKeyOrAccount: `0x${string}` | any;
  }

  // Tool classes
  class BrianTool extends DynamicStructuredTool {
    brianSDK: any;
    account: any;
    constructor(fields: any);
  }

  class BrianCDPTool extends DynamicStructuredTool {
    brianSDK: any;
    wallet: any;
    constructor(fields: any);
  }

  // Toolkit classes
  export class BrianToolkit extends BaseToolkit {
    account: any;
    brianSDK: any;
    tools: BrianTool[];
    constructor(options: BrianToolkitOptions);
  }

  export class BrianCDPToolkit extends BaseToolkit {
    brianSDK: any;
    tools: BrianCDPTool[];
    wallet?: Wallet;
    walletData?: any;
    constructor(options: BrianCDPToolkitOptions);
    setup(config: { wallet?: Wallet; walletData?: any }): Promise<BrianCDPTool[]>;
  }

  // Tool creation functions
  export function createGetBalanceTool(brianSDK: any, account: any): BrianTool;
  export function createBorrowTool(brianSDK: any, account: any): BrianTool;
  export function createBridgeTool(brianSDK: any, account: any): BrianTool;
  export function createTransferTool(brianSDK: any, account: any): BrianTool;
  export function createCDPGetBalanceTool(brianSDK: any, wallet: Wallet): BrianCDPTool;
  export function createCDPBridgeTool(brianSDK: any, wallet: Wallet): BrianCDPTool;

  // Main agent creation function
  export function createBrianAgent(config: BrianAgentOptions): Promise<AgentExecutor>;

  // Callback handler
  export class XMTPCallbackHandler {
    constructor(handler: any, llm: any, instructions: string, options?: any);
  }
}
