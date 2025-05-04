# Safe Wallet Agent

The Safe Wallet Agent is a specialized agent that manages multi-signature wallets and spending limits for the portfolio manager. It integrates with the Safe Protocol to provide secure transaction management and automated portfolio operations.

## Features

1. Multi-Signature Wallet Management
   - Create new Safe wallets
   - Propose transactions
   - Sign and execute transactions
   - Manage multiple signers

2. Spending Limits
   - Set daily/weekly spending limits
   - Manage allowances for different tokens
   - Execute transactions within limits
   - Auto-reset allowances

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```env
SAFE_RPC_URL=your_rpc_url
SAFE_CHAIN_ID=11155111  # Sepolia testnet
AGENT_PRIVATE_KEY=your_private_key
```

## Usage

### 1. Initialize Safe Wallet Agent

```typescript
import { SafeWalletAgent } from './agents/safe-wallet-agent';

const agent = new SafeWalletAgent('safe-wallet', eventBus, aiProvider, {
  rpcUrl: process.env.SAFE_RPC_URL,
  chainId: parseInt(process.env.SAFE_CHAIN_ID),
});
```

### 2. Create New Safe Wallet

```typescript
const safeAddress = await agent.createNewSafe({
  owners: ['0x123...', '0x456...'],
  threshold: 2,
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
});
```

### 3. Propose Transaction

```typescript
const txHash = await agent.proposeTransaction({
  to: '0x789...',
  data: '0x...',
  value: '1000000000000000000', // 1 ETH
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
});
```

### 4. Set Spending Limit

```typescript
await agent.setSpendingLimit({
  agentAddress: '0x123...',
  tokenAddress: '0xabc...', // USDC contract
  amount: '1000000', // 1 USDC (6 decimals)
  resetTimeInMinutes: 1440, // 24 hours
  ownerPrivateKey: process.env.OWNER_PRIVATE_KEY,
});
```

### 5. Spend Within Allowance

```typescript
const request = await agent.spendAllowance({
  tokenAddress: '0xabc...', // USDC contract
  amount: '500000', // 0.5 USDC
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
});
```

## Integration with Portfolio Manager

The Safe Wallet Agent works in conjunction with other agents:

1. **Task Manager**: Coordinates multi-step transactions
2. **Observer**: Monitors transaction status and limits
3. **Executor**: Executes approved transactions
4. **SUI Agent**: Handles blockchain-specific operations

Example workflow:

```typescript
// 1. Task Manager initiates a trade
eventBus.emit('propose-transaction', {
  to: DEX_ADDRESS,
  data: swapCalldata,
  value: '0',
  agentPrivateKey: AGENT_KEY,
});

// 2. Safe Wallet Agent proposes the transaction
// 3. Other signers approve
// 4. Executor executes the approved transaction
```

## Security Considerations

1. **Private Keys**
   - Never hardcode private keys
   - Use secure environment variables
   - Rotate keys regularly

2. **Spending Limits**
   - Set conservative limits
   - Monitor usage patterns
   - Implement emergency pause

3. **Multi-Sig Setup**
   - Minimum 2-of-n configuration
   - Include human signers
   - Regular signer rotation

## Error Handling

The agent implements robust error handling:

```typescript
try {
  await agent.proposeTransaction(/* ... */);
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    // Handle insufficient funds
  } else if (error.code === 'EXECUTION_REVERTED') {
    // Handle failed transaction
  }
}
```

## Events

The agent emits and listens to the following events:

1. `propose-transaction`: Propose a new transaction
2. `set-spending-limit`: Set or update spending limits
3. `spend-allowance`: Execute within allowance

## Development

1. Run tests:
```bash
npm test
```

2. Build:
```bash
npm run build
```

3. Lint:
```bash
npm run lint
```