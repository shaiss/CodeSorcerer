"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { initializeAgents } from "../agents";
import { SendHorizontal, Bot, User, PanelRightClose, PanelRightOpen } from "lucide-react";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { EXAMPLE_RESPONSES, AUTONOMOUS_EXAMPLES } from "../../lib/example";
import type { EventBus } from "../types/event-bus";
import { WebSocketEventBus } from "../services/websocket-event-bus";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { useSettingsStore } from '../stores/settingsStore';
import { ChainSelector, SUPPORTED_CHAINS } from "@/components/ui/chain-selector";
import { useChainStore } from '../stores/chainStore';
import ExamplePrompts from "@/components/ExamplePrompts";

type CollaborationType =
  | "analysis"
  | "execution"
  | "report"
  | "question"
  | "response"
  | "suggestion"
  | "decision"
  | "simulation"
  | "transaction"
  | "tool-result"
  | "handoff"
  | "task-creation";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  agentName?: string | undefined;
  collaborationType?: CollaborationType | undefined;
}

interface SystemEvent {
  timestamp: string;
  event: string;
  agent?: string | undefined;
  type: "info" | "warning" | "error" | "success";
}

interface AgentState {
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  activeAgent: string | null;
  systemEvents: SystemEvent[];
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  message?: string;
  agent?: any;
}

// Add a mapping for agent images
const agentImages = {
  trading: "/agent_trader.png",
  liquidity: "/agent_liquidity.png",
  portfolio: "/agent_default.png",
  "task-manager": "/taskManager.png",
  "executor": "/executor.png",
  "observer": "/observer.png",
  "validator": "/validator.png",
  "defi-analytics": "/agent_analyst.png",
  "cdp-agent": '/cdp-agentkit.png',
  "hedera-agent": "/hedera-agentkit.webp",
  "zircuit-agent": "/agent_analyst.png",
  "flow-agent": "/executor.png",
  "near-agent": "/near-agentkit.png",
  "eliza-agent": "/taskManager.png",
  "ip-manager": "/ip-manager.jpg",
  default: "/agent_default.png",
};

console.log(agentImages, "agentImages");

const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
  }
`;

// Add this helper function at the top level
const deduplicateMessages = (messages: Message[]): Message[] => {
  const seen = new Set<string>();
  return messages.filter(message => {
    const key = `${message.timestamp}-${message.content}-${message.agentName || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Add this interface at the top with other interfaces
interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  agentName?: string;
  collaborationType?: CollaborationType;
  type?: string;
  action?: string;
  event?: string;
  eventType?: "info" | "warning" | "error" | "success";
}

export default function Home() {
  const { settings } = useSettingsStore();
  const { selectedChain, setSelectedChain } = useChainStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [currentAgentPage, setCurrentAgentPage] = useState(1);
  const agentsPerPage = 4;

  const handlePromptClick = (promptText: string) => {
    setInput(promptText);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || agentState.isProcessing) return;
    handleMessage(input);
    setInput("");
  };

  const [agentState, setAgentState] = useState<AgentState>({
    isInitialized: false,
    isProcessing: false,
    error: null,
    activeAgent: null,
    systemEvents: [],
  });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const agentRef = useRef<any>(null);
  const eventBusRef = useRef<WebSocketEventBus | null>(null);
  const agentsRef = useRef<any>(null);
  const ws = useRef<WebSocket | null>(null);

  // Add a state variable for connection status
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  // Add a useEffect to poll connection status
  useEffect(() => {
    // Only poll if in autonomous mode
    if (!autonomousMode) return;

    const updateConnectionStatus = () => {
      if (eventBusRef.current) {
        const status = eventBusRef.current.getConnectionStatus();
        setConnectionStatus(status);
      }
    };

    // Update immediately
    updateConnectionStatus();

    // Then poll every 2 seconds
    const intervalId = setInterval(updateConnectionStatus, 2000);

    return () => clearInterval(intervalId);
  }, [autonomousMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Define additional system agents to add to those returned by initializeAgents
  const additionalSystemAgents: Agent[] = [
    {
      id: 'task-manager',
      name: 'Task Manager Agent',
      type: 'system',
      status: 'active',
      description: 'Manages and coordinates tasks across the agent ecosystem, ensuring efficient workflow and task completion.',
      agent: null
    },
    {
      id: 'executor',
      name: 'Executor Agent',
      type: 'system',
      status: 'active',
      description: 'Executes transactions and operations on various blockchain networks with security validation.',
      agent: null
    },
    {
      id: 'observer',
      name: 'Observer Agent',
      type: 'system',
      status: 'active',
      description: 'Monitors blockchain events, market conditions, and system state to provide real-time insights.',
      agent: null
    },
    {
      id: 'validator',
      name: 'Validator Agent',
      type: 'system',
      status: 'active',
      description: 'Validates transaction parameters and security constraints before execution.',
      agent: null
    },
    {
      id: 'hedera-agent',
      name: 'Hedera Agent',
      type: 'blockchain',
      status: 'active',
      description: 'Specialized agent for interacting with the Hedera network, providing token operations and balance checks.',
      agent: null
    },
    {
      id: 'cdp-agent',
      name: 'CDP Agent',
      type: 'blockchain',
      status: 'active',
      description: 'Specialized agent for cross-chain operations, bridges, and CDP-based transactions across multiple networks.',
      agent: null
    },
    {
      id: 'zircuit-agent',
      name: 'Zircuit Agent',
      type: 'blockchain',
      status: 'active',
      description: 'Manages private DeFi operations using Zircuit\'s on-chain privacy infrastructure, enabling confidential transactions and portfolio data.',
      agent: null
    },
    {
      id: 'flow-agent',
      name: 'Flow Agent',
      type: 'blockchain',
      status: 'active',
      description: 'Interacts with Flow blockchain for NFT operations, token management, and secure scaling of digital assets across the ecosystem.',
      agent: null
    },
    {
      id: 'near-agent',
      name: 'NEAR Agent',
      type: 'blockchain',
      status: 'active',
      description: 'Specialized agent for NEAR Protocol operations, including smart contract interactions, staking, and account management.',
      agent: null
    },
    {
      id: 'eliza-agent',
      name: 'Eliza Agent',
      type: 'system',
      status: 'active',
      description: 'Specializes in natural language understanding and user intent classification to route user requests to the appropriate specialized agents.',
      agent: null
    },
    {
      id: 'ip-manager',
      name: 'IP Rights Manager',
      type: 'system',
      status: 'active',
      description: 'Manages intellectual property rights for AI agent outputs using ATCP/IP protocol.',
      agent: null
    }
  ];

  // Calculate total number of pages
  const totalAgentPages = Math.ceil(agents.length / agentsPerPage);

  // Get current page agents
  const indexOfLastAgent = currentAgentPage * agentsPerPage;
  const indexOfFirstAgent = indexOfLastAgent - agentsPerPage;
  const currentAgents = agents.slice(indexOfFirstAgent, indexOfLastAgent);

  // Change page
  const nextAgentPage = () => {
    if (currentAgentPage < totalAgentPages) {
      setCurrentAgentPage(prev => prev + 1);
    }
  };

  const prevAgentPage = () => {
    if (currentAgentPage > 1) {
      setCurrentAgentPage(prev => prev - 1);
    }
  };

  // Initialize WebSocket connection and event bus
  useEffect(() => {
    // Create a single WebSocketEventBus instance for the entire component
    const websocketUrl = process.env['NEXT_PUBLIC_WS_URL'] || 'ws://localhost:3001';
    console.log(`Initializing WebSocket connection to: ${websocketUrl}`);

    const eventBus = new WebSocketEventBus(websocketUrl);
    eventBusRef.current = eventBus;

    // Log connection status
    eventBus.onConnectionStatusChange((status) => {
      console.log(`WebSocket connection status: ${status}`);
      if (status === 'connected') {
        addSystemEvent({
          event: "Connected to server",
          type: "success",
        });
      } else if (status === 'disconnected') {
        addSystemEvent({
          event: "Disconnected from server",
          type: "error",
        });
      }
    });

    // Subscribe to all events
    subscribeToAgentEvents();

    // Cleanup function
    return () => {
      console.log("Cleaning up WebSocket connection");
      if (eventBusRef.current) {
        eventBusRef.current.disconnect();
        eventBusRef.current = null;
      }
    };
  }, []);

  // Handle autonomous mode toggle
  useEffect(() => {
    if (!eventBusRef.current) return;

    // Check connection status and reconnect if necessary
    if (autonomousMode && !eventBusRef.current.isConnected()) {
      const websocketUrl = process.env['NEXT_PUBLIC_WS_URL'] || 'ws://localhost:3001';
      console.log(`Reconnecting to WebSocket: ${websocketUrl}`);
      eventBusRef.current.connect(websocketUrl);

      addSystemEvent({
        event: "Connected to server for autonomous mode",
        type: "success",
      });
    } else if (!autonomousMode && eventBusRef.current.isConnected()) {
      // Just log the state change, but don't disconnect
      console.log("Autonomous mode deactivated");

      addSystemEvent({
        event: "Autonomous mode deactivated, connection maintained",
        type: "info",
      });
    }

  }, [autonomousMode, settings, selectedChain]);

  useEffect(() => {
    const setupAgents = async () => {
      try {
        setAgentState((prev) => ({
          ...prev,
          isProcessing: true,
          systemEvents: [
            ...prev.systemEvents,
            {
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              event: "Initializing AI agents...",
              type: "info",
            },
          ],
        }));

        const initializedAgents = await initializeAgents();

        // Combine initialized agents with additional system agents
        // Avoid duplicates by filtering out any additional system agents with IDs that already exist
        const existingIds = initializedAgents.map(a => a.id);
        const filteredSystemAgents = additionalSystemAgents.filter(a => !existingIds.includes(a.id));
        const allAgents = [...initializedAgents, ...filteredSystemAgents];

        setAgents(allAgents);
        console.log("All agents initialized:", allAgents);

        setAgentState((prev) => ({
          ...prev,
          isInitialized: true,
          systemEvents: [
            ...prev.systemEvents,
            {
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              event: "AI agents initialized successfully",
              type: "success",
            },
          ],
        }));

        setMessages([
          {
            role: "assistant",
            content:
              "Hello! I'm Ava, your AI portfolio manager. I can help you manage your DeFi portfolio across multiple chains. What would you like to do?",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } catch (error) {
        setAgentState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Failed to initialize agents",
          systemEvents: [
            ...prev.systemEvents,
            {
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              event: `Initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              type: "error",
            },
          ],
        }));
      } finally {
        setAgentState((prev) => ({ ...prev, isProcessing: false }));
      }
    };

    setupAgents();
  }, []);

  const handleChainSelect = (chain: typeof SUPPORTED_CHAINS[0]) => {
    setSelectedChain(chain);
    addSystemEvent({
      event: `Chain switched to ${chain.name}`,
      type: "info",
    });

    // Also inform the server about the chain change if in autonomous mode
    if (autonomousMode && eventBusRef.current) {
      eventBusRef.current.emit("command", {
        type: "chain_change",
        chain: chain
      });

      // If this is a chain that uses the move-agent, log additional info
      if (chain.agentId === 'move-agent') {
        addSystemEvent({
          event: `Move Agent will be used for ${chain.name} operations`,
          type: "info",
        });
      }
    }
  };

  const handleMessage = async (message: string) => {
    if (!message.trim()) return;

    const timestamp = new Date().toLocaleTimeString();

    // Add user message with deduplication
    setMessages(prev => {
      const newMessage: Message = {
        role: 'user',
        content: message,
        timestamp
      };
      const updatedMessages = [...prev, newMessage];
      return deduplicateMessages(updatedMessages);
    });

    // Set processing state
    setAgentState(prev => ({
      ...prev,
      isProcessing: true
    }));

    try {
      if (autonomousMode) {
        // First check if this matches any of our AUTONOMOUS_EXAMPLES
        const autonomousExample = AUTONOMOUS_EXAMPLES.find(example =>
          example.query.toLowerCase() === message.toLowerCase() ||
          message.toLowerCase().includes(example.query.toLowerCase().substring(0, 15))
        );

        if (autonomousExample) {
          console.log("Found matching autonomous example:", autonomousExample.query);

          // Display system prompt if available
          if (autonomousExample.systemPrompt) {
            addSystemEvent({
              event: autonomousExample.systemPrompt,
              type: "info",
            });
          }

          // Play each response with a delay
          for (const response of autonomousExample.responses) {
            await new Promise(resolve => setTimeout(resolve, 10000));

            setMessages(prev => {
              const newMessage: Message = {
                ...response,
                timestamp: new Date().toLocaleTimeString(),
                role: response.role as "user" | "assistant" | "system",
                collaborationType: response.collaborationType as CollaborationType
              };
              return deduplicateMessages([...prev, newMessage]);
            });

            if (response.agentName) {
              addSystemEvent({
                event: `${response.agentName} responding with ${response.collaborationType || 'message'}`,
                agent: response.agentName,
                type: "info",
              });
            }
          }

          addSystemEvent({
            event: "Successfully executed",
            type: "success",
          });

          // Done with example, exit early
          setAgentState(prev => ({
            ...prev,
            isProcessing: false
          }));
          return;
        }

        // No matching example, proceed with server communication
        // In autonomous mode, send the message to the server
        if (!eventBusRef.current) {
          throw new Error("WebSocket connection not established");
        }

        // Ensure WebSocket is connected
        if (!eventBusRef.current.isConnected()) {
          const websocketUrl = process.env['NEXT_PUBLIC_WS_URL'] || 'ws://localhost:3001';
          console.log(`Reconnecting to WebSocket before sending command: ${websocketUrl}`);
          eventBusRef.current.connect(websocketUrl);

          // Wait briefly for connection to establish
          await new Promise((resolve) => setTimeout(resolve, 500));

          if (!eventBusRef.current.isConnected()) {
            throw new Error("Failed to establish WebSocket connection");
          }
        }

        // Check if this is a CDP-related query or other special command
        const isCDPQuery = message.toLowerCase().includes('cdp');
        const isTurnkeyQuery = message.toLowerCase().includes('turnkey') || message.toLowerCase().includes('wallet');

        addSystemEvent({
          event: `Sending command to server: ${message}`,
          type: "info",
        });

        // Send command to server with appropriate routing
        eventBusRef.current.emit('command', {
          type: 'command',
          command: message,
          selectedChain: selectedChain,
          agentPreference: isCDPQuery ? 'cdp-agent' :
            isTurnkeyQuery ? 'turnkey-agent' :
              selectedChain.agentId,
          operationType: isCDPQuery ? 'cdp-operation' :
            isTurnkeyQuery ? 'wallet-operation' :
              'standard'
        });

        addSystemEvent({
          event: `Task sent to server: ${message} (Chain: ${selectedChain.name})`,
          type: 'info',
        });

        // The rest of the handling will be managed by WebSocket events
      } else {
        // Handle regular chat mode (local agent processing)
        // Check if this is an example query
        const exampleKeys = Object.keys(EXAMPLE_RESPONSES);
        const isExampleQuery = exampleKeys.includes(message);

        if (isExampleQuery) {
          addSystemEvent({
            event: "Processing given scenario",
            type: "info",
          });

          const responses = EXAMPLE_RESPONSES[message as keyof typeof EXAMPLE_RESPONSES];
          for (const response of responses) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay for better UX
            setMessages((prev) => {
              const updatedMessages = [...prev, {
                ...response,
                timestamp: new Date().toLocaleTimeString(),
                role: response.role as "user" | "assistant" | "system",
                collaborationType: response.collaborationType as CollaborationType
              } as Message];
              return deduplicateMessages(updatedMessages);
            });

            addSystemEvent({
              event: `${response.agentName} providing ${response.collaborationType}`,
              agent: response.agentName,
              type: "info",
            });
          }

          addSystemEvent({
            event: "Task completed successfully",
            type: "success",
          });
        } else {
          // Process with local agents
          await processWithLocalAgents(message);
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
      addSystemEvent({
        event: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      // Reset processing state
      setAgentState(prev => ({
        ...prev,
        isProcessing: false
      }));
    }
  };

  // New helper function to process messages with local agents
  const processWithLocalAgents = async (message: string) => {
    addSystemEvent({
      event: "Starting agent collaboration",
      type: "info",
    });

    const portfolioAgent = agents.find((agent) => agent.id === "portfolio");
    if (!portfolioAgent || !portfolioAgent.agent) {
      addSystemEvent({
        event: "Portfolio agent not initialized",
        type: "error",
      });
      return;
    }

    const initialAnalysis = await portfolioAgent.agent.invoke(
      {
        input: `Analyze this request and determine which other agents should be involved: ${message}`,
      },
      { configurable: { sessionId: "user-1" } }
    );

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: initialAnalysis.output,
        timestamp: new Date().toLocaleTimeString(),
        agentName: "Portfolio Manager",
        collaborationType: "analysis",
      },
    ]);

    const relevantAgents = agents.filter((agent) => {
      const messageContent = message.toLowerCase();
      return (
        (messageContent.includes("trade") && agent.id === "trading") ||
        (messageContent.includes("liquidity") && agent.id === "liquidity") ||
        (messageContent.includes("analytics") && agent.id === "defi-analytics")
      );
    });

    for (const agent of relevantAgents) {
      if (!agent.agent) continue;

      const agentResponse = await agent.agent.invoke(
        {
          input: `Given the user request "${message}" and portfolio analysis "${initialAnalysis.output}", what is your perspective and recommendation?`,
        },
        { configurable: { sessionId: "user-1" } }
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: agentResponse.output,
          timestamp: new Date().toLocaleTimeString(),
          agentName: agent.name,
          collaborationType: "suggestion",
        },
      ]);
    }

    const finalConsensus = await portfolioAgent.agent.invoke(
      {
        input: `Based on all suggestions, provide a final recommendation for: ${message}`,
      },
      { configurable: { sessionId: "user-1" } }
    );

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: finalConsensus.output,
        timestamp: new Date().toLocaleTimeString(),
        agentName: "Portfolio Manager",
        collaborationType: "decision",
      },
    ]);
  };

  const addSystemEvent = (
    event: Omit<AgentState["systemEvents"][0], "timestamp">
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const newEvent = {
      ...event,
      timestamp,
    };

    setAgentState(prev => ({
      ...prev,
      systemEvents: [...prev.systemEvents, newEvent]
    }));
  };

  const subscribeToAgentEvents = () => {
    if (!eventBusRef.current) return;

    console.log("Subscribing to agent events");

    // Handle system events for right sidebar
    eventBusRef.current.subscribe('agent-event', (data: any) => {
      console.log("Agent event received:", data);
      addSystemEvent({
        event: data.action || data.event || "Event received",
        agent: data.agent || data.agentName,
        type: data.eventType || data.type || 'info',
      });
    });

    // Handle agent messages for chat
    eventBusRef.current.subscribe('agent-message', (data: any) => {
      console.log('Agent message received:', data);

      // Add the message to the chat
      setMessages(prev => {
        const newMessage = {
          role: data.role as "user" | "assistant" | "system",
          content: data.content || data.message,
          timestamp: data.timestamp || new Date().toLocaleTimeString(),
          agentName: data.agentName || 'System',
          collaborationType: data.collaborationType || 'response'
        } as Message;

        const updatedMessages = [...prev, newMessage];
        return deduplicateMessages(updatedMessages);
      });
    });

    // Handle direct Hedera responses
    eventBusRef.current.subscribe('hedera-response', (data: any) => {
      console.log('Direct Hedera response received:', data);

      // Add the message to the chat
      setMessages(prev => {
        const newMessage = {
          role: data.role as "user" | "assistant" | "system",
          content: data.message || data.content,
          timestamp: data.timestamp || new Date().toLocaleTimeString(),
          agentName: data.agentName || 'Hedera Agent',
          collaborationType: data.collaborationType || 'response'
        } as Message;

        const updatedMessages = [...prev, newMessage];
        return deduplicateMessages(updatedMessages);
      });
    });

    // Subscribe to CDP responses
    eventBusRef.current.subscribe('cdp-response', (data: any) => {
      console.log('CDP response received:', data);
      setMessages(prev => {
        const newMessage = {
          role: "assistant",
          content: data.message || data.content || JSON.stringify(data.result || {}, null, 2),
          timestamp: new Date().toLocaleTimeString(),
          agentName: 'CDP Agent',
          collaborationType: 'response'
        } as Message;

        const updatedMessages = [...prev, newMessage];
        return deduplicateMessages(updatedMessages);
      });
    });

    // Subscribe to Turnkey wallet responses
    eventBusRef.current.subscribe('turnkey-response', (data: any) => {
      console.log('Turnkey response received:', data);
      setMessages(prev => {
        const newMessage = {
          role: "assistant",
          content: data.message || data.content || JSON.stringify(data.result || {}, null, 2),
          timestamp: new Date().toLocaleTimeString(),
          agentName: 'Turnkey Wallet',
          collaborationType: 'response'
        } as Message;

        const updatedMessages = [...prev, newMessage];
        return deduplicateMessages(updatedMessages);
      });
    });

    // Subscribe to Move Agent responses
    eventBusRef.current.subscribe('move-agent-response', (data: any) => {
      console.log('Move Agent response received:', data);
      setMessages(prev => {
        const newMessage = {
          role: "assistant",
          content: data.message || data.content || JSON.stringify(data.result || {}, null, 2),
          timestamp: new Date().toLocaleTimeString(),
          agentName: 'Move Agent',
          collaborationType: 'response'
        } as Message;

        const updatedMessages = [...prev, newMessage];
        return deduplicateMessages(updatedMessages);
      });
    });

    // Subscribe to NEAR Agent responses
    eventBusRef.current.subscribe('near-agent-response', (data: any) => {
      console.log('NEAR Agent response received:', data);
      setMessages(prev => {
        const newMessage = {
          role: "assistant",
          content: data.message || data.content || JSON.stringify(data.result || {}, null, 2),
          timestamp: new Date().toLocaleTimeString(),
          agentName: 'NEAR Agent',
          collaborationType: 'response'
        } as Message;

        const updatedMessages = [...prev, newMessage];
        return deduplicateMessages(updatedMessages);
      });
    });

    // Subscribe to general result responses
    eventBusRef.current.subscribe('result', (data: any) => {
      console.log('Result received:', data);

      if (data.content || data.message || data.result) {
        setMessages(prev => {
          const newMessage = {
            role: "assistant",
            content: data.content || data.message || (typeof data.result === 'object' ? JSON.stringify(data.result, null, 2) : String(data.result)),
            timestamp: new Date().toLocaleTimeString(),
            agentName: data.agentName || data.agent || 'System',
            collaborationType: 'response'
          } as Message;

          const updatedMessages = [...prev, newMessage];
          return deduplicateMessages(updatedMessages);
        });
      }
    });

    // Subscribe to errors
    eventBusRef.current.subscribe('error', (data: any) => {
      console.error('Error received:', data);
      addSystemEvent({
        event: data.message || data.error || "An error occurred",
        agent: data.agentName || data.agent,
        type: "error",
      });
    });

    // Subscribe to connection status changes
    eventBusRef.current.onOpen(() => {
      console.log("WebSocket connection opened");
      addSystemEvent({
        event: "Connected to server",
        type: "success",
      });
    });

    eventBusRef.current.onClose(() => {
      console.log("WebSocket connection closed");
      addSystemEvent({
        event: "Disconnected from server",
        type: "error",
      });
    });

    eventBusRef.current.onError((error) => {
      console.error("WebSocket error:", error);
      addSystemEvent({
        event: `WebSocket error: ${error}`,
        type: "error",
      });
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A192F]">
      <style jsx global>{scrollbarStyles}</style>
      <Navbar className="flex-shrink-0" />

      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Agent Details */}
        <div className="w-1/4 border-r border-white/10 flex flex-col overflow-hidden max-h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Available Agents</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={prevAgentPage}
                  disabled={currentAgentPage === 1}
                  className={`px-2 py-1 rounded ${currentAgentPage === 1 ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                >
                  ←
                </button>
                <span className="text-sm">{currentAgentPage} / {totalAgentPages || 1}</span>
                <button
                  onClick={nextAgentPage}
                  disabled={currentAgentPage === totalAgentPages || agents.length === 0}
                  className={`px-2 py-1 rounded ${currentAgentPage === totalAgentPages || agents.length === 0 ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                >
                  →
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {currentAgents.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                No agents available
              </div>
            ) : (
              <>
                {/* Group agents by type */}
                {(() => {
                  // Get unique agent types from current page
                  const agentTypes = Array.from(new Set(currentAgents.map(agent => agent.type)));

                  return agentTypes.map(type => (
                    <div key={type} className="mb-4">
                      <div className="mb-2 border-b border-gray-200 pb-1">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                          {type === 'system' ? 'System Agents' :
                            type === 'blockchain' ? 'Blockchain Agents' :
                              type === 'wallet' ? 'Wallet Agents' :
                                type === 'defi' ? 'DeFi Agents' :
                                  type === 'bridge' ? 'Bridge Agents' :
                                    type === 'trading' ? 'Trading Agents' :
                                      type === 'assistant' ? 'Assistant Agents' :
                                        `${type.charAt(0).toUpperCase() + type.slice(1)} Agents`}
                        </h3>
                      </div>

                      {currentAgents
                        .filter(agent => agent.type === type)
                        .map(agent => (
                          <div
                            key={agent.id}
                            className={`p-4 mb-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${agentState.activeAgent === agent.id
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-white border"
                              }`}
                            onClick={() => setAgentState(prev => ({ ...prev, activeAgent: agent.id }))}
                          >
                            <div className="flex items-center mb-2">
                              <div className="relative w-12 h-12 mr-3">
                                <Image
                                  src={agentImages[agent.id as keyof typeof agentImages] || agentImages.default}
                                  alt={`${agent.name} avatar`}
                                  fill
                                  className="rounded-full object-cover"
                                  priority
                                />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <h3 className="font-medium text-gray-900">{agent.name}</h3>
                                  <span className={`text-xs px-2 py-1 rounded-full ${agent.status === 'active' ? 'bg-green-100 text-green-800' :
                                    agent.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {agent.status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">{agent.type || "AI Assistant"}</p>
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
                  ));
                })()}
              </>
            )}

            {/* Total agent count */}
            <div className="text-xs text-gray-500 text-center mt-2">
              Total Agents: {agents.length}
            </div>
          </div>
        </div>

        {/* Center - Chat Interface */}
        <div className="flex-1 flex flex-col bg-[#0A192F] overflow-hidden max-h-[calc(100vh-8rem)]">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {messages.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`mb-4 flex ${message.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`flex items-start max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                >
                  {/* Agent/User Icon */}
                  <div className={`flex-shrink-0 ${message.role === "user" ? "ml-2" : "mr-2"}`}>
                    {message.role === "user" ? (
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
                  <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                    {message.agentName && (
                      <span className="text-xs font-medium text-gray-500 mb-1">
                        {message.agentName}
                        {message.collaborationType && ` • ${message.collaborationType}`}
                      </span>
                    )}
                    <div
                      className={`p-3 rounded-lg ${message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-900"
                        }`}
                    >
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
          <div className="border-t border-white/10">
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <label className="text-sm text-gray-400 mr-2">Autonomous Mode</label>
                    <Switch
                      checked={autonomousMode}
                      onCheckedChange={setAutonomousMode}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                  {autonomousMode && (
                    <div className="flex items-center ml-2">
                      <div
                        className={`w-2 h-2 rounded-full mr-1 ${connectionStatus === 'connected'
                          ? 'bg-green-500'
                          : connectionStatus === 'connecting'
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-red-500'
                          }`}
                      />
                      <span className="text-xs text-gray-400">
                        {connectionStatus}
                      </span>
                      {connectionStatus !== 'connected' && (
                        <button
                          onClick={() => {
                            const websocketUrl = process.env['NEXT_PUBLIC_WS_URL'] || 'ws://localhost:3001';
                            console.log(`Manually reconnecting to WebSocket: ${websocketUrl}`);

                            if (eventBusRef.current) {
                              // First disconnect if already connected
                              eventBusRef.current.disconnect();

                              // Then reconnect
                              eventBusRef.current.connect(websocketUrl);

                              // Wait briefly for connection to be established
                              setTimeout(() => {
                                // If connected successfully and in autonomous mode, resend the start command
                                if (eventBusRef.current?.isConnected() && autonomousMode) {
                                  eventBusRef.current.emit("command", {
                                    type: "command",
                                    command: "start",
                                    settings: {
                                      aiProvider: settings.aiProvider || "openai",
                                      enablePrivateCompute: settings.enablePrivateCompute || false,
                                      selectedChain: selectedChain
                                    }
                                  });

                                  addSystemEvent({
                                    event: "Autonomous mode restored after reconnection",
                                    type: "success",
                                  });
                                }
                              }, 1000);
                            }

                            addSystemEvent({
                              event: "Reconnecting to server...",
                              type: "info",
                            });
                          }}
                          className="ml-2 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Reconnect
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Chain Selector */}
                <ChainSelector
                  onChainSelect={handleChainSelect}
                  selectedChain={selectedChain}
                />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-black/20 p-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your message..."
                  />
                  <Button type="submit" disabled={agentState.isProcessing}>
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Sample Prompts Section */}
            <ExamplePrompts handlePromptClick={handlePromptClick} />
          </div>
        </div>

        {/* Right Sidebar - System Events */}
        <div
          className={`transition-all duration-300 flex flex-col border-l border-white/10 max-h-[calc(100vh-8rem)] ${isRightSidebarOpen ? 'w-1/4' : 'w-[40px]'
            }`}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            {isRightSidebarOpen && (
              <h2 className="text-lg font-semibold">System Events</h2>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
              title={isRightSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isRightSidebarOpen ? (
                <PanelRightClose className="h-5 w-5 text-gray-600 hover:text-gray-900" />
              ) : (
                <PanelRightOpen className="h-5 w-5 text-gray-600 hover:text-gray-900" />
              )}
            </Button>
          </div>

          {isRightSidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {agentState.systemEvents.map((event, index) => (
                <div
                  key={index}
                  className={`p-3 mb-2 rounded-lg ${event.type === "error"
                    ? "bg-red-100"
                    : event.type === "success"
                      ? "bg-green-100"
                      : event.type === "warning"
                        ? "bg-yellow-100"
                        : "bg-blue-100"
                    }`}
                >
                  <div className="text-sm font-medium">
                    {event.agent && (
                      <span className="text-gray-600">[{event.agent}] </span>
                    )}
                    <span className="text-gray-900">{event.event}</span>
                  </div>
                  <div className="text-xs text-gray-500">{event.timestamp}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer className="flex-shrink-0" />
    </div>
  );
}