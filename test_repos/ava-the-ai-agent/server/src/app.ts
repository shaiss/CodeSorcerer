import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { A2AMiddleware } from './middleware';
import { createA2ARoutes } from './routes';
import { MCPService } from './services';
import { AgentCard } from './types/a2a';
import { env } from './env';

const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Initialize MCP service - will be configured in index.ts
export const mcpService = new MCPService();

// Configure A2A middleware for each agent
// These agent cards define their capabilities according to the A2A protocol
const observerAgentCard: AgentCard = {
  name: 'ObserverAgent',
  description: 'Monitors positions and market conditions',
  url: `${env.API_BASE_URL}/agent/observer`,
  version: '1.0',
  capabilities: {
    streaming: false,
    pushNotifications: false
  }
};

const executorAgentCard: AgentCard = {
  name: 'ExecutorAgent',
  description: 'Handles transaction execution',
  url: `${env.API_BASE_URL}/agent/executor`,
  version: '1.0',
  capabilities: {
    streaming: false,
    pushNotifications: false
  }
};

const taskManagerAgentCard: AgentCard = {
  name: 'TaskManagerAgent',
  description: 'Coordinates multi-step operations',
  url: `${env.API_BASE_URL}/agent/task-manager`,
  version: '1.0',
  capabilities: {
    streaming: true,
    pushNotifications: false
  }
};

// Create A2A middleware for each agent
export const observerA2AMiddleware = new A2AMiddleware(observerAgentCard);
export const executorA2AMiddleware = new A2AMiddleware(executorAgentCard);
export const taskManagerA2AMiddleware = new A2AMiddleware(taskManagerAgentCard);

// Set up A2A routes for each agent
app.use('/agent/observer', createA2ARoutes('observer', observerA2AMiddleware));
app.use('/agent/executor', createA2ARoutes('executor', executorA2AMiddleware));
app.use('/agent/task-manager', createA2ARoutes('task-manager', taskManagerA2AMiddleware));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Configure WebSocket server (will be initialized in index.ts)
export const wss = new WebSocketServer({ 
  port: parseInt(env.WS_PORT || '8020')
});

export default app;
