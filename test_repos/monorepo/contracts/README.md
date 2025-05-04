# AI Gaming Club NEAR Contract

This repository contains a NEAR smart contract for AI Gaming Club, a GameFi platform where users can bet on AIs playing against each other. The contract handles deposits and withdrawals for both NEAR and USDC tokens, with admin functionality to lock user funds and adjust balances as poker matches are played.

## Features

- Deposit and withdraw NEAR tokens
- Deposit and withdraw USDC tokens
- Admin functionality to lock/unlock user funds
- Admin ability to adjust balances upon unlocking
- Comprehensive event emission for all operations
- Full suite of deployment and management scripts

## Project Structure

```
ai-gaming-club-near/
├── src/
│   └── ai-gaming-club.js       # Main contract implementation
├── scripts/
│   ├── build.js                # Compiles contract to WebAssembly
│   ├── deploy.js               # General deployment script
│   ├── deploy-testnet.js       # Testnet-specific deployment
│   ├── deploy-mainnet.js       # Mainnet deployment with safety checks
│   ├── interact.js             # General contract interaction
│   ├── admin.js                # Admin operations interface
│   └── monitor.js              # Event monitoring with filtering
├── build/                      # Compiled contract output
├── package.json                # Project configuration and scripts
└── todo.md                     # Development task list
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- NEAR CLI (installed globally)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Building the Contract

```
npm run build
```

This will compile the contract to WebAssembly in the `build` directory.

### Deploying the Contract

#### To Testnet

```
npm run deploy:testnet <account_id> [admin_account] [usdc_token_contract]
```

- `account_id`: The account ID to deploy the contract to
- `admin_account`: (Optional) The account ID of the admin (defaults to the deployer)
- `usdc_token_contract`: (Optional) The account ID of the USDC token contract (defaults to `usdc.testnet`)

#### To Mainnet

```
npm run deploy:mainnet <account_id> [admin_account] [usdc_token_contract]
```

- `account_id`: The account ID to deploy the contract to
- `admin_account`: (Optional) The account ID of the admin (defaults to the deployer)
- `usdc_token_contract`: (Optional) The account ID of the USDC token contract (defaults to the standard USDC contract on mainnet)

### Interacting with the Contract

#### General Interaction

```
npm run interact [network] [contract_id] [method] [args_json]
```

- `network`: "testnet" or "mainnet" (default: testnet)
- `contract_id`: The account ID of the contract
- `method`: The method to call on the contract
- `args_json`: JSON string of arguments to pass to the method (default: {})

#### Admin Operations

```
npm run admin [network] [contract_id]
```

- `network`: "testnet" or "mainnet" (default: testnet)
- `contract_id`: The account ID of the contract

This will present a menu of admin operations to choose from.

#### Monitoring Events

```
npm run monitor [network] [contract_id] [block_height] [num_blocks]
```

- `network`: "testnet" or "mainnet" (default: testnet)
- `contract_id`: The account ID of the contract
- `block_height`: Block height to start from (default: latest)
- `num_blocks`: Number of blocks to scan (default: 100)

## Contract Methods

### User Methods

- `depositNear()` - Deposit NEAR tokens (payable)
- `withdrawNear({ amount })` - Withdraw NEAR tokens
- `depositUsdc({ amount })` - Deposit USDC tokens
- `withdrawUsdc({ amount })` - Withdraw USDC tokens
- `getNearBalance({ account_id })` - Get NEAR balance
- `getUsdcBalance({ account_id })` - Get USDC balance
- `isNearLocked({ account_id })` - Check if NEAR balance is locked
- `isUsdcLocked({ account_id })` - Check if USDC balance is locked

### Admin Methods

- `lockNearBalance({ account_id })` - Lock a user's NEAR balance
- `unlockNearBalance({ account_id, new_balance })` - Unlock a user's NEAR balance and optionally adjust it
- `lockUsdcBalance({ account_id })` - Lock a user's USDC balance
- `unlockUsdcBalance({ account_id, new_balance })` - Unlock a user's USDC balance and optionally adjust it
- `changeAdmin({ new_admin })` - Change the admin account
- `getAdmin()` - Get the current admin account
- `emergency_reset_admin()` - Reset current admin to contract deployer


## Events

The contract emits the following events:

- `CONTRACT_INITIALIZED` - Contract initialization
- `NEAR_DEPOSIT` - NEAR token deposit
- `NEAR_WITHDRAWAL` - NEAR token withdrawal
- `USDC_DEPOSIT` - USDC token deposit
- `USDC_WITHDRAWAL` - USDC token withdrawal
- `NEAR_BALANCE_LOCKED` - NEAR balance locked
- `NEAR_BALANCE_UNLOCKED` - NEAR balance unlocked
- `USDC_BALANCE_LOCKED` - USDC balance locked
- `USDC_BALANCE_UNLOCKED` - USDC balance unlocked
- `ADMIN_CHANGED` - Admin account changed

## License

MIT