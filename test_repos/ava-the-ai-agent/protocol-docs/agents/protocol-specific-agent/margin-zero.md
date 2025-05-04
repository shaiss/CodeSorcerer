# MarginZero Agent

The MarginZero integration provides advanced options and derivatives trading capabilities to the Ava Portfolio Manager. This component enables users to create, manage, and trade options contracts on various underlying assets, enhancing the platform's trading and risk management capabilities.

## Overview

MarginZero is a decentralized options protocol that allows for the creation and trading of European-style options on a wide range of assets. The Ava Portfolio Manager integrates with MarginZero through the MarginZeroProvider, which provides a comprehensive interface for options trading operations.

## Key Features

* Options contract creation and trading
* Position management for options positions
* Advanced risk management tools
* Options data analytics and pricing
* Integration with the Sonic Agent for seamless operations

## Architecture

The MarginZero integration consists of several key components:

1. **MarginZeroProvider**: The core provider class that handles all interactions with MarginZero contracts
2. **Position Manager Interface**: Manages interaction with the Position Manager contract
3. **Option Market Interface**: Handles operations on the Option Market contract
4. **Type Definitions**: Structured type definitions for options data and parameters

## Core Components

### MarginZeroProvider

The main class that provides methods for interacting with MarginZero contracts:

```typescript
export class MarginZeroProvider {
  private config: MarginZeroConfig;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient?: ReturnType<typeof createWalletClient>;

  constructor(config: MarginZeroConfig) {
    // Initialize the provider with configuration
  }

  // Position Manager methods
  async isHandlerWhitelisted(handlerAddress: Address): Promise<boolean>;
  async mintPosition(handlerAddress: Address, mintPositionData: `0x${string}`): Promise<bigint>;
  async burnPosition(handlerAddress: Address, burnPositionData: `0x${string}`): Promise<bigint>;
  async usePosition(handlerAddress: Address, usePositionData: `0x${string}`): Promise<{
    tokens: Address[];
    amounts: bigint[];
    liquidityUsed: bigint;
  }>;
  async unusePosition(handlerAddress: Address, unusePositionData: `0x${string}`): Promise<{
    amounts: bigint[];
    liquidity: bigint;
  }>;
  async donateToPosition(handlerAddress: Address, donatePositionData: `0x${string}`): Promise<{
    amounts: bigint[];
    liquidity: bigint;
  }>;

  // Option Market methods
  async getOptionData(tokenId: bigint): Promise<OptionData>;
  async getOptionPrice(tokenId: bigint): Promise<bigint>;
  async buyOption(params: BuyOptionParams): Promise<{
    tokenId: bigint;
    premium: bigint;
  }>;
  async exerciseOption(tokenId: bigint): Promise<bigint>;
}
```

### Configuration

The MarginZeroProvider requires specific configuration parameters:

```typescript
export interface MarginZeroConfig {
  chainId: CHAIN_IDS;
  rpcUrl: string;
  account?: Account;
  positionManagerAddress: Address;
  optionMarketAddress: Address;
}
```

### Data Types

Key data types for options operations:

```typescript
export interface OptionData {
  opTickArrayLen: bigint;
  expiry: bigint;
  tickLower: number;
  tickUpper: number;
  isCall: boolean;
}

export interface BuyOptionParams {
  token0: Address;
  token1: Address;
  fee: number;
  isCall: boolean;
  expiry: bigint;
  strike: number;
  notionalAmount: bigint;
  maxCost: bigint;
}
```

## Integration with Sonic Agent

The MarginZero Provider is primarily integrated with the Sonic Agent, enabling a seamless combination of spot trading and options strategies. The integration enables:

1. Access to options trading from the same interface as spot trading
2. Combined strategies involving both spot and options positions
3. Unified portfolio management across trading types
4. Consistent user experience for all trading activities

## Usage

### Initializing the Provider

```typescript
const marginZeroConfig = {
  chainId: CHAIN_IDS.ETHEREUM,
  rpcUrl: 'https://ethereum.publicnode.com',
  account: userAccount, // viem Account object
  positionManagerAddress: '0x123...',
  optionMarketAddress: '0x456...'
};

const marginZeroProvider = new MarginZeroProvider(marginZeroConfig);
```

### Checking Handler Whitelisting

```typescript
const handlerAddress = '0x789...';
const isWhitelisted = await marginZeroProvider.isHandlerWhitelisted(handlerAddress);
```

### Getting Option Data

```typescript
const tokenId = 12345n;
const optionData = await marginZeroProvider.getOptionData(tokenId);

console.log(`Option Expiry: ${new Date(Number(optionData.expiry) * 1000)}`);
console.log(`Option Type: ${optionData.isCall ? 'CALL' : 'PUT'}`);
```

### Buying an Option

```typescript
const buyParams = {
  token0: '0xabc...', // Base token (e.g., ETH)
  token1: '0xdef...', // Quote token (e.g., USDC)
  fee: 3000,          // Pool fee tier (0.3%)
  isCall: true,       // CALL option
  expiry: 1672531200n, // Expiry timestamp
  strike: 2000,       // Strike price in ticks
  notionalAmount: parseUnits('1', 18), // 1 ETH notional
  maxCost: parseUnits('0.1', 18)      // Max premium 0.1 ETH
};

const result = await marginZeroProvider.buyOption(buyParams);
console.log(`Option purchased with ID: ${result.tokenId}`);
console.log(`Premium paid: ${formatUnits(result.premium, 18)} ETH`);
```

### Exercising an Option

```typescript
const tokenId = 12345n;
const profit = await marginZeroProvider.exerciseOption(tokenId);
console.log(`Option exercised with profit: ${formatUnits(profit, 18)} ETH`);
```

## Position Management

The MarginZero integration provides comprehensive position management capabilities:

### Minting a Position

```typescript
const handlerAddress = '0x789...';
const mintPositionData = '0x...'; // ABI-encoded position data
const positionId = await marginZeroProvider.mintPosition(handlerAddress, mintPositionData);
```

### Using a Position

```typescript
const handlerAddress = '0x789...';
const usePositionData = '0x...'; // ABI-encoded usage data
const result = await marginZeroProvider.usePosition(handlerAddress, usePositionData);

console.log(`Liquidity used: ${result.liquidityUsed}`);
console.log(`Tokens involved: ${result.tokens}`);
console.log(`Amounts: ${result.amounts}`);
```

## Error Handling

The MarginZero Provider implements robust error handling:

* Contract-level errors are properly decoded and reported
* RPC connection failures include retry mechanisms
* Transaction simulation is performed before execution
* Gas estimation failures provide clear error messages

## Security Considerations

* Private keys are never exposed in logs or responses
* All parameters are validated before transactions
* Transaction limits can be configured for risk management
* Slippage protection is included for all transactions

## Future Enhancements

Planned improvements to the MarginZero integration include:

* Support for exotic option types
* Advanced options strategies (spreads, straddles, etc.)
* Portfolio hedging automation
* Options analytics dashboard
* Cross-chain options trading

## Technical References

* [Position Manager ABI](../../references/abis/position-manager.md)
* [Option Market ABI](../../references/abis/option-market.md)
* [MarginZero Protocol Documentation](https://docs.marginzero.exchange/)
