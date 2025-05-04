# Ref Finance Agent

## Overview
The Ref Finance Agent is an autonomous agent that enables interaction with the Ref Finance DeFi ecosystem on the NEAR Protocol. It provides a comprehensive set of features for token swapping, liquidity pool analysis, and token management.

## Features

### Token Swapping
- Execute token swaps with optimal routing
- Support for single-hop and multi-hop trades
- Customizable slippage tolerance
- Transaction monitoring and history tracking

### Liquidity Pool Analysis
- Get comprehensive list of available pools
- Find pools containing specific tokens
- Identify direct pools between token pairs
- Cache pool data for efficient performance

### Token Management
- Query token balances across accounts
- Register tokens with accounts
- Fetch token metadata and prices
- Monitor popular tokens

## Usage

The RefAgent communicates with other agents through the event bus system. To interact with the RefAgent, send commands to the `task-manager-ref-agent` event channel.

### Available Commands

#### Get Pools
```typescript
eventBus.emit('task-manager-ref-agent', {
  command: 'get-pools',
  payload: {
    forceRefresh: true // Optional, defaults to false
  }
});
```

#### Find Pools With Token
```typescript
eventBus.emit('task-manager-ref-agent', {
  command: 'find-pools-with-token',
  payload: {
    tokenId: 'wrap.near'
  }
});
```

#### Find Direct Pools
```typescript
eventBus.emit('task-manager-ref-agent', {
  command: 'find-direct-pools',
  payload: {
    tokenInId: 'wrap.near',
    tokenOutId: 'usdt.tether-token.near'
  }
});
```

#### Get Token Price
```typescript
eventBus.emit('task-manager-ref-agent', {
  command: 'get-token-price',
  payload: {
    token_id: 'wrap.near',
    quote_id: 'usdt.tether-token.near' // Optional, defaults to 'wrap.near'
  }
});
```

#### Register Token
```typescript
eventBus.emit('task-manager-ref-agent', {
  command: 'register-token',
  payload: {
    account_id: 'your-account.near',
    token_id: 'token.example.near'
  }
});
```

#### Get Token Balances
```typescript
eventBus.emit('task-manager-ref-agent', {
  command: 'get-token-balances',
  payload: {
    account_id: 'your-account.near',
    token_ids: ['wrap.near', 'usdt.tether-token.near'] // Optional, defaults to popular tokens
  }
});
```

#### Swap Tokens
```typescript
eventBus.emit('task-manager-ref-agent', {
  command: 'swap-tokens',
  payload: {
    account_id: 'your-account.near',
    token_in: 'wrap.near',
    token_out: 'usdt.tether-token.near',
    amount_in: '1000000000000000000000000', // Amount in yoctoNEAR (10^24)
    slippage_tolerance: 0.5, // Optional, defaults to 0.5%
    pool_id: 123 // Optional, will use smart routing if not provided
  }
});
```

## Configuration

The RefAgent requires the following configuration:

```typescript
{
  networkId: 'mainnet', // or 'testnet'
  nodeUrl: 'https://rpc.mainnet.near.org',
  walletUrl: 'https://wallet.near.org',
  helperUrl: 'https://helper.mainnet.near.org',
  explorerUrl: 'https://explorer.near.org',
  refContractId: 'v2.ref-finance.near',
  wrapNearContractId: 'wrap.near'
}
```

## Architecture

The RefAgent is composed of the following services:

1. **RefApiClient**: Handles direct communication with the NEAR blockchain and Ref Finance APIs
2. **RefSwapService**: Manages token swap operations
3. **RefTokenService**: Handles token-related operations like balances and registration
4. **RefPoolService**: Manages liquidity pool data and analysis

## Future Enhancements

- Support for providing liquidity to pools
- Yield farming automation
- Portfolio analysis and optimization
- Historical price data and charting
- Smart swap routing with slippage optimization 