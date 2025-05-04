// // src/index.ts
// import { serve } from "@hono/node-server";
// import { app } from "./app";
// import env from "./env";
// import { registerAgents } from "./agents";
// import { EventBus } from "./comms";
// import { privateKeyToAccount } from "viem/accounts";
// import { setupWebSocket } from "./websocket";
// import figlet from "figlet";
import { WebSocket } from 'ws';
import { createPrivateKey } from "crypto";
import { Account, createWalletClient, http } from "viem";
import { env } from "./env";
import { EventBus } from "./comms/event-bus";
import { A2ABus } from "./comms/a2a-bus";
import { AIFactory } from "./services/ai/factory";
import { registerAgents } from "./agents";
import { HybridStorage } from "./agents/plugins/hybrid-storage";
import { ATCPIPProvider } from "./agents/plugins/atcp-ip";
import { MessageRole } from "./types/a2a";
import { mcpService } from "./app";
import app, { 
  observerA2AMiddleware, 
  executorA2AMiddleware, 
  taskManagerA2AMiddleware, 
  wss 
} from "./app";
import pino from "pino";

// console.log(figlet.textSync("AVA-2.0"));
// console.log("======== Initializing Server =========");

// // Initialize event bus and agents
// const eventBus = new EventBus();
// const account = privateKeyToAccount(env.PRIVATE_KEY as `0x${string}`);
// export const agents = registerAgents(eventBus, account);

// const PORT = env.PORT || 3001;

// serve(
//   {
//     fetch: app.fetch,
//     port: PORT,
//   },
//   (info) => {
//     console.log(`[🚀] Server running on http://localhost:${info.port}`);
//     console.log(`[👀] Observer agent starting...`);

//     console.log("Event bus", eventBus);
//     // Setup WebSocket server
//     setupWebSocket(eventBus);

//     // agents.observerAgent.start(account.address);
//   }
// );

// Create a logger
const logger = pino.default({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Add process-level error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // Continue running despite errors
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Continue running despite errors
});

const WS_PORT = parseInt(env.WS_PORT || '8020');
const HTTP_PORT = parseInt(env.HTTP_PORT || '3020');

// Initialize blockchain wallet client and account
const PRIVATE_KEY = env.PRIVATE_KEY || "0x";
const account: Account = {
  address: env.WALLET_ADDRESS as `0x${string}`,
  privateKey: PRIVATE_KEY as `0x${string}`,
};

const walletClient = createWalletClient({
  account,
  transport: http(),
});

// initialize event bus for agent communication
const eventBus = new EventBus();

// Initialize A2A bus for standardized agent-to-agent communication
const a2aBus = new A2ABus(env.API_BASE_URL || '');

// Create storage and ATCP/IP providers
const storage = new HybridStorage({
  network: 'testnet',
  syncInterval: 2 * 60 * 1000, // 2 minutes
  batchSize: 4, // 4KB
  eventBus,
  bucketAlias: 'ava',
  maxRetries: 5,
  retryDelay: 1000, // Start with 1 second delay
});

const atcpipProvider = new ATCPIPProvider({
  agentId: 'ava'
});

// Set up AI provider
const defaultProvider = AIFactory.createProvider({
  provider: 'openai',
  apiKey: env.OPENAI_API_KEY
});

// Register MCP servers
// Brave Search MCP server for web search capabilities
mcpService.registerServer('brave-search', {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-brave-search'],
  env: { BRAVE_API_KEY: env.BRAVE_API_KEY || '' }
});

// Filesystem MCP server for file operations
mcpService.registerServer('filesystem', {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
});

// Register the agents
const agents = registerAgents(
  eventBus,
  account,
  defaultProvider,
  storage,
  atcpipProvider
);

// Register the agents with the A2A middleware
observerA2AMiddleware.registerTaskProcessor('observer', async (request) => {
  return await agents.observerAgent.processA2ATask(request);
});

executorA2AMiddleware.registerTaskProcessor('executor', async (request) => {
  return await agents.executorAgent.processA2ATask(request);
});

taskManagerA2AMiddleware.registerTaskProcessor('task-manager', async (request) => {
  return await agents.taskManagerAgent.processA2ATask(request);
});

// Initialize services
async function initializeServices() {
  try {
    console.log(`Starting server...`);
    
    // Start MCP servers
    console.log(`Starting MCP servers...`);
    await mcpService.startAll();
    console.log(`MCP servers started successfully!`);

    // Start HTTP server
    app.listen(HTTP_PORT, () => {
      console.log(`HTTP server listening on port ${HTTP_PORT}`);
    });

    // WebSocket server for frontend communication
    console.log(`WebSocket server starting on port ${WS_PORT}...`);

    // Define WebSocket message handlers
    wss.on("connection", (ws: WebSocket) => {
      console.log(`[WebSocket] Client connected on port ${WS_PORT}`);

      // Send initial connection message
      ws.send(JSON.stringify({
        type: "connection-established",
        timestamp: new Date().toLocaleTimeString()
      }));

      // Forward agent events to the WebSocket client
      const handleAgentAction = (data: any) => {
        ws.send(JSON.stringify({
          type: "agent-action",
          timestamp: new Date().toLocaleTimeString(),
          data
        }));
      };

      const handleAgentMessage = (data: any) => {
        ws.send(JSON.stringify({
          type: "agent-message",
          timestamp: new Date().toLocaleTimeString(),
          ...data
        }));
      };

      const handlePositionUpdate = (data: any) => {
        ws.send(JSON.stringify({
          type: "position-update",
          timestamp: new Date().toLocaleTimeString(),
          data
        }));
      };

      const handleTaskUpdate = (data: any) => {
        ws.send(JSON.stringify({
          type: "task-update",
          timestamp: new Date().toLocaleTimeString(),
          data
        }));
      };

      // Register WebSocket event listeners
      eventBus.on("agent-action", handleAgentAction);
      eventBus.on("agent-message", handleAgentMessage);
      eventBus.on("position-update", handlePositionUpdate);
      eventBus.on("task-update", handleTaskUpdate);

      // Handle messages from the client
      ws.on("message", async (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`[WebSocket] Received message of type: ${data.type}`);

          // Process messages based on type
          if (data.type === "command") {
            if (!data.command) {
              ws.send(JSON.stringify({
                type: "error",
                message: "No command provided",
                timestamp: new Date().toLocaleTimeString()
              }));
              return;
            }

            // Check if using A2A protocol
            if (data.useA2A && data.targetAgent) {
              // Create A2A message
              const a2aMessage = {
                role: MessageRole.USER,
                parts: [{ text: data.command }]
              };

              // Send task to agent using A2A protocol
              try {
                const response = await a2aBus.sendTask(data.targetAgent, a2aMessage);
                
                // Forward response to frontend
                ws.send(JSON.stringify({
                  type: "a2a-response",
                  taskId: response.id,
                  status: response.status,
                  messages: response.messages,
                  timestamp: new Date().toLocaleTimeString()
                }));
              } catch (error) {
                ws.send(JSON.stringify({
                  type: "error",
                  message: `A2A communication error: ${error instanceof Error ? error.message : String(error)}`,
                  timestamp: new Date().toLocaleTimeString()
                }));
              }
            } else {
              // Legacy command handling using event bus
              // Add user message to chat
              ws.send(JSON.stringify({
                type: "agent-message",
                timestamp: new Date().toLocaleTimeString(),
                role: "user",
                content: data.command,
                agentName: "user",
              }));

              if (data.command === "stop") {
                agents.observerAgent.stop();
                eventBus.emit("agent-action", {
                  agent: "system",
                  action: "All agents stopped",
                });
              } else {
                // Check if a specific chain is selected
                const chainInfo = data.selectedChain ? 
                  `for ${data.selectedChain.name} chain` : '';
                
                eventBus.emit("agent-action", {
                  agent: "system",
                  action: `Starting task processing ${chainInfo}`,
                });
                
                // Create task with options including selectedChain if provided
                const taskOptions = {
                  targetAgent: data.agentPreference,
                  operationType: data.operationType,
                  selectedChain: data.selectedChain
                };
                
                // Create and process task through task manager
                const taskId = await agents.taskManagerAgent.createTask(data.command, taskOptions);
                // Get the task from the task manager and then assign it
                const task = await agents.taskManagerAgent.getTaskById(taskId);
                if (task) {
                  await agents.taskManagerAgent.assignTask(task);
                }
              }
            }
          }
        } catch (error) {
          console.error("[WebSocket] Error processing message:", error);
          ws.send(JSON.stringify({
            type: "error",
            message: `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toLocaleTimeString()
          }));
        }
      });

      // Handle WebSocket close
      ws.on("close", () => {
        console.log(`[WebSocket] Client disconnected`);
        // Remove event listeners
        eventBus.unregister("agent-action", handleAgentAction);
        eventBus.unregister("agent-message", handleAgentMessage);
        eventBus.unregister("position-update", handlePositionUpdate);
        eventBus.unregister("task-update", handleTaskUpdate);
      });
    });

    console.log(`[Server] Initialization complete, server is ready!`);
  } catch (error) {
    console.error("[Server] Error during initialization:", error);
    process.exit(1);
  }
}

// Start the server
initializeServices().catch((error) => {
  console.error("[Server] Unhandled error:", error);
  process.exit(1);
});
