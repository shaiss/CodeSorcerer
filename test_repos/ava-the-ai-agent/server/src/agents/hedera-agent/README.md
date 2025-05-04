# Hedera Agent

The Hedera Agent is responsible for interacting with the Hedera network, allowing the portfolio manager to perform operations such as creating tokens, transferring assets, and managing topics on the Hedera blockchain.

## Features

- **Token Operations**:
  - Create fungible tokens
  - Transfer tokens between accounts
  - Associate/dissociate tokens with accounts
  - Get token balances

- **HBAR Operations**:
  - Get HBAR balances
  - Transfer HBAR between accounts

- **Consensus Service (HCS) Operations**:
  - Create topics
  - Submit messages to topics

## Configuration

The Hedera Agent requires the following environment variables to be set:

```
HEDERA_ACCOUNT_ID=0.0.123456  # Your Hedera account ID
HEDERA_PRIVATE_KEY=your_hedera_private_key_here  # Your Hedera private key
HEDERA_NETWORK=testnet  # Options: mainnet, testnet, previewnet
```

## Usage

The Hedera Agent can be used by the Task Manager to execute Hedera-related tasks. Here's an example of how to send a task to the Hedera Agent:

```typescript
// From the Task Manager
eventBus.emit('task-manager-hedera', {
  taskId: 'unique-task-id',
  task: JSON.stringify({
    operation: 'createFungibleToken',
    params: {
      name: 'My Token',
      symbol: 'MTK',
      decimals: 2,
      initialSupply: 1000,
      isSupplyKey: true
    }
  }),
  type: 'execute'
});
```

The Hedera Agent will process the task and emit a response event:

```typescript
// Response from the Hedera Agent
eventBus.emit('hedera-task-manager', {
  taskId: 'unique-task-id',
  result: {
    tokenId: '0.0.123456',
    transactionId: '0.0.123456@1234567890.000000000',
    message: 'Successfully created token My Token (MTK)'
  },
  status: 'completed'
});
```

## Available Operations

### createFungibleToken

Creates a new fungible token on the Hedera network.

**Parameters**:
- `name` (string): The name of the token
- `symbol` (string): The symbol of the token
- `decimals` (number, optional): The number of decimal places (defaults to 0)
- `initialSupply` (number, optional): The initial supply of tokens (defaults to 0)
- `isSupplyKey` (boolean, optional): Whether to create a supply key (defaults to false)
- `maxSupply` (number, optional): The maximum supply of tokens
- `isMetadataKey` (boolean, optional): Whether to create a metadata key (defaults to false)
- `isAdminKey` (boolean, optional): Whether to create an admin key (defaults to false)
- `tokenMetadata` (string, optional): Optional metadata for the token
- `memo` (string, optional): Optional memo for the token creation transaction

### transferToken

Transfers tokens from your account to another account.

**Parameters**:
- `tokenId` (string): The ID of the token to transfer
- `toAccountId` (string): The account ID to transfer tokens to
- `amount` (number): The amount of tokens to transfer

### getHbarBalance

Gets the HBAR balance of an account.

**Parameters**:
- `accountId` (string, optional): The account ID to check (defaults to your account)

### createTopic

Creates a new topic on the Hedera Consensus Service.

**Parameters**:
- `topicMemo` (string): The memo for the topic
- `isSubmitKey` (boolean, optional): Whether to create a submit key (defaults to false)

### submitTopicMessage

Submits a message to a topic on the Hedera Consensus Service.

**Parameters**:
- `topicId` (string): The ID of the topic to submit a message to
- `message` (string): The message to submit to the topic

### associateToken

Associates a token with an account.

**Parameters**:
- `tokenId` (string): The ID of the token to associate
- `accountId` (string, optional): The account ID to associate the token with (defaults to your account)

### getTokenBalance

Gets the balance of a specific token for an account.

**Parameters**:
- `tokenId` (string): The ID of the token to check
- `accountId` (string, optional): The account ID to check (defaults to your account) 