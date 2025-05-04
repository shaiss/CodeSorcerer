# Sonic Market Agent

The Sonic Market Agent is an autonomous agent that interacts with the Sonic Market (powered by Clober) and MarginZero protocol to perform various trading, liquidity, and options operations. It leverages the @clober/v2-sdk to provide a seamless interface for interacting with the Sonic Market and MarginZero.

## Features

### Sonic Market Features
- **Market Information**: Get detailed market information for token pairs
- **Pool Management**: View and manage liquidity pools
- **Order Management**: Place, claim, and cancel orders
- **Chart Data**: Retrieve historical price and volume data
- **Liquidity Operations**: Add and remove liquidity from pools

### MarginZero Features
- **Position Management**: Mint, burn, use, and unuse positions
- **Options Trading**: Buy, exercise, and get information about options
- **Handler Management**: Check if handlers are whitelisted
- **Liquidity Donation**: Donate to positions

## Usage

The Sonic Agent can be interacted with through the Task Manager using natural language requests. The agent uses AI to parse these requests into structured commands.

### Example Requests for Sonic Market

```
Get market information for ETH and USDC
```

```
Place a limit order to buy 1 ETH at 2000 USDC
```

```
Show my open orders
```

```
Add liquidity to the ETH-USDC pool with 1 ETH
```

### Example Requests for MarginZero

```
Check if handler 0x1234... is whitelisted
```

```
Get option data for token ID 123
```

```
Buy a call option for ETH with strike price 2000 USDC expiring in 7 days
```

```
Exercise option with token ID 123
```

## Configuration

The Sonic Agent requires the following environment variables:

### Sonic Market Configuration
- `SONIC_CHAIN_ID`: The chain ID to connect to (default: 1 for Ethereum mainnet)
- `SONIC_RPC_URL`: The RPC URL to use for connecting to the blockchain

### MarginZero Configuration
- `MARGIN_ZERO_POSITION_MANAGER_ADDRESS`: The address of the MarginZero Position Manager contract
- `MARGIN_ZERO_OPTION_MARKET_ADDRESS`: The address of the MarginZero Option Market contract

## Architecture

The Sonic Agent consists of three main components:

1. **SonicMarketProvider**: A plugin that directly interfaces with the @clober/v2-sdk to perform operations on the Sonic Market.
2. **MarginZeroProvider**: A plugin that interfaces with the MarginZero protocol to perform operations on positions and options.
3. **SonicAgent**: The agent that handles task requests, parses them using AI, and delegates operations to the appropriate provider.

## Available Operations

### Sonic Market Operations

- `getMarket`: Get market information for a token pair
- `getPool`: Get pool information for a token pair
- `getOpenOrders`: Get open orders for a user
- `getChartData`: Get chart data for a token pair
- `placeLimitOrder`: Place a limit order
- `placeMarketOrder`: Place a market order
- `claimOrder`: Claim an order
- `cancelOrder`: Cancel an order
- `addLiquidity`: Add liquidity to a pool
- `removeLiquidity`: Remove liquidity from a pool

### MarginZero Operations

- `isHandlerWhitelisted`: Check if a handler is whitelisted
- `isHandlerWhitelistedForApp`: Check if a handler is whitelisted for a specific app
- `mintPosition`: Mint a position using a handler
- `burnPosition`: Burn a position using a handler
- `usePosition`: Use a position using a handler
- `unusePosition`: Unuse a position using a handler
- `donateToPosition`: Donate to a position using a handler
- `getOptionData`: Get option data
- `getOptionPrice`: Get option price
- `buyOption`: Buy an option
- `exerciseOption`: Exercise an option

## Integration with AVA Portfolio Manager

The Sonic Agent is fully integrated with the AVA Portfolio Manager system, allowing it to:

1. Receive tasks from the Task Manager
2. Process natural language requests using AI
3. Execute operations on the Sonic Market and MarginZero protocol
4. Return results to the Task Manager

## Development

To extend the Sonic Agent with new functionality:

1. Add new methods to the SonicMarketProvider or MarginZeroProvider to interact with the respective protocols
2. Add corresponding methods to the SonicAgent
3. Update the parseTaskWithAI method to recognize new operations
4. Update the executeOperation method to handle new operations 