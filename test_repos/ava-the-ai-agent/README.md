# 🤖 Ava the MultiChain IP powered DeFAI Portfolio Managing AI Agents Platform

> Group of Multiple specialized autonomous AI agents with powerful tools that work together in collaberation to analyze, recommend, and execute the most optimal DeFi strategies while maintaining user-defined risk parameters and portfolio goals currently live on Flow, Hedera , Sui , Base, Avalanche , Mode , Arbitrium, powered by Story Protocol, Agent2Agent (A2A) Protocol, and LangChain.


## 📑 Quick Navigation

### 🚀 Core Sections
- [Problem Statement](#-problem-statement)
- [Solution](#-solution) 
- [Demo Video](#demo-vid)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [A2A Protocol](#-a2a-protocol)
- [MCP Integration](#-mcp-integration)
- [Agent Capabilities](#-agent-capabilities)
- [Documentation](#docs)

## 🎯 Problem Statement
Managing DeFi portfolios across multiple protocols across different chains can be complex and time-consuming.

Users need to:
- Monitor multiple positions across different protocols
- Execute complex multi-step transactions
- Stay updated with the latest crosschain yield opportunities
- Maintain desired portfolio allocations
- React quickly to market changes

## 💡 Solution
An autonomous group of AI agents that manages your Multichain DeFi portfolio by:
- Understanding high-level goals in natural language
- Breaking down complex operations into executable steps
- Automatically executing transactions when needed
- Providing real-time updates and progress tracking
- Maintaining portfolio balance according to user preferences

## Docs 

https://cryptoinnovators.gitbook.io/ava-the-defai-agent

## Demo Vid

https://www.youtube.com/watch?v=kYpniQ4neQk


## 🏗 Architecture

### Agent-to-Agent (A2A) Protocol

Ava uses Google's A2A protocol for standardized communication between agents:

1. **Task-Based Communication**: Agents communicate by sending task requests and receiving responses
2. **Capability Discovery**: Agents discover each other's capabilities through standardized Agent Cards
3. **Multimodal Messaging**: Supports text, forms, and file exchanges between agents
4. **Secure Collaboration**: Enterprise-grade authentication and authorization

<img width="1076" alt="A2A Architecture" src="https://github.com/user-attachments/assets/246b947c-bbee-4134-bbcb-6a33e38a7230" />

### Model Context Protocol (MCP)

MCP provides tools and resources to agents:
- Brave Search for web queries
- GitHub for repository operations
- Filesystem for file management
- And more...

### Demo on Flow

https://github.com/user-attachments/assets/2eec58f7-7a5d-414d-8aa7-672cf5fa245f


## 🌟 Key Features

1. **Natural Language Interface**
   - Express portfolio goals in plain English
   - No need to understand complex DeFi terminology
   - AI translates intentions into actions

2. **Autonomous Execution**
   - Breaks down complex goals into steps
   - Executes transactions automatically
   - Handles error recovery
   - Provides progress updates

3. **Advanced Trading & Routing**
   - Enso Finance integration for smart routing
   - CoW Protocol for MEV-protected trades
   - Gas-optimized transaction bundling
   - Cross-chain bridging via SuperchainBridge
   - Automated slippage protection

4. **Treasury Management**
   - Portfolio rebalancing across protocols
   - Yield optimization strategies
   - Risk-adjusted position management
   - Liquid staking automation
   - Cross-chain asset allocation

5. **AI-Powered Decision Making**
   - Venice.AI integration for market analysis
   - Multi-model architecture for diverse tasks
   - Real-time market sentiment analysis
   - Autonomous strategy formulation
   - Risk assessment and optimization

6. **Cross-Chain Operations**
   - SuperchainBridge for L2 transfers
   - Unified liquidity management
   - Cross-chain yield farming
   - Gas-efficient bridging operations
   - Multi-chain position monitoring

7. **Privacy & Security**
   - Lit Protocol for decentralized key management
   - Private transaction execution
   - Secure multi-party computation
   - Zero-knowledge proofs for verification
   - Encrypted agent communication

8. **Real-Time Event Communication**
   - WebSocket-based event architecture
   - Bidirectional real-time updates
   - Status tracking and monitoring
   - Autonomous mode support
   - Reliable connection management

9. **Standardized Agent Communication**
   - A2A protocol implementation for agent interoperability
   - Dynamic capability discovery between agents
   - Task delegation and coordination
   - Secure message exchange
   - Long-running task support

## 🛠 Technology Stack
- **Frontend**: Next.js, TypeScript, TailwindCSS
- **AI Engine**: Brian AI, LangChain, GPT-4
- **Blockchain**: Avalanche C-Chain, Teleporter, Eigenlayer AVS
- **Development**: Foundry, Avalanche CLI
- **Indexing**: The Graph Protocol
- **Agent Communication**: Google's A2A Protocol, MCP Protocol
- **Social Media Integration**: ZerePy for Twitter interactions

## Technology Integrations

- **Multi-Agent Orchestration**
  ```typescript
  // Using A2A protocol for standardized agent communication
  const response = await a2aBus.sendTask('executor', {
    role: MessageRole.USER,
    parts: [{ text: "Execute swap of 10 ETH to USDC" }]
  });
  ```

- **Protocol-Specific Adapters**
  - Navi Protocol integration for leveraged positions
  - Bluefin interface for perpetual trading
  - Cetus integration for liquidity provision
  - Aftermath connection for DCA and staking

- **User Interaction Layer**
  - Casual, friendly communication style
  - Complex strategy simplification
  - Real-time position monitoring
  - Risk alerts and notifications


### Agent Collaboration Architecture
Our multi-agent system enables complex DeFi operations through specialized agents:

```typescript
// A2A-based agent collaboration
interface AgentCollaboration {
  observer: ObserverAgent;    // Monitors positions and market conditions
  executor: ExecutorAgent;    // Handles transaction execution
  taskManager: TaskManagerAgent; // Coordinates multi-step operations
  suiAgent: SuiAgent;         // SUI-specific operations
  elizaAgent: ElizaAgent;     // User interaction and strategy explanation
}
```
