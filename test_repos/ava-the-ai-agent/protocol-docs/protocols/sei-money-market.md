# Sei Money Market Agent with Brahma ConsoleKit

The Sei Money Market Agent is a specialized autonomous agent that leverages Brahma's ConsoleKit to execute DeFi strategies on the Sei network. This agent focuses on money market operations and stablecoin management.

## Features

### Autonomous DeFi Operations
- Deposit and withdraw from money markets
- Automated portfolio rebalancing
- Yield optimization across multiple protocols
- Risk-managed position management

### Brahma ConsoleKit Integration
- Secure transaction execution
- Real-time portfolio monitoring
- Multi-protocol support
- Automated strategy execution

## Configuration

The agent requires the following configuration:

```typescript
interface SeiMoneyMarketConfig {
  apiKey: string;        // Your Brahma API key
  baseURL: string;       // Brahma API base URL
  supportedTokens: {     // List of supported tokens
    address: string;     // Token contract address
    symbol: string;      // Token symbol
    decimals: number;    // Token decimals
  }[];
}
```

## Usage

1. Configure the agent through the web interface
2. Set up supported tokens and risk parameters
3. The agent will automatically:
   - Monitor market conditions
   - Execute optimal strategies
   - Maintain portfolio balance
   - Provide real-time updates

## Example Strategy

```typescript
// Define target portfolio allocation
const targetAllocation = {
  'USDC': 0.4,  // 40% USDC
  'USDT': 0.3,  // 30% USDT
  'DAI': 0.3    // 30% DAI
};

// Agent automatically maintains this allocation
await agent.handleEvent('REBALANCE', { targetAllocations: targetAllocation });
``` 