import {
    type BrianAgentOptions,
    BrianToolkit,
    XMTPCallbackHandler,
} from "@brian-ai/langchain";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ChatXAI } from "@langchain/xai";
import { createToolCallingAgent, AgentExecutor } from "langchain/agents";
import { ChatMessageHistory } from "langchain/memory";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { FunctorService } from '../services/functorService';
import { defiLlamaToolkit, coingeckoTool } from "./tools";
import { ChainValues } from "@langchain/core/utils/types";

// Update message history store and getter
const store: Record<string, ChatMessageHistory> = {};

function getMessageHistory(sessionId: string): ChatMessageHistory {
    if (!(sessionId in store)) {
        store[sessionId] = new ChatMessageHistory();
    }
    return store[sessionId]!;
}

export interface Agent {
    id: string;
    name: string;
    description: string;
    agent: RunnableWithMessageHistory<Record<string, any>, ChainValues>;
    metadata?: Record<string, any>;
    type: string;
    status: string;
}

export const createSpecializedAgents = async (baseOptions: BrianAgentOptions): Promise<Agent[]> => {
    // Trading Agent with Kestra orchestration
    const tradingAgent = await createAgent({
        ...baseOptions,
        tools: [coingeckoTool],
        instructions: `You are a specialized trading agent with workflow orchestration capabilities.
            You can execute and monitor complex trading operations using Kestra workflows.
            Focus on price analysis and trading opportunities.`,
    });

    // Liquidity Pool Agent
    const liquidityAgent = await createAgent({
        ...baseOptions,
        tools: [defiLlamaToolkit.getTVLTool],
        instructions: "You are a liquidity pool specialist. Help users find and analyze liquidity pools.",
    });

    // DeFiLlama Analysis Agent
    const defiLlamaAgent = await createAgent({
        ...baseOptions,
        tools: Object.values(defiLlamaToolkit),
        instructions: `You are a DeFi analytics specialist powered by DeFiLlama data.
            You can:
            - Track TVL across protocols and chains
            - Analyze yield opportunities and APY trends
            - Monitor DEX volumes and trading activity
            - Compare different protocols and chains
            Always provide data-driven insights and recommendations.`,
    });

    // Update Portfolio Agent with orchestration capabilities
    const portfolioAgent = await createAgent({
        ...baseOptions,
        tools: [
            coingeckoTool,
            defiLlamaToolkit.getTVLTool,
        ],
        instructions: `You are a portfolio management specialist with cross-chain orchestration capabilities.
            You can orchestrate complex portfolio operations across multiple chains.
            Help users optimize their portfolio allocation while maintaining efficiency and security.`
    });


    // const wallet = await initializeCDPWallet(baseOptions);

    // const coinbaseTools = await createCoinbaseTools(wallet);

    // // Coinbase Dev Agent
    // const coinbaseAgent = await createAgent({
    //     ...baseOptions,
    //     tools: [
    //         coinbaseTools.getBalance,
    //         coinbaseTools.bridge,
    //         defiLlamaToolkit.getTVLTool,
    //         coingeckoTool,
    //     ],
    //     instructions: `You are a Coinbase Developer Platform specialist.

    //         Available Operations:
    //         - Check token balances across chains
    //         - Bridge assets between networks
    //         - Monitor prices and TVL

    //         Supported Networks:
    //         - Base (primary)
    //         - Ethereum
    //         - Optimism
    //         - Arbitrum

    //         Always prioritize:
    //         - Transaction safety
    //         - Gas efficiency
    //         - Clear operation explanations
    //         - Risk warnings for complex operations`,
    // });

    // Helper function to initialize Coinbase wallet
    // async function initializeCDPWallet(options: BrianAgentOptions): Promise<Wallet> {
    //     try {
    //         const provider = new ethers.providers.JsonRpcProvider(
    //             process.env["NEXT_PUBLIC_BASE_RPC_URL"]
    //         );

    //         const signer = new ethers.Wallet(options.privateKeyOrAccount, provider);

    //         // Create Coinbase wallet instance
    //         return ({
    //             address: signer.address,
    //             privateKey: signer.privateKey,
    //             provider: "base",
    //             chainId: 8453
    //         });
    //     } catch (error) {
    //         console.error("Failed to initialize Coinbase wallet:", error);
    //         throw error;
    //     }
    // }

    return [
        {
            id: 'trading',
            name: 'Trading Agent',
            description: 'Specializes in price analysis and trading opportunities',
            agent: tradingAgent,
            type: 'trading',
            status: 'active'
        },
        {
            id: 'liquidity',
            name: 'Liquidity Pool Agent',
            description: 'Analyzes liquidity pools and provides insights',
            agent: liquidityAgent,
            type: 'liquidity',
            status: 'active'
        },
        {
            id: 'portfolio',
            name: 'Portfolio Manager',
            description: 'Helps optimize portfolio allocation and management',
            agent: portfolioAgent,
            type: 'portfolio',
            status: 'active'
        },
        {
            id: 'defi-analytics',
            name: 'DeFi Analytics',
            description: 'Provides comprehensive DeFi market analysis using DeFiLlama data',
            agent: defiLlamaAgent,
            type: 'analytics',
            status: 'active'
        },
        // {
        //     id: 'coinbase-dev',
        //     name: 'Coinbase Dev Agent',
        //     description: 'Executes cross-chain operations via Coinbase CDP',
        //     agent: coinbaseAgent,
        //     metadata: {
        //         supportedChains: ["base", "ethereum", "optimism", "arbitrum"],
        //         capabilities: ["balance", "bridge"]
        //     }
        // }
    ];
};

// Base Agent Creation Function
const createAgent = async ({
    apiKey,
    privateKeyOrAccount,
    llm,
    tools = [],
    instructions,
    apiUrl,
    xmtpHandler,
    xmtpHandlerOptions,
}: BrianAgentOptions & { tools?: Array<DynamicStructuredTool<any>> }) => {

    const brianToolkit = new BrianToolkit({
        apiKey,
        privateKeyOrAccount,
        ...(apiUrl ? { apiUrl } : {})
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", instructions || ""],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
    ]);

    // Initialize Functor Network integration
    const functorTools = [
        new DynamicStructuredTool({
            name: "create_smart_account",
            description: "Create a smart account using Functor Network",
            schema: z.object({
                owner: z.string(),
                recoveryMechanism: z.array(z.string()),
                paymaster: z.string()
            }),
            func: async ({ owner, recoveryMechanism, paymaster }) => {
                return await FunctorService.createSmartAccount({
                    owner,
                    recoveryMechanism,
                    paymaster
                });
            }
        }),
        // Add more Functor-specific tools as needed
    ];

    const agent = createToolCallingAgent({
        llm,
        tools: [...tools, ...functorTools, ...brianToolkit.tools],
        prompt,
    });

    const agentExecutor = new AgentExecutor({
        agent,
        tools: [...tools, ...functorTools, ...brianToolkit.tools],
        callbacks: xmtpHandler
            ? [new XMTPCallbackHandler(xmtpHandler, llm, instructions!, xmtpHandlerOptions)]
            : [],
    });

    return new RunnableWithMessageHistory({
        runnable: agentExecutor,
        getMessageHistory,
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
    });
};


export const initializeAgents = async () => {
    const baseOptions = {
        apiKey: process.env["NEXT_PUBLIC_BRIAN_API_KEY"]!,
        privateKeyOrAccount: process.env["NEXT_PUBLIC_PRIVATE_KEY"] as `0x${string}`,
        llm: new ChatOpenAI({
            apiKey: process.env["NEXT_PUBLIC_OPENAI_API_KEY"]!,
            modelName: "gpt-4o",
        }),
    };

    const agents = await createSpecializedAgents(baseOptions);
    return agents;
}; 