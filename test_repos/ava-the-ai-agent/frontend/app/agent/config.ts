"use client";

import { ChatOpenAI } from "@langchain/openai";
import { createBrianAgent } from "@brian-ai/langchain";
import OpenAI from "openai";

interface AgentConfig {
    brianApiKey: string;
    privateKey: string;
    aiProvider: 'openai' | 'venice' | 'atoma';
    aiApiKey: string;
    aiModel?: string;
}

export const initializeAgent = async (config: AgentConfig) => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        let llm;
        
        if (config.aiProvider === 'venice') {
            // Initialize Venice-compatible OpenAI client
            const veniceClient = new OpenAI({
                apiKey: config.aiApiKey,
                baseURL: "https://api.venice.ai/api/v1",
            });

            // Create a ChatOpenAI instance that uses Venice
            llm = new ChatOpenAI({
                modelName: config.aiModel || "dolphin-2.9.2-qwen2-72b",
                temperature: 0.2,
                openAIApiKey: config.aiApiKey,
                configuration: {
                    baseURL: "https://api.venice.ai/api/v1",
                    defaultHeaders: {
                        "venice_parameters": JSON.stringify({
                            include_venice_system_prompt: false,
                        }),
                    },
                },
            });
        } else if (config.aiProvider === 'atoma')   {
            // Initialize Atoma-compatible OpenAI client
            const atomaClient = new OpenAI({
                apiKey: config.aiApiKey,
                baseURL: "https://api.atoma.ai/v1",
            });

            // Create a ChatOpenAI instance that uses Atoma
            llm = new ChatOpenAI({
                modelName: config.aiModel || "gpt-4o",
                temperature: 0.2,
                openAIApiKey: config.aiApiKey,
                configuration: {    
                    baseURL: "https://api.atoma.ai/v1",
                    defaultHeaders: {
                        "atoma_parameters": JSON.stringify({
                            include_atoma_system_prompt: false,
                        }),
                    },  
                },
            });
        } else {
            // Default to OpenAI
            llm = new ChatOpenAI({
                apiKey: config.aiApiKey,
                modelName: config.aiModel || "gpt-4o",
                temperature: 0.2
            });
        }

        const agent = await createBrianAgent({
            apiKey: config.brianApiKey,
            privateKeyOrAccount: config.privateKey as `0x${string}`,
            llm,
        });

        return agent;
    } catch (error) {
        console.error("Agent initialization failed:", error);
        return null;
    }
};

export const CONFIG = {
    SUPPORTED_CHAINS: ['avalanche', 'mode', 'base'],
    DEFAULT_RISK_LEVEL: 5,
    MAX_TRADE_SIZE: '1000000000000000000', // 1 TOKEN
    REFRESH_INTERVAL: 10000, // 10 seconds
    GELATO_RELAY_API_KEY: process.env['NEXT_PUBLIC_GELATO_API_KEY'] || '',

    // AI Configuration
    AI_PROVIDER: process.env['NEXT_PUBLIC_AI_PROVIDER'] || 'openai',
    AI_MODEL: process.env['NEXT_PUBLIC_AI_MODEL'] || 'gpt-4o',
    VENICE_API_KEY: process.env['NEXT_PUBLIC_VENICE_API_KEY'] || '',
    VENICE_MODEL: process.env['NEXT_PUBLIC_VENICE_MODEL'] || 'dolphin-2.9.2-qwen2-72b',

    // Contract addresses per network
    ADDRESSES: {
        avalanche: {
            dex: '0x...',
            aiAgent: '0x...',
            tokenA: '0x...',
            tokenB: '0x...'
        },
        mode: {
            dex: '0x...',
            aiAgent: '0x...',
            tokenA: '0x...',
            tokenB: '0x...'
        },
        base: {
            dex: '0x...',
            aiAgent: '0x...',
            tokenA: '0x...',
            tokenB: '0x...'
        }
    }
};