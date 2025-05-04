# Superchain Bridge Integration

The Superchain Bridge Agent enables secure cross-chain token transfers between Superchain networks using the SuperchainERC20 standard and SuperchainTokenBridge.

## Features

### Secure Token Bridging
- Implements ERC-7802 for cross-chain mint/burn functionality
- Uses SuperchainTokenBridge for secure message passing
- Supports all Superchain networks (OP Mainnet, Base, etc.)
- Real-time bridge status monitoring

### Autonomous Bridge Operations
- Automated token approvals
- Transaction status tracking
- Gas optimization
- Error recovery and retries

## Supported Networks

Currently supported Superchain networks:
- OP Mainnet (Chain ID: 10)
- OP Goerli (Chain ID: 420)
- Base (Chain ID: 8453)
- Base Goerli (Chain ID: 84531)

## How It Works

### Initiating Message (Source Chain)
```typescript
// User initiates bridge transaction
await bridgeAgent.handleEvent('BRIDGE_TOKENS', {
  token: 'USDC',
  amount: '1000000', // 1 USDC (6 decimals)
  fromChainId: 10,   // OP Mainnet
  toChainId: 8453,   // Base
  recipient: '0x...'
});
```

### Token Bridge Flow
- Tokens are burned on source chain
- Message is relayed through L2ToL2CrossDomainMessenger
- Tokens are minted on destination chain
- Real-time status updates via events

### Status Monitoring
```typescript
// Check bridge transaction status
await bridgeAgent.handleEvent('CHECK_BRIDGE_STATUS', {
  txHash: '0x...',
  fromChainId: 10,
  toChainId: 8453
});
```

## Security Features

### SuperchainERC20 Security
- Common cross-chain interface (ERC-7802)
- Secure mint/burn mechanics
- Permission controls for bridge contracts

