# Agent System Overview

The Ava Portfolio Manager employs a sophisticated multi-agent architecture where specialized autonomous agents collaborate to provide comprehensive DeFi portfolio management across multiple blockchains. This distributed approach enables each agent to focus on specific tasks while communicating through a central event bus.

## Multi-Agent Architecture

Ava's architecture is designed around the principle of specialized agents working together to achieve complex financial operations. The system comprises:

- **Core Agents**: Handle fundamental system operations
- **Protocol-Specific Agents**: Interface with specific blockchain protocols
- **Supporting Agents**: Provide specialized services or integrations
- **AI Agents**: Provide natural language processing and decision making

## Agent Communication

Agents communicate via an Event Bus system that enables:

- **Event-driven Architecture**: Asynchronous communication between agents
- **Task Coordination**: Agents can delegate tasks to other specialized agents
- **Real-time Updates**: Events are propagated throughout the system
- **Extensibility**: New agents can be added to the ecosystem seamlessly

## Core Agents

### Task Manager Agent

The central coordinator in the system, responsible for:
- Breaking down user requests into executable tasks
- Delegating tasks to specialized agents
- Tracking task status and progress
- Managing task dependencies and workflows

### Observer Agent

The system's monitoring agent that:
- Watches for blockchain events and state changes
- Monitors portfolio positions and performance
- Alerts the system to market opportunities or risks
- Initiates workflows based on predetermined conditions

### Executor Agent

The transaction execution specialist that:
- Handles the actual execution of blockchain transactions
- Manages gas optimization and transaction batching
- Provides transaction status and confirmations
- Implements retry mechanisms for failed transactions

## Protocol-Specific Agents

Ava includes multiple protocol-specific agents, each designed to interface with a particular blockchain or DeFi protocol:

- **Sonic Agent**: Interacts with Sonic Protocol
- **Move Agent**: Handles Move blockchain interactions
- **Hedera Agent**: Specializes in Hedera operations
- **Sui Agent**: Manages Sui blockchain interactions
- **Zircuit Agent**: Interfaces with Zircuit Protocol
- **Sei Money Market Agent**: Handles Sei-based lending and borrowing
- **CDP Agent**: Manages Collateralized Debt Positions

## Supporting Agents

These agents provide specialized services:

- **SXT Analytics Agent**: Provides data analytics and insights
- **Safe Wallet Agent**: Manages Safe smart accounts
- **Lit Agent Wallet**: Handles key management and transaction signing
- **Superchain Bridge Agent**: Facilitates cross-chain operations
- **CoW Trading Agent**: Optimizes trading via CoW Protocol
- **Enso Agent**: Interfaces with Enso Finance for DeFi aggregation
- **MarginZero Agent**: Handles margin trading operations

## AI Communication Agent

- **Eliza Agent**: Provides natural language understanding and generation, serving as the primary interface between users and the system

## Agent Development

Ava's architecture allows for straightforward addition of new agents through:

- **Standardized Agent Interface**: All agents follow a common interface
- **Event-based Communication**: Agents communicate via standardized events
- **Plugin System**: Support for custom plugins and extensions

For information on developing custom agents, see the [Agent Development Guide](../developers/agent-development.md). 