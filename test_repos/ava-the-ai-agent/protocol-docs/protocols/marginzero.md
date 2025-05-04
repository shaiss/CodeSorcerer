# MarginZero Protocol Integration

This document provides an overview of how the Ava Portfolio Manager AI Agent integrates with the MarginZero protocol, focusing on its capabilities for options trading and liquidity provision.

## Overview

[MarginZero](https://marginzero.xyz/) is a decentralized options protocol that allows users to create, trade, and manage options positions on-chain. The protocol is built on liquidity provider tokens (LP tokens) from decentralized exchanges like Uniswap V3.

Ava integrates with MarginZero to provide users with the ability to:
- View options data and prices
- Create and manage options positions
- Exercise options
- Interact with LP tokens

## Key Components

The MarginZero integration consists of the following key components:

1. **MarginZeroProvider**: A plugin that handles all interactions with the MarginZero smart contracts
2. **Sonic Agent MarginZero Extensions**: Methods in the Sonic Agent that utilize the MarginZero Provider
3. **Smart Contract Interfaces**: Type definitions and ABIs for interacting with MarginZero contracts

## Architecture

```
┌────────────────┐     ┌─────────────────┐     ┌────────────────────┐
│                │     │                 │     │                    │
│   User Input   ├────►│   Eliza Agent   ├────►│   Task Manager     │
│                │     │                 │     │                    │
└────────────────┘     └─────────────────┘     └──────────┬─────────┘
                                                          │
                                                          ▼
┌────────────────┐     ┌─────────────────┐     ┌────────────────────┐
│  MarginZero    │◄────┤                 │◄────┤                    │
│  Contracts     │     │  Sonic Agent    │     │   Event Bus        │
│                │     │                 │     │                    │
└────────────────┘     └─────────────────┘     └────────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  MarginZero     │
                       │  Provider       │
                       │                 │
                       └─────────────────┘
```

## MarginZero Provider

The `MarginZeroProvider` is a TypeScript class that facilitates interactions with the MarginZero protocol's smart contracts. It provides methods for accessing information and executing transactions against the protocol.

### Configuration

To use the MarginZero Provider, you need to configure it with the following parameters:

```typescript
interface MarginZeroConfig {
  chainId: number;
  rpcUrl: string;
  account?: {
    address: string;
    privateKey: string;
  };
  positionManagerAddress: string;
  optionMarketAddress: string;
}
```

### Key Methods

The provider includes the following key methods:

#### Handler Operations

```typescript
// Check if a handler is whitelisted
async isHandlerWhitelisted(handlerAddress: string): Promise<boolean>

// Mint a new position
async mintPosition(
  handlerAddress: string, 
  tokenId: number, 
  recipient: string
): Promise<string>

// Burn a position
async burnPosition(
  handlerAddress: string, 
  tokenId: number, 
  recipient: string
): Promise<string>

// Use a position
async usePosition(
  handlerAddress: string, 
  tokenId: number
): Promise<string>

// Unuse a position
async unusePosition(
  handlerAddress: string, 
  tokenId: number
): Promise<string>

// Donate to a position
async donateToPosition(
  handlerAddress: string, 
  tokenId: number, 
  amount0: string, 
  amount1: string
): Promise<string>
```

#### Option Operations

```typescript
// Get option data
async getOptionData(optionTokenId: number): Promise<OptionData>

// Get option price
async getOptionPrice(
  isCall: boolean, 
  isPut: boolean, 
  spotPrice: string, 
  strikePrice: string, 
  timeToMaturity: number, 
  volatility: string
): Promise<string>

// Buy an option
async buyOption(params: BuyOptionParams): Promise<string>

// Exercise an option
async exerciseOption(
  optionTokenId: number
): Promise<string>
```

## Sonic Agent Integration

The Sonic Agent has been extended to include methods that interact with the MarginZero Provider. These methods include:

```typescript
// Check if a handler is whitelisted
async isHandlerWhitelisted(handlerAddress: string): Promise<boolean>

// Mint a new position
async mintPosition(
  handlerAddress: string, 
  tokenId: number, 
  recipient: string
): Promise<string>

// Burn a position
async burnPosition(
  handlerAddress: string, 
  tokenId: number, 
  recipient: string
): Promise<string>

// ... additional methods for all MarginZero operations
```

## Usage Examples

### Checking Handler Status

```typescript
const handlerAddress = "0x1234...";
const isWhitelisted = await sonicAgent.isHandlerWhitelisted(handlerAddress);
console.log(`Handler ${handlerAddress} is whitelisted: ${isWhitelisted}`);
```

### Buying an Option

```typescript
const optionParams = {
  isCall: true,
  isPut: false,
  strikePrice: "2000000000", // in wei format
  maturity: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week from now
  priceTolerance: "50", // 5%
  maxCost: "100000000000000000", // 0.1 ETH in wei
  handler: "0xabcd...",
  underlying: "0xefgh..."
};

const txHash = await sonicAgent.buyOption(optionParams);
console.log(`Option purchased, transaction: ${txHash}`);
```

### Exercising an Option

```typescript
const optionTokenId = 123;
const txHash = await sonicAgent.exerciseOption(optionTokenId);
console.log(`Option exercised, transaction: ${txHash}`);
```

## Error Handling

The MarginZero Provider and Sonic Agent extensions include robust error handling for common issues:

```typescript
try {
  await sonicAgent.buyOption(optionParams);
} catch (error) {
  if (error.message.includes("insufficient funds")) {
    console.error("Not enough funds to buy this option");
  } else if (error.message.includes("price slippage")) {
    console.error("Option price has changed beyond the tolerance level");
  } else {
    console.error("Unknown error:", error);
  }
}
```

## MarginZero Contract ABIs

The integration includes TypeScript definitions for the MarginZero contract ABIs:

### Position Manager ABI

```typescript
export const POSITION_MANAGER_ABI = [
  // Core functions
  "function mintPosition(address handler, uint256 tokenId, address recipient) external returns (bytes memory result)",
  "function burnPosition(address handler, uint256 tokenId, address recipient) external returns (bytes memory result)",
  "function usePosition(address handler, uint256 tokenId) external returns (bytes memory result)",
  "function unusePosition(address handler, uint256 tokenId) external returns (bytes memory result)",
  "function donateToPosition(address handler, uint256 tokenId, uint256 amount0, uint256 amount1) external returns (bytes memory result)",
  
  // View functions
  "function isHandlerWhitelisted(address handler) external view returns (bool)",
  
  // Events
  "event PositionMinted(address indexed handler, uint256 indexed tokenId, address recipient)",
  "event PositionBurned(address indexed handler, uint256 indexed tokenId, address recipient)",
  "event PositionUsed(address indexed handler, uint256 indexed tokenId)",
  "event PositionUnused(address indexed handler, uint256 indexed tokenId)",
  "event PositionDonated(address indexed handler, uint256 indexed tokenId, uint256 amount0, uint256 amount1)"
];
```

### Option Market ABI

```typescript
export const OPTION_MARKET_ABI = [
  // Option functions
  "function buyOption(bool isCall, bool isPut, uint256 strikePrice, uint256 maturity, uint256 priceTolerance, uint256 maxCost, address handler, address underlying) external returns (uint256 optionTokenId)",
  "function exerciseOption(uint256 optionTokenId) external returns (uint256 profit)",
  
  // View functions
  "function getOptionData(uint256 optionTokenId) external view returns (tuple(bool isCall, bool isPut, uint256 strikePrice, uint256 maturity, address handler, address underlying))",
  "function getOptionPrice(bool isCall, bool isPut, uint256 spotPrice, uint256 strikePrice, uint256 timeToMaturity, uint256 volatility) external pure returns (uint256)",
  
  // Events
  "event OptionBought(uint256 indexed optionTokenId, address indexed buyer)",
  "event OptionExercised(uint256 indexed optionTokenId, address indexed exerciser, uint256 profit)"
];
```

## Advanced Features

### Batch Operations

For advanced users, the MarginZero Provider supports batch operations:

```typescript
async batchMintPositions(
  operations: Array<{
    handlerAddress: string;
    tokenId: number;
    recipient: string;
  }>
): Promise<string>
```

### Custom Gas Settings

The provider allows for custom gas settings to be passed for transactions:

```typescript
async exerciseOption(
  optionTokenId: number,
  gasSettings?: {
    gasPrice?: string;
    gasLimit?: string;
  }
): Promise<string>
```

## Security Considerations

When integrating with MarginZero, be aware of the following security considerations:

1. **Price Oracle Risk**: Options pricing relies on price oracles which may be manipulated
2. **Slippage Protection**: Always use price tolerance parameters to protect against excessive slippage
3. **Gas Estimation**: Exercise caution with gas estimation, especially during high network congestion
4. **Permission Management**: Carefully manage permissions for minting and burning positions

## Troubleshooting

### Common Issues

1. **Transaction Reverted**: Check that you have sufficient funds and correct permissions
2. **Option Data Not Available**: Confirm that the option token ID exists and belongs to the correct market
3. **Handler Not Whitelisted**: Verify that the handler address is correctly whitelisted in the position manager

### Debugging

The MarginZero Provider includes detailed logging that can be enabled:

```typescript
// Enable debug logging
marginZeroProvider.setDebugLogging(true);

// Transaction with detailed logging
const result = await marginZeroProvider.mintPosition(...);
```

## Future Enhancements

The MarginZero integration roadmap includes:

1. **Portfolio Management**: Advanced portfolio tracking for options positions
2. **Risk Analysis**: Real-time risk metrics for options positions
3. **Strategy Templates**: Pre-built options strategies like covered calls and protective puts
4. **Multi-chain Support**: Expansion to additional EVM-compatible blockchains

## References

- [MarginZero Documentation](https://docs.marginzero.xyz/)
- [MarginZero GitHub](https://github.com/marginzero/contracts)
- [Contract Addresses](https://docs.marginzero.xyz/contracts) 