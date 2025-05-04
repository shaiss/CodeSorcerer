# Ava Portfolio Manager: System Architecture

This document provides a comprehensive overview of the Ava Portfolio Manager's architecture, explaining how its components work together to create a powerful DeFi portfolio management system powered by AI.

## High-Level Architecture

The Ava Portfolio Manager is built on a multi-agent AI system, with specialized agents working together to provide advanced portfolio management capabilities. The architecture follows a modular design with clear separation of concerns.

![System Architecture](../assets/system-architecture.png)

```
┌─────────────────────────────────────────┐
│             Frontend (Next.js)          │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│                  API                    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│              Event Bus                  │
└───┬─────────┬──────────┬─────────┬──────┘
    │         │          │         │
    ▼         ▼          ▼         ▼
┌─────────┐ ┌────────┐ ┌─────────┐ ┌─────────────┐
│  Eliza  │ │ Sonic  │ │  Move   │ │Task Manager │
│  Agent  │ │ Agent  │ │  Agent  │ │   Agent     │
└─────────┘ └────┬───┘ └─────────┘ └─────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│            Protocol Plugins             │
└─────────────────────────────────────────┘
```

## Core Components

### Frontend Layer

The frontend is built with Next.js and provides the user interface for interacting with the Ava Portfolio Manager. Key components include:

- **Chat Interface**: Allows users to communicate with the Eliza Agent using natural language
- **Portfolio Dashboard**: Displays portfolio metrics, holdings, and performance
- **Transaction Interface**: Provides real-time status of pending and completed transactions
- **Settings Panel**: Allows users to configure preferences and connect wallets

### Backend Layer

The backend is built with Node.js and provides the API, agent system, and database services:

- **HTTP API**: RESTful API endpoints for frontend communication
- **WebSocket Server**: Real-time updates and agent communication
- **Authentication Service**: User authentication and authorization
- **Database Service**: Persistent storage for user data and agent state

### Agent System

The agent system consists of four specialized AI agents:

1. **Eliza Agent**: The conversational interface that processes natural language and coordinates interactions between the user and other agents
2. **Sonic Agent**: Handles blockchain interactions, including fetching data from and executing transactions on various DeFi protocols
3. **Move Agent**: Analyzes portfolio data, suggests optimization strategies, and monitors performance
4. **Task Manager Agent**: Coordinates complex tasks that require multiple agents, ensuring tasks are tracked and completed

### Event Bus

The event bus facilitates communication between agents and system components:

- **Publish-Subscribe Model**: Components publish events and subscribe to relevant topics
- **Event Routing**: Ensures events reach the appropriate subscribers
- **Event Persistence**: Maintains a record of events for debugging and recovery

### Protocol Plugins

The protocol plugins provide standardized interfaces for interacting with various DeFi protocols:

- **Uniswap Plugin**: For DEX interactions and liquidity provision
- **Aave Plugin**: For lending and borrowing
- **MarginZero Plugin**: For options trading
- **Generic ERC20/ERC721 Plugin**: For standard token interactions

## Data Flow

### User Interaction Flow

1. User inputs a request via the chat interface
2. Frontend sends the request to the backend API
3. API forwards the request to the Eliza Agent
4. Eliza Agent processes the natural language, determines intent, and creates tasks
5. Task Manager coordinates execution across agents
6. Results are sent back through the API to the frontend
7. Frontend displays the results to the user

### Transaction Flow

1. User requests a transaction (e.g., "Swap 1 ETH for USDC")
2. Eliza Agent determines the intent is a swap transaction
3. Task Manager creates a transaction task
4. Sonic Agent prepares the transaction using the appropriate protocol plugin
5. Transaction details are displayed to the user for confirmation
6. Upon approval, Sonic Agent submits the transaction to the blockchain
7. Transaction status updates are published to the event bus
8. Frontend receives updates via WebSocket and displays status to the user

### Portfolio Analysis Flow

1. User requests portfolio analysis (e.g., "How is my portfolio performing?")
2. Eliza Agent determines the intent is portfolio analysis
3. Task Manager creates an analysis task
4. Sonic Agent fetches on-chain data for the user's wallets
5. Move Agent analyzes the data and generates insights
6. Results are formatted by the Eliza Agent for user consumption
7. Frontend displays the analysis to the user

## Technical Implementation

### Agent Implementation

Each agent is implemented as a TypeScript class that extends a base Agent class:

```typescript
abstract class Agent {
  protected name: string;
  protected eventBus: EventBus;
  protected storage: Storage;
  
  constructor(name: string, eventBus: EventBus, storage: Storage) {
    this.name = name;
    this.eventBus = eventBus;
    this.storage = storage;
  }
  
  abstract async initialize(): Promise<void>;
  abstract async handleEvent(event: Event): Promise<void>;
  abstract async shutdown(): Promise<void>;
}
```

Specialized agents implement additional methods specific to their purpose:

```typescript
class ElizaAgent extends Agent {
  private aiProvider: AIProvider;
  
  constructor(name: string, eventBus: EventBus, storage: Storage, aiProvider: AIProvider) {
    super(name, eventBus, storage);
    this.aiProvider = aiProvider;
  }
  
  async processUserInput(input: string): Promise<string> {
    // Implementation
  }
  
  // Other methods
}
```

### Event Bus Implementation

The event bus uses a publish-subscribe pattern:

```typescript
class EventBus {
  private subscribers: Map<string, Function[]>;
  
  constructor() {
    this.subscribers = new Map();
  }
  
  subscribe(topic: string, callback: Function): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    
    this.subscribers.get(topic)?.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(topic);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  publish(topic: string, data: any): void {
    const callbacks = this.subscribers.get(topic);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }
}
```

### Protocol Plugin System

Protocol plugins implement a common interface:

```typescript
interface ProtocolProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getBalance(address: string, token: string): Promise<string>;
  // Protocol-specific methods
}

class UniswapProvider implements ProtocolProvider {
  private config: UniswapConfig;
  private client: ethers.providers.Provider;
  
  constructor(config: UniswapConfig) {
    this.config = config;
  }
  
  async connect(): Promise<void> {
    // Implementation
  }
  
  // Other methods
}
```

## Storage and Persistence

The system uses multiple storage mechanisms:

1. **Database**: PostgreSQL for structured data (user profiles, transaction history)
2. **Cache**: Redis for temporary data and rate limiting
3. **Vector Database**: For semantic search capabilities in the AI agents
4. **Blockchain**: The ultimate source of truth for all on-chain data

## Security Architecture

Security is implemented at multiple levels:

1. **Authentication**: JWT-based authentication for API access
2. **Authorization**: Role-based access control for different operations
3. **Input Validation**: All user inputs are validated and sanitized
4. **Transaction Safety**: Multi-step confirmation for transactions
5. **Key Management**: Private keys are encrypted and securely stored
6. **Rate Limiting**: To prevent abuse of API endpoints

## Scalability Considerations

The architecture is designed for scalability:

1. **Horizontal Scaling**: Components can be deployed across multiple servers
2. **Microservices**: Each major component can operate independently
3. **Load Balancing**: Requests can be distributed across multiple instances
4. **Caching**: Reduces repeated computation and blockchain queries
5. **Asynchronous Processing**: Long-running tasks are processed asynchronously

## Error Handling and Recovery

The system includes robust error handling:

1. **Graceful Degradation**: If a component fails, others continue to function
2. **Retry Mechanisms**: Failed operations are retried with exponential backoff
3. **Circuit Breakers**: Prevent cascading failures
4. **Comprehensive Logging**: For debugging and auditing
5. **Error Boundaries**: Isolate failures in the UI

## Deployment Architecture

The system can be deployed in various configurations:

1. **Development**: Local deployment with development dependencies
2. **Staging**: Test environment with production-like configuration
3. **Production**: Fully scaled deployment with redundancy
4. **Self-Hosted**: Users can deploy their own instance with custom configuration

## Cross-Chain Architecture

The system supports multiple blockchains through a unified interface:

1. **Chain Registry**: Maintains information about supported chains
2. **Chain Adapters**: Normalize interactions across different blockchains
3. **Bridge Integration**: Support for cross-chain operations
4. **Multi-Chain Wallet**: Manages addresses across multiple chains

## Monitoring and Observability

The system includes comprehensive monitoring:

1. **Logging**: Structured logs with appropriate log levels
2. **Metrics**: Performance and usage metrics
3. **Alerts**: Notification system for critical issues
4. **Health Checks**: Regular verification of system components
5. **Performance Tracking**: Monitoring of response times and resource usage

## Future Architecture Directions

Planned architectural enhancements include:

1. **Enhanced AI Capabilities**: More sophisticated agent interactions
2. **Decentralized Components**: Moving toward decentralized architecture
3. **Mobile Support**: Dedicated mobile client
4. **Plugin Marketplace**: User-contributed protocol integrations
5. **Advanced Analytics**: Predictive portfolio analytics

## Conclusion

The Ava Portfolio Manager's architecture is designed to be modular, scalable, and extensible. By using a multi-agent system with specialized components, it provides a powerful platform for DeFi portfolio management while maintaining the flexibility to evolve with the rapidly changing DeFi landscape. 