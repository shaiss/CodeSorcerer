# Installation Guide

This guide walks you through the process of setting up the Ava Portfolio Manager system locally for development or personal use.

## Prerequisites

Before you begin, ensure you have the following prerequisites installed:

- **Node.js**: Version 18.x or higher
- **Bun**: Version 1.x or higher (recommended for optimal performance)
- **Git**: For cloning the repository
- **Docker** (optional): For containerized deployment

You will also need API keys for various services:

- **OpenAI API Key**: For AI capabilities
- **Groq API Key**: For Move Agent capabilities
- **Blockchain RPC URLs**: For interacting with various blockchains
- **Protocol-specific API Keys**: Depending on which agents you plan to use

## System Requirements

- **CPU**: 4+ cores recommended
- **RAM**: Minimum 8GB, 16GB+ recommended
- **Storage**: 1GB for the codebase, additional space for dependencies and database
- **Operating System**: macOS, Linux, or Windows with WSL

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/kamalbuilds/ava-portfolio-manager-ai-agent.git
cd ava-portfolio-manager-ai-agent
```

### 2. Set Up Environment Variables

Create environment files for both the frontend and server:

```bash
# For the server
cp server/.env.example server/.env

# For the frontend
cp frontend/.env.example frontend/.env
```

Edit both `.env` files to include your API keys and configuration.

#### Server Environment Variables

Required variables include:

```
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Provider
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
VENICE_API_KEY=your_venice_api_key

# Blockchain Configuration
ETHEREUM_RPC_URL=your_ethereum_rpc_url
ARBITRUM_RPC_URL=your_arbitrum_rpc_url
BASE_RPC_URL=your_base_rpc_url
AVALANCHE_RPC_URL=your_avalanche_rpc_url
MODE_RPC_URL=your_mode_rpc_url

# Agent-specific Configuration
HEDERA_ACCOUNT_ID=your_hedera_account_id
HEDERA_PRIVATE_KEY=your_hedera_private_key
HEDERA_NETWORK=testnet

APTOS_NETWORK=testnet
APTOS_PRIVATE_KEY=your_aptos_private_key
PANORA_API_KEY=your_panora_api_key

SXT_PRIVATE_KEY=your_sxt_private_key
SXT_PUBLIC_KEY=your_sxt_public_key
SXT_API_KEY=your_sxt_api_key

SONIC_CHAIN_ID=1
SONIC_RPC_URL=your_sonic_rpc_url

MARGIN_ZERO_POSITION_MANAGER_ADDRESS=0x...
MARGIN_ZERO_OPTION_MARKET_ADDRESS=0x...
```

#### Frontend Environment Variables

Required variables include:

```
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Wallets and Authentication
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id

# Feature Flags
NEXT_PUBLIC_ENABLE_TESTNET=true
NEXT_PUBLIC_ENABLE_AUTONOMOUS_MODE=true
```

### 3. Install Dependencies

Install dependencies for both the server and frontend:

```bash
# Install server dependencies using Bun (recommended)
cd server
bun install
# Alternatively, use npm
# npm install

# Install frontend dependencies
cd ../frontend
bun install
# Alternatively, use npm
# npm install
```

### 4. Build the Project

Build both the server and frontend:

```bash
# Build the server
cd server
bun run build
# or npm run build

# Build the frontend
cd ../frontend
bun run build
# or npm run build
```

### 5. Start the Development Servers

For development, you can run both the server and frontend in development mode:

```bash
# Start the server in dev mode
cd server
bun run dev
# or npm run dev

# In a separate terminal, start the frontend
cd frontend
bun run dev
# or npm run dev
```

For production, use:

```bash
# Start the server in production mode
cd server
bun run start
# or npm run start

# Start the frontend in production mode
cd frontend
bun run start
# or npm run start
```

## Docker Deployment (Optional)

For containerized deployment, you can use Docker:

```bash
# Build and start containers
docker-compose up -d
```

The Docker setup includes:
- Node.js container for the server
- Node.js container for the frontend
- Redis container for caching and message queue (optional)
- MongoDB container for storage (optional)

## Verifying Installation

After starting both the server and frontend, you can verify the installation:

1. Open your browser and navigate to `http://localhost:3000`
2. You should see the Ava Portfolio Manager welcome page
3. Check the server logs to ensure all agents initialized successfully
4. Try sending a simple query to the system via the chat interface

## Common Issues and Troubleshooting

### API Key Issues

If you see authentication errors in the logs, double-check your API keys in the environment files.

### Connection Errors

If the frontend cannot connect to the server:
- Ensure the server is running on the expected port
- Check that the `NEXT_PUBLIC_API_URL` is set correctly
- Verify network connections if running in containers

### Agent Initialization Failures

If certain agents fail to initialize:
- Check the specific environment variables for that agent
- Look for detailed error messages in the server logs
- Some agents may require additional configuration or services

### Memory Issues

If you encounter out-of-memory errors:
- Increase the Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`
- Consider running only the agents you need by modifying the configuration

## Next Steps

Once you have successfully installed Ava Portfolio Manager, you can:

- [Configure your environment](./configuration.md) for optimal performance
- Learn about [your first steps](./first-steps.md) with the system
- Explore [advanced usage](./advanced-usage.md) scenarios
- Check out the [developer documentation](../developers/index.md) to extend the system 