# Sonic Agent

The Sonic Agent is a specialized component of the Ava Portfolio Manager that enables interaction with the Sonic Protocol for decentralized exchange and liquidity provision. This agent provides a comprehensive interface for users to execute trades, manage liquidity, and optimize yield on the Sonic DEX.

## Overview

The Sonic Agent serves as the bridge between Ava Portfolio Manager and Sonic Protocol, providing capabilities for:

- Token swaps and trading operations
- Liquidity pool management
- Yield farming optimization
- Market analysis and data retrieval
- Integration with MarginZero for options and derivatives

## Architecture

The Sonic Agent is built with a layered architecture:

1. **Core Agent Layer**: Extends the base Agent class, providing event handling and task processing
2. **Provider Layer**: Implements SonicMarketProvider for direct protocol interaction
3. **Optional Integration Layer**: Includes MarginZeroProvider for advanced options trading
4. **AI Processing Layer**: Utilizes AI models for natural language understanding and task execution

## Key Components

### SonicMarketProvider

The core provider that enables interaction with Sonic Protocol:
- Manages connections to Sonic markets
- Executes trades and swaps
- Retrieves market data and prices
- Handles transaction execution

### MarginZeroProvider

An optional integration that extends functionality to options and derivatives:
- Manages options positions
- Executes options trades
- Provides position analytics
- Handles advanced derivatives operations

## Integration

The Sonic Agent integrates with the Ava ecosystem through:

1. **Event Bus**: Listens for task requests and emits results
2. **Task Manager**: Receives tasks from and reports back to the Task Manager
3. **Storage System**: Persists data and retrieves historical information
4. **AI Provider**: Utilizes AI for natural language processing and decision making

## Configuration

The Sonic Agent requires several configuration parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `chainId` | The blockchain ID to connect to | `1` (Ethereum), `8453` (Base) |
| `rpcUrl` | RPC endpoint URL | `https://ethereum.publicnode.com` |
| `account` | Account information for signing transactions | Account object with address and private key |
| `positionManagerAddress` | MarginZero Position Manager contract address | `0x123...` |
| `optionMarketAddress` | MarginZero Option Market contract address | `0x456...` |

## Operations

The Sonic Agent supports a wide range of operations:

### Market Operations

- **getMarkets**: Retrieve available markets on the Sonic DEX
- **getMarketData**: Get detailed information about a specific market
- **getDepth**: Retrieve order book depth for a market
- **getPrice**: Get current price for a token pair

### Trading Operations

- **createOrder**: Create a new limit order
- **createMarketOrder**: Execute a market order
- **cancelOrder**: Cancel an existing order
- **getOrders**: Retrieve current user orders

### Liquidity Operations

- **addLiquidity**: Add liquidity to a pool
- **removeLiquidity**: Remove liquidity from a pool
- **claimRewards**: Claim yield farming rewards
- **getPoolInfo**: Retrieve pool statistics and APY

### MarginZero Operations

When the MarginZero provider is available:

- **isHandlerWhitelisted**: Check if a handler is whitelisted
- **mintPosition**: Create a new position
- **burnPosition**: Close an existing position
- **usePosition**: Utilize a position for collateral
- **getOptionData**: Retrieve option contract details
- **buyOption**: Purchase an option contract
- **exerciseOption**: Exercise an option contract

## Usage

### Example: Market Data Retrieval

```
Task: "Get the current price of ETH/USDC on Sonic"

Result: {
  "pair": "ETH/USDC",
  "price": "1876.43",
  "24hChange": "+2.3%",
  "volume": "14,532,642",
  "timestamp": "2023-09-15T12:34:56Z"
}
```

### Example: Executing a Swap

```
Task: "Swap 1 ETH for USDC on Sonic"

Result: {
  "status": "completed",
  "txHash": "0xabcd...",
  "input": {
    "token": "ETH",
    "amount": "1.0"
  },
  "output": {
    "token": "USDC",
    "amount": "1876.43"
  },
  "executionPrice": "1876.43 USDC per ETH",
  "priceImpact": "0.05%",
  "timestamp": "2023-09-15T12:34:56Z"
}
```

### Example: Options Trading

```
Task: "Buy an ETH call option with strike price 2000 USDC expiring in 30 days"

Result: {
  "status": "completed",
  "tokenId": "12345",
  "option": {
    "type": "CALL",
    "underlying": "ETH",
    "strike": "2000",
    "expiry": "2023-10-15T00:00:00Z",
    "premium": "0.05 ETH"
  },
  "txHash": "0xefgh..."
}
```

## Implementation Details

### System Prompt

The Sonic Agent uses a specialized system prompt for AI processing that enables:
- Understanding of financial terminology
- Recognition of token symbols and amounts
- Parsing of complex trading instructions
- Generation of appropriate responses

### Error Handling

The agent includes comprehensive error handling:
- Slippage protection for trades
- Validation of user inputs and parameters
- Gas estimation and failure recovery
- Detailed error reporting for user feedback

## Security Features

- Transaction simulation before execution
- Slippage protection for trades
- Maximum spending limits
- Parameter validation and sanitization
- Private key protection

## Performance Optimization

The Sonic Agent optimizes for performance through:
- Batched RPC calls
- Transaction bundling when possible
- Gas optimization strategies
- Efficient data caching

## Future Enhancements

Planned improvements include:
- Advanced trading strategies (DCA, TWAPs)
- Portfolio analytics and optimization
- Automated yield farming rotation
- Cross-chain liquidity management
- Integration with additional AMMs and DEXes 