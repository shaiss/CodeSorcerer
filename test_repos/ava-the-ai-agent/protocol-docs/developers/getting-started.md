# Getting Started with Ava Portfolio Manager Development

This guide will help you set up your development environment and understand the basic architecture of the Ava Portfolio Manager project.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v18.x or higher)
- [Bun](https://bun.sh/) (v1.0.0 or higher)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (optional, for containerized development)
- [Git](https://git-scm.com/)
- A code editor (we recommend [Visual Studio Code](https://code.visualstudio.com/))

## Setting Up Your Development Environment

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/ava-portfolio-manager.git
cd ava-portfolio-manager
```

### 2. Install Dependencies

The project is structured as a monorepo with two main directories:

- `server/` - Backend Node.js server
- `frontend/` - Next.js frontend application

Install dependencies for both:

```bash
# Install root dependencies
bun install

# Install server dependencies
cd server
bun install

# Install frontend dependencies
cd ../frontend
bun install

# Return to root
cd ..
```

### 3. Set Up Environment Variables

Create the necessary environment files:

```bash
# Server environment
cp server/.env.example server/.env.local

# Frontend environment
cp frontend/.env.example frontend/.env.local
```

Edit the `.env.local` files with your specific configuration values.

### 4. Start Development Servers

You can start both the frontend and backend in development mode:

```bash
# Start the backend server
cd server
bun run dev

# In a separate terminal, start the frontend
cd frontend
bun run dev
```

The backend server will be available at http://localhost:3001 and the frontend at http://localhost:3000.

## Project Structure

### Backend (Server)

The backend is organized as follows:

```
server/
├── src/
│   ├── agents/           # AI agents (Eliza, Sonic, Move, Task Manager)
│   │   ├── eliza-agent/  # Natural language conversational agent
│   │   ├── sonic-agent/  # DeFi transaction and integration agent
│   │   ├── move-agent/   # Portfolio analysis and strategy agent
│   │   ├── task-manager/ # Coordinates between agents
│   │   └── plugins/      # Integrations with external protocols
│   ├── api/              # API routes and controllers
│   ├── config/           # Configuration files
│   ├── database/         # Database models and migrations
│   ├── events/           # Event bus and event handlers
│   ├── services/         # Shared services
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── index.ts          # Entry point
├── tests/                # Test files
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

### Frontend

The frontend is built with Next.js and organized as follows:

```
frontend/
├── app/                  # Next.js app directory
│   ├── app/              # Main application pages (dashboard)
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   └── page.tsx          # Landing page
├── components/           # React components
│   ├── chat/             # Chat interface components
│   ├── dashboard/        # Dashboard components
│   ├── portfolio/        # Portfolio visualization components
│   └── ui/               # UI components (buttons, inputs, etc.)
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── public/               # Static assets
├── stores/               # Global state management
├── styles/               # Global styles
├── types/                # TypeScript types
├── next.config.js        # Next.js configuration
└── package.json          # Dependencies and scripts
```

## Core Concepts

### Agent System

The Ava Portfolio Manager is built around a multi-agent system:

1. **Eliza Agent** - The primary conversational interface that processes natural language and coordinates between other agents.
2. **Sonic Agent** - Handles DeFi protocol interactions, including transactions and data fetching.
3. **Move Agent** - Provides portfolio analysis, strategy suggestions, and financial modeling.
4. **Task Manager Agent** - Coordinates tasks between agents and manages the workflow.

### Event Bus

Agents communicate through a central event bus, which follows a publish-subscribe pattern:

```typescript
// Subscribe to an event
eventBus.subscribe("portfolio:updated", (data) => {
  // Handle the event
});

// Publish an event
eventBus.publish("portfolio:updated", { 
  walletAddress: "0x123...", 
  portfolioValue: 1000 
});
```

### Plugin System

The Sonic Agent uses a plugin system to interact with different DeFi protocols:

```typescript
// Example plugin usage
const uniswapProvider = new UniswapProvider({
  chainId: 1,
  rpcUrl: process.env.ETHEREUM_RPC_URL,
});

// Register the plugin with the Sonic Agent
const sonicAgent = new SonicAgent("sonic", eventBus, storage, uniswapProvider);
```

## Development Workflow

### Adding a New Feature

1. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement your changes**:
   - For new agent capabilities, add methods to the relevant agent class
   - For new UI features, add components and update pages
   - Add tests for your changes

3. **Run tests**:
   ```bash
   bun run test
   ```

4. **Submit a pull request**:
   - Ensure your code follows the project's style guide
   - Include a description of your changes
   - Reference any related issues

### Adding a New Protocol Integration

To add support for a new DeFi protocol:

1. Create a new plugin in `server/src/agents/plugins/`:
   ```bash
   mkdir -p server/src/agents/plugins/your-protocol
   touch server/src/agents/plugins/your-protocol/index.ts
   ```

2. Implement the plugin with necessary methods:
   ```typescript
   export interface YourProtocolConfig {
     chainId: number;
     rpcUrl: string;
     // Protocol-specific configuration
   }

   export class YourProtocolProvider {
     constructor(config: YourProtocolConfig) {
       // Initialize
     }

     // Implement protocol-specific methods
     async getPoolData(poolAddress: string) {
       // Implementation
     }
   }
   ```

3. Update the Sonic Agent to use your plugin:
   ```typescript
   // In server/src/agents/index.ts
   import { YourProtocolProvider } from './plugins/your-protocol';

   const yourProtocolProvider = new YourProtocolProvider({
     chainId: 1,
     rpcUrl: process.env.ETHEREUM_RPC_URL,
   });

   const sonicAgent = new SonicAgent(
     'sonic', 
     eventBus, 
     storage,
     uniswapProvider,
     yourProtocolProvider
   );
   ```

## Testing

### Unit Tests

Run unit tests for a specific component:

```bash
# Server unit tests
cd server
bun run test

# Frontend unit tests
cd frontend
bun run test
```

### Integration Tests

Integration tests can be run with:

```bash
# Server integration tests
cd server
bun run test:integration
```

### End-to-End Tests

End-to-end tests use Cypress:

```bash
# Start the application in test mode
bun run start:test

# In another terminal, run Cypress
cd frontend
bun run test:e2e
```

## Debugging

### Server Debugging

For detailed server logs:

```bash
cd server
DEBUG=ava:* bun run dev
```

### Transaction Debugging

To debug blockchain transactions:

```bash
cd server
DEBUG=ava:sonic:tx*,ava:sonic:provider* bun run dev
```

### Frontend Debugging

For frontend debugging, use the browser's developer tools. The application also provides debug information in the browser console when running in development mode.

## Common Issues and Solutions

### "Cannot find module" Error

If you encounter a "Cannot find module" error:

```bash
rm -rf node_modules
bun install
```

### Server Connection Issues

If the frontend can't connect to the backend:

1. Check that both servers are running
2. Verify the API URL in the frontend's `.env.local`
3. Check for any CORS issues in the browser console

### Database Connection Issues

If there are database connection errors:

1. Check your database configuration in `server/.env.local`
2. Ensure the database server is running
3. Try resetting the database with `bun run db:reset`

## Next Steps

Once you have your development environment set up, you can:

1. Explore the [API Documentation](../api/overview.md)
2. Learn about [Adding New Agents](./adding-new-agents.md)
3. Read the [Architecture Overview](../architecture/overview.md)
4. Check out the [Protocol Integrations](../protocols/overview.md)

## Contributing

Before submitting your changes, please:

1. Ensure all tests pass
2. Update documentation if necessary
3. Follow the coding style guidelines
4. Write meaningful commit messages

## Need Help?

If you need assistance:

- Check the project's GitHub issues
- Reach out to the dev team on Discord
- Consult the [Troubleshooting Guide](../support/troubleshooting.md) 