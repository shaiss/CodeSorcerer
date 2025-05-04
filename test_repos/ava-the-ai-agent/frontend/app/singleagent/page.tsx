"use client";

import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { useState, useRef, useEffect } from "react";
import { Client } from "@xmtp/xmtp-js";
import { ethers } from "ethers";
import { BrianToolkit } from "@brian-ai/langchain";
import { AvalancheConfig } from "@brian-ai/langchain/chains";

// Define interfaces
interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

interface AgentState {
    isExecuting: boolean;
    currentTask: string | null;
    lastUpdate: string;
    progress: number;
}

export default function Home() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [agentState, setAgentState] = useState<AgentState>({
        isExecuting: false,
        currentTask: null,
        lastUpdate: "",
        progress: 0
    });

    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const clientRef = useRef<any>(null);
    const agentRef = useRef<any>(null);

    // Initialize Brian AI agent with Avalanche configuration
    useEffect(() => {
        const initAgent = async () => {
            try {
                // Validate environment variables
                const brianApiKey = process.env["NEXT_PUBLIC_BRIAN_API_KEY"];
                const privateKey = process.env["NEXT_PUBLIC_PRIVATE_KEY"];
                const openAiKey = process.env["NEXT_PUBLIC_OPENAI_API_KEY"];

                if (!brianApiKey || !privateKey || !openAiKey) {
                    throw new Error("Missing required environment variables");
                }

                // Format private key
                const formattedPrivateKey = privateKey.startsWith('0x')
                    ? privateKey
                    : `0x${privateKey}`;

                // Create Brian AI agent with Avalanche configuration
                const agent = await createBrianAgent({
                    apiKey: brianApiKey,
                    privateKeyOrAccount: formattedPrivateKey as `0x${string}`,
                    llm: new ChatOpenAI({
                        apiKey: openAiKey,
                        modelName: "gpt-4o",
                        temperature: 0.7,
                    }),
                    config: {
                        defaultChain: "avalanche",
                        supportedChains: ["avalanche"],
                        // Add Avalanche-specific configurations
                        avalanche: {
                            rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
                            chainId: 43114,
                            // Add commonly used contract addresses
                            contracts: {
                                router: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", // Trader Joe Router
                                factory: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10", // Trader Joe Factory
                            }
                        }
                    }
                });


                // Initialize Brian toolkit for additional functionality
                const brianToolkit = new BrianToolkit({
                    apiKey: brianApiKey,
                    privateKeyOrAccount: formattedPrivateKey as `0x${string}`,
                });

                // Store agent and toolkit references
                agentRef.current = agent;

                // Add initial system message
                setMessages([{
                    role: "system",
                    content: "I am your Avalanche portfolio management AI agent. I can help optimize your portfolio through autonomous execution of trades, yield farming, and risk management. What would you like me to help you with?"
                }]);

            } catch (error) {
                console.error("Failed to initialize agent:", error);
                setMessages([{
                    role: "system",
                    content: `Error initializing agent: ${error.message}`
                }]);
            }
        };

        initAgent();
    }, []);

    // Update executeAutonomously function to use Brian agent capabilities
    const executeAutonomously = async (goal: string) => {
        if (!agentRef.current) {
            setMessages(prev => [...prev, {
                role: "system",
                content: "Agent not initialized. Please try again."
            }]);
            return;
        }

        setAgentState({
            isExecuting: true,
            currentTask: "Planning portfolio optimization strategy...",
            lastUpdate: new Date().toISOString(),
            progress: 0
        });

        try {
            // Get current portfolio state
            const portfolioAnalysis = await agentRef.current.invoke({
                input: "Analyze current portfolio holdings and performance metrics"
            });

            console.log("portfolioAnalysis", portfolioAnalysis);

            // Generate optimization strategy
            const strategy = await agentRef.current.invoke({
                input: `Based on the following portfolio analysis: ${portfolioAnalysis.output}, 
                create a detailed strategy to achieve this goal: ${goal}`
            });

            console.log("strategy", strategy);

            // Ensure strategy output is in JSON format
            let strategyOutput = strategy.output;

            // Handle case where output is a text description instead of JSON
            if (typeof strategyOutput === 'string' && !strategyOutput.trim().startsWith('{') && !strategyOutput.trim().startsWith('[')) {
                // Extract code blocks if present
                const codeBlockMatch = strategyOutput.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (codeBlockMatch) {
                    strategyOutput = codeBlockMatch[1];
                } else {
                    // Convert descriptive text to JSON steps array
                    const steps = strategyOutput.split(/\d+\.\s+\*\*/).filter(Boolean).map(step => {
                        const description = step.replace(/\*\*/g, '').trim();
                        return { description };
                    });
                    strategyOutput = JSON.stringify(steps);
                }
            }

            // Update strategy with parsed output
            strategy.output = strategyOutput;


            // Parse strategy steps
            const steps = JSON.parse(strategy.output);

            console.log("steps", steps);

            // Execute each step
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];

                setAgentState(prev => ({
                    ...prev,
                    currentTask: step.description,
                    progress: (i / steps.length) * 100,
                    lastUpdate: new Date().toISOString()
                }));

                // Execute transaction or analysis
                const result = await agentRef.current.invoke({
                    input: `Execute this step: ${step.description}`,
                    // Add additional context from previous steps
                    context: {
                        previousSteps: steps.slice(0, i),
                        portfolioState: portfolioAnalysis.output
                    }
                });

                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: `✅ ${step.description}\n${result.output}`
                }]);

                // Add delay between steps
                await new Promise(r => setTimeout(r, 1000));
            }

            // Final update
            setAgentState(prev => ({
                ...prev,
                isExecuting: false,
                currentTask: null,
                progress: 100
            }));

        } catch (error) {
            console.error("Autonomous execution failed:]", error);
            setMessages(prev => [...prev, {
                role: "system",
                content: `❌ Error during execution: ${error.message}`
            }]);
            setAgentState(prev => ({
                ...prev,
                isExecuting: false,
                currentTask: null
            }));
        }
    };

    // Handle user input submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);

        // Start autonomous execution
        executeAutonomously(userMessage);
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-900">
            <div className="flex-1 p-4">
                {/* Messages Display */}
                <div className="space-y-4 mb-4">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`p-4 rounded-lg ${msg.role === "user" ? "bg-blue-900" : "bg-gray-800"
                            }`}>
                            <p className="text-white">{msg.content}</p>
                        </div>
                    ))}
                </div>

                {/* Agent Status Display */}
                {agentState.isExecuting && (
                    <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                        <h3 className="text-white font-bold">Current Task:</h3>
                        <p className="text-white">{agentState.currentTask}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${agentState.progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="mt-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter your portfolio management goal..."
                        className="w-full p-4 rounded-lg bg-gray-800 text-white"
                        disabled={agentState.isExecuting}
                    />
                    <button
                        type="submit"
                        disabled={agentState.isExecuting || !input.trim()}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                        {agentState.isExecuting ? "Agent is working..." : "Start Execution"}
                    </button>
                </form>
            </div>
        </div>
    );
}
