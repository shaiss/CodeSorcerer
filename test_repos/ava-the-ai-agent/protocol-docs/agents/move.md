# Move Agent

The Move Agent is a specialized component in the Ava Portfolio Manager that enables interaction with blockchains built on the Move programming language, particularly focusing on the Aptos blockchain. This agent leverages the capabilities of Move Agent Kit to provide secure and efficient execution of on-chain operations.

## Overview

The Move Agent serves as the primary interface between the Ava Portfolio Manager and Move-compatible blockchains. It enables users to:

- Execute transactions on Aptos blockchain
- Query blockchain state and data
- Interact with Move smart contracts
- Manage digital assets on Aptos

## Architecture

The Move Agent is built with a modular architecture that consists of several key components:

1. **Agent Interface**: Extends the base Agent class, providing standardized methods for task handling and event processing
2. **Move Agent Kit Integration**: Utilizes the Move Agent Kit library for blockchain interaction
3. **LangChain Integration**: Implements a React agent pattern for AI-powered decision making
4. **Event Handling**: Processes events from the Task Manager and emits results back to the system

## Key Components

### AgentRuntime

The core component that manages the interaction with the Aptos blockchain. It:
- Handles blockchain communication
- Manages account authentication
- Executes transactions and queries

### LocalSigner

Manages the cryptographic signing of transactions using:
- Ed25519 private key management
- Secure transaction signing
- Account derivation

### ReactAgent

An AI-powered component that:
- Interprets user requests in natural language
- Selects appropriate tools for execution
- Handles error recovery and retries
- Provides human-readable responses

## Integration

The Move Agent integrates with the broader Ava system through:

1. **Event Bus**: Listens for task requests and emits results
2. **Task Manager**: Receives tasks from and reports back to the Task Manager
3. **Frontend Events**: Emits detailed events for frontend display

## Configuration

The Move Agent requires several environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `APTOS_NETWORK` | Aptos network to connect to | `devnet`, `testnet`, `mainnet` |
| `APTOS_PRIVATE_KEY` | Private key for transaction signing | `0xabcdef...` |
| `GROQ_API_KEY` | API key for the Groq LLM | `gsk_abcdef...` |
| `PANORA_API_KEY` | API key for Panora services (optional) | `pnr_abcdef...` |

## Usage

The Move Agent responds to tasks sent via the Event Bus with the `task-manager-move-agent` topic. Tasks are provided as natural language instructions that are interpreted by the agent.

### Example Tasks

```
"Transfer 10 APT to 0x123..."
"Check my Aptos balance"
"Deploy the provided Move module"
"Stake 5 APT with validator 0x456..."
```

### Response Format

The agent returns structured responses that include:
- Operation status
- Transaction details
- Human-readable explanation
- Any relevant blockchain data

## Implementation Details

### Initialization

The Move Agent initializes by:
1. Setting up the event handlers
2. Creating an Aptos configuration based on environment variables
3. Deriving an account from the provided private key
4. Creating a LocalSigner instance
5. Initializing the AgentRuntime
6. Setting up LangChain tools
7. Creating a ReactAgent instance

### Task Processing

When a task is received:
1. The task text is extracted from the event data
2. The LangChain agent processes the natural language request
3. The agent selects appropriate tools to execute
4. Results are streamed back to the event bus
5. Detailed events are emitted for frontend display

### Error Handling

The Move Agent implements robust error handling:
- Transaction failures are properly reported
- Network issues are detected and retried
- Validation errors provide clear explanations
- Stream processing errors include partial results when available

## Extensibility

The Move Agent can be extended with:
- Additional tools for specific Move modules
- Custom validators for transaction safety
- Enhanced analytics for transaction history
- Multi-account support

## Security Considerations

- Private keys are never exposed in logs or responses
- All blockchain interactions use secure transport layers
- Rate limiting is implemented to prevent abuse
- Transaction simulation is performed before execution

## Future Enhancements

Planned improvements include:
- Support for additional Move-compatible blockchains (e.g., Sui)
- Enhanced multi-chain operation capabilities
- Integration with on-chain governance systems
- Advanced transaction batching and optimization 