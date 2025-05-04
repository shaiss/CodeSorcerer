"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createBrianAgent } from "@brian-ai/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { Client } from "@xmtp/xmtp-js";
import { ethers } from "ethers";
import { BrianToolkit } from "@brian-ai/langchain";
import { AvalancheConfig } from "@brian-ai/langchain/chains";
import { initializeAgents } from "../agents";
import { SendHorizontal, Bot, User } from "lucide-react";
import { AgentCharacters } from "./agents/AgentCharacters";
import Image from 'next/image';

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
}

interface AgentState {
    isInitialized: boolean;
    isProcessing: boolean;
    error: string | null;
    activeAgent: string | null;
    systemEvents: Array<{
        timestamp: string;
        event: string;
        agent?: string;
        type: 'info' | 'warning' | 'error' | 'success';
    }>;
}

interface Agent {
    id: string;
    name: string;
    type: string;
    status: string;
    message?: string;
    agent?: any;
}

// Add this interface for agent collaboration messages
interface CollaborationMessage extends Message {
    agentId?: string;
    agentName?: string;
    collaborationType?: 'question' | 'response' | 'suggestion' | 'decision';
}

// Add this near the top of the file with other constants
const EXAMPLE_RESPONSES = {
    "I have 10 AVAX and want to optimize my portfolio between lending, liquidity provision, and trading. What's the best strategy right now?": [
        // Portfolio Manager Initial Analysis
        {
            role: "assistant",
            content: "Analyzing your 10 AVAX portfolio allocation request. Given current market conditions, we should evaluate lending rates, LP opportunities, and trading pairs. Let me consult our specialized agents.",
            agentName: "Portfolio Manager",
            collaborationType: "analysis",
            timestamp: "10:30 AM"
        },

        // DeFi Analytics Agent Response
        {
            role: "assistant",
            content: "Current market analysis:\n- Aave AVAX lending APY: 1,77%\n- Uniswap AVAX-USDC pool APR: 43.893%\n- Curve Blizz pool APY: 1.58%\nTotal DeFi TVL trend is up 5% this week, suggesting growing stability.",
            agentName: "DeFi Analytics",
            collaborationType: "suggestion",
            timestamp: "10:31 AM"
        },

        // Liquidity Pool Agent Response
        {
            role: "assistant",
            content: "Recommended LP allocation:\n1. AVAX-USDC Uniswap V3 (concentrated liquidity 1800-2200): 4 AVAX\n2. blizz Curve: 3 AVAX\nCurrent impermanent loss risk: Moderate",
            agentName: "Liquidity Pool Agent",
            collaborationType: "suggestion",
            timestamp: "10:31 AM"
        },

        // Trading Agent Response
        {
            role: "assistant",
            content: "Market conditions favor keeping 3 AVAX in spot for potential swing trading. Key resistance at $2,200, support at $1,850. Set up limit orders at these levels.",
            agentName: "Trading Agent",
            collaborationType: "suggestion",
            timestamp: "10:32 AM"
        },

        // Portfolio Manager Final Consensus
        {
            role: "assistant",
            content: "Based on all analyses, here's your optimized portfolio strategy for 10 AVAX:\n\n1. Liquidity Provision (7 AVAX):\n   - 4 AVAX in Uniswap AVAX-USDC\n   - 3 AVAX in Curve blizz pool\n\n2. Trading Reserve (3 AVAX):\n   - Set limit orders at $2,200 and $1,850\n\nRationale: This allocation maximizes yield while maintaining trading flexibility. Expected monthly yield: ~10.5% APY\n\nShall I provide step-by-step implementation instructions?",
            agentName: "Portfolio Manager",
            collaborationType: "decision",
            timestamp: "10:32 AM"
        }
    ],
    "What are the best yield opportunities across DeFi right now, considering risks and TVL?": [
        // Portfolio Manager Initial Analysis
        {
            role: "assistant",
            content: "I'll analyze current DeFi yield opportunities with a focus on risk assessment and TVL stability. Let me coordinate with our specialists.",
            agentName: "Portfolio Manager",
            collaborationType: "analysis",
            timestamp: "2:45 PM"
        },

        // DeFi Analytics Agent
        {
            role: "assistant",
            content: "Protocol TVL Analysis:\n1. AAVE: $5.2B (↑2% week)\n2. Curve: $3.8B (stable)\n3. Convex: $3.1B (↑5% week)\n\nRisk Metrics:\n- Smart Contract Risk: Low-Medium\n- Protocol Maturity: High\n- Audit Status: All Recently Audited",
            agentName: "DeFi Analytics",
            collaborationType: "suggestion",
            timestamp: "2:46 PM"
        },

        // Liquidity Agent
        {
            role: "assistant",
            content: "Top Stable Opportunities:\n1. Curve tricrypto pool: 8.2% APY\n2. Convex stETH pool: 7.5% APY\n3. AAVE USDC lending: 4.8% APY\n\nVolatility Index: Low for all mentioned pools",
            agentName: "Liquidity Pool Agent",
            collaborationType: "suggestion",
            timestamp: "2:46 PM"
        },

        // Trading Agent
        {
            role: "assistant",
            content: "Market Correlation Analysis:\n- Curve pools showing 0.3 correlation with ETH price\n- Lending rates expected to increase with upcoming Fed meeting\n- Volume analysis suggests stable liquidity in major pools",
            agentName: "Trading Agent",
            collaborationType: "suggestion",
            timestamp: "2:47 PM"
        },

        // Final Consensus
        {
            role: "assistant",
            content: "Based on comprehensive analysis, here are the top yield opportunities ranked by risk-adjusted returns:\n\n1. Best Safe Yield:\n   - Curve tricrypto pool (8.2% APY)\n   - Risk: Low, TVL: $825M\n\n2. Best Moderate Risk:\n   - Convex stETH pool (7.5% APY)\n   - Additional CRV rewards possible\n\n3. Best Conservative:\n   - AAVE USDC lending (4.8% APY)\n   - Lowest risk, highest liquidity\n\nRecommended Strategy:\n- Split allocation: 40% tricrypto, 40% stETH, 20% lending\n- Set up alerts for rate changes above 2%\n\nWould you like detailed entry instructions for any of these opportunities?",
            agentName: "Portfolio Manager",
            collaborationType: "decision",
            timestamp: "2:47 PM"
        }
    ],

};

// Add a mapping for agent images
const agentImages = {
    'trading': '/agent_trader.png',
    'liquidity': '/agent_liquidity.png',  // You can add different images for each agent
    'portfolio': '/agent_default.png',
    'defi-analytics': '/agent_analyst.png'
};

export default function Home() {
    const [messages, setMessages] = useState<CollaborationMessage[]>([]);
    const [input, setInput] = useState("");
    const [agentState, setAgentState] = useState<AgentState>({
        isInitialized: false,
        isProcessing: false,
        error: null,
        activeAgent: null,
        systemEvents: []
    });
    const [agents, setAgents] = useState<Agent[]>([]);

    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const clientRef = useRef<any>(null);
    const agentRef = useRef<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const setupAgents = async () => {
            try {
                setAgentState(prev => ({
                    ...prev,
                    isProcessing: true,
                    systemEvents: [...prev.systemEvents, {
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        event: 'Initializing AI agents...',
                        type: 'info'
                    }]
                }));

                const initializedAgents = await initializeAgents();
                setAgents(initializedAgents);

                setAgentState(prev => ({
                    ...prev,
                    isInitialized: true,
                    systemEvents: [...prev.systemEvents, {
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        event: 'AI agents initialized successfully',
                        type: 'success'
                    }]
                }));

                setMessages([{
                    role: "assistant",
                    content: "Hello! I'm Ava, your AI portfolio manager. I can help you manage your DeFi portfolio across multiple chains. What would you like to do?",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
            } catch (error) {
                setAgentState(prev => ({
                    ...prev,
                    error: error instanceof Error ? error.message : 'Failed to initialize agents',
                    systemEvents: [...prev.systemEvents, {
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        event: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        type: 'error'
                    }]
                }));
            } finally {
                setAgentState(prev => ({ ...prev, isProcessing: false }));
            }
        };

        setupAgents();
    }, []);

    const handleMessage = async (message: string) => {
        try {
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Add user message
            setMessages(prev => [...prev, {
                role: "user",
                content: message,
                timestamp
            }]);

            // Check if this is an example query
            if (message in EXAMPLE_RESPONSES) {
                // Add system event for example response
                setAgentState(prev => ({
                    ...prev,
                    isProcessing: true,
                    systemEvents: [...prev.systemEvents, {
                        timestamp,
                        event: 'Processing example scenario',
                        type: 'info'
                    }]
                }));

                // Simulate delay for realistic feel
                for (const response of EXAMPLE_RESPONSES[message]) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                    setMessages(prev => [...prev, {
                        ...response,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);

                    // Add corresponding system event
                    setAgentState(prev => ({
                        ...prev,
                        systemEvents: [...prev.systemEvents, {
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            event: `${response.agentName} providing ${response.collaborationType}`,
                            agent: response.agentName,
                            type: 'info'
                        }]
                    }));
                }

                setAgentState(prev => ({
                    ...prev,
                    isProcessing: false,
                    systemEvents: [...prev.systemEvents, {
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        event: 'Example scenario completed',
                        type: 'success'
                    }]
                }));

                return;
            }

            // Existing dynamic response logic
            setAgentState(prev => ({
                ...prev,
                isProcessing: true,
                systemEvents: [...prev.systemEvents, {
                    timestamp,
                    event: 'Starting agent collaboration',
                    type: 'info'
                }]
            }));

            // Initial analysis by Portfolio Agent
            const portfolioAgent = agents.find(agent => agent.id === 'portfolio');
            const initialAnalysis = await portfolioAgent?.agent?.invoke(
                { input: `Analyze this request and determine which other agents should be involved: ${message}` },
                { configurable: { sessionId: "user-1" } }
            );

            setMessages(prev => [...prev, {
                role: "assistant",
                content: initialAnalysis.output,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                agentId: 'portfolio',
                agentName: 'Portfolio Manager',
                collaborationType: 'analysis'
            }]);

            // Determine relevant agents based on message content
            const relevantAgents = agents.filter(agent => {
                const messageContent = message.toLowerCase();
                return (
                    (messageContent.includes('trade') && agent.id === 'trading') ||
                    (messageContent.includes('liquidity') && agent.id === 'liquidity') ||
                    (messageContent.includes('analytics') && agent.id === 'defi-analytics')
                );
            });

            console.log(relevantAgents, "relevantAgents selected are");

            // Get input from each relevant agent
            for (const agent of relevantAgents) {
                const agentResponse = await agent?.agent?.invoke(
                    {
                        input: `Given the user request "${message}" and portfolio analysis "${initialAnalysis.output}", what is your perspective and recommendation?`
                    },
                    { configurable: { sessionId: "user-1" } }
                );

                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: agentResponse.output,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    agentId: agent.id,
                    agentName: agent.name,
                    collaborationType: 'suggestion'
                }]);
            }

            // Final consensus
            const finalConsensus = await portfolioAgent?.agent?.invoke(
                { input: `Based on all suggestions, provide a final recommendation for: ${message}` },
                { configurable: { sessionId: "user-1" } }
            );

            setMessages(prev => [...prev, {
                role: "assistant",
                content: finalConsensus.output,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                agentId: 'portfolio',
                agentName: 'Portfolio Manager',
                collaborationType: 'decision'
            }]);

        } catch (error) {
            console.error('Error in collaboration:', error);
            setMessages(prev => [...prev, {
                role: "system",
                content: "An error occurred during agent collaboration. Please try again.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setAgentState(prev => ({ ...prev, isProcessing: false, activeAgent: null }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || agentState.isProcessing) return;
        handleMessage(input);
        setInput("");
    };

    return (
        <main className="flex h-[calc(100vh-theme(spacing.16)-theme(spacing.16))]">
            {/* Left Sidebar - Agent Details */}
            <div className="w-1/4 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                    <h2 className="text-lg font-semibold mb-4">Available Agents</h2>
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className={`p-4 mb-4 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${agentState.activeAgent === agent.id ? 'bg-blue-50 border border-blue-200' : 'bg-white border'
                                }`}
                        >
                            <div className="flex items-center mb-2">
                                <div className="relative w-12 h-12 mr-3">
                                    <Image
                                        src={agentImages[agent.id as keyof typeof agentImages]}
                                        alt={agent.name}
                                        fill
                                        className="rounded-full object-cover"
                                        priority
                                    />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">{agent.name}</h3>
                                    <p className="text-xs text-gray-500">AI Assistant</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{agent.description}</p>
                            {agentState.activeAgent === agent.id && (
                                <div className="mt-2 text-xs text-blue-600 flex items-center">
                                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
                                    Active
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Center - Chat Interface */}
            <div className="flex-1 flex flex-col">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4">
                    {messages.map((message, index) => (
                        <div key={index} className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}>
                            <div className={`flex items-start max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                }`}>
                                {/* Agent/User Icon */}
                                <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                                    {message.role === 'user' ? (
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                                <Bot className="w-5 h-5 text-white" />
                                            </div>
                                            {message.collaborationType && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Message Content */}
                                <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {message.agentName && (
                                        <span className="text-xs font-medium text-gray-500 mb-1">
                                            {message.agentName}
                                            {message.collaborationType && ` • ${message.collaborationType}`}
                                        </span>
                                    )}
                                    <div className={`p-3 rounded-lg ${message.role === 'user'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-900'
                                        }`}>
                                        {message.content}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {message.timestamp}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <div className="border-t">
                    <form onSubmit={handleSubmit} className="p-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1 rounded-lg border p-2"
                                placeholder="Type your message..."
                            />
                            <Button type="submit" disabled={agentState.isProcessing}>
                                <SendHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Sidebar - System Events */}
            <div className="w-1/4 border-l border-gray-200 overflow-y-auto">
                <div className="p-4">
                    <h2 className="text-lg font-semibold mb-4">System Events</h2>
                    {agentState.systemEvents.map((event, index) => (
                        <div
                            key={index}
                            className={`p-3 mb-2 rounded-lg ${event.type === 'error' ? 'bg-red-100' :
                                event.type === 'success' ? 'bg-green-100' :
                                    event.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                                }`}
                        >
                            <div className="text-sm font-medium">
                                {event.agent && <span className="text-gray-600">[{event.agent}] </span>}
                                <span className="text-gray-900">{event.event}</span>
                            </div>
                            <div className="text-xs text-gray-500">{event.timestamp}</div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}