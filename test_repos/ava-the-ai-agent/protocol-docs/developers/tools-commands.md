# Developer Tools and Commands

This guide documents the various tools and commands available to developers working on the Ava Portfolio Manager system. These tools help with development, testing, deployment, and maintenance of the platform.

## Server Commands

The following commands are available in the server directory and can be run with either npm or bun:

### Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the server in development mode with hot-reloading |
| `bun run build` | Build the server for production |
| `bun run start` | Start the server in production mode |
| `bun run lint` | Run linting checks on the codebase |
| `bun run test` | Run the test suite |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with coverage reporting |

### Database Commands

| Command | Description |
|---------|-------------|
| `bun run db:migrate` | Run database migrations |
| `bun run db:seed` | Seed the database with test data |
| `bun run db:reset` | Reset the database (drop and recreate) |

### Utility Commands

| Command | Description |
|---------|-------------|
| `bun run generate:agent <name>` | Generate boilerplate for a new agent |
| `bun run generate:plugin <name>` | Generate boilerplate for a new plugin |
| `bun run docs:generate` | Generate API documentation |

## Frontend Commands

The following commands are available in the frontend directory and can be run with either npm or bun:

### Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the Next.js development server |
| `bun run build` | Build the frontend for production |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint on the codebase |
| `bun run format` | Format code with Prettier |
| `bun run type-check` | Run TypeScript type checking |

### Testing Commands

| Command | Description |
|---------|-------------|
| `bun run test` | Run Jest tests |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with coverage reporting |
| `bun run test:e2e` | Run end-to-end tests with Cypress |

### Component Development

| Command | Description |
|---------|-------------|
| `bun run storybook` | Start Storybook for component development |
| `bun run build-storybook` | Build Storybook for deployment |
| `bun run generate:component <name>` | Generate a new component with proper structure |

## Docker Commands

### Basic Docker Commands

| Command | Description |
|---------|-------------|
| `docker-compose up` | Start all services defined in docker-compose.yml |
| `docker-compose up -d` | Start all services in detached mode |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f` | Follow the logs from all services |
| `docker-compose build` | Rebuild all service containers |

### Service-Specific Commands

| Command | Description |
|---------|-------------|
| `docker-compose up server` | Start only the server service |
| `docker-compose up frontend` | Start only the frontend service |
| `docker-compose up -d database` | Start only the database service in detached mode |
| `docker-compose restart server` | Restart the server service |

## Development Tools

### Git Hooks

The project uses Husky for Git hooks to ensure code quality:

- **pre-commit**: Runs linting and formatting checks
- **pre-push**: Runs tests and type checking

### VS Code Extensions

Recommended extensions for VS Code:

- **ESLint**: JavaScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: Tailwind CSS class autocomplete
- **DotENV**: .env file syntax highlighting
- **Jest Runner**: Run Jest tests from VS Code
- **Debugger for Chrome**: Debug frontend code in Chrome

### Environment Management

Tools for managing environment variables:

| Command | Description |
|---------|-------------|
| `bun run env:check` | Check if all required environment variables are set |
| `bun run env:generate` | Generate .env files from templates |
| `bun run env:validate` | Validate environment variable values |

## Deployment Tools

### Production Deployment

| Command | Description |
|---------|-------------|
| `bun run deploy:prepare` | Prepare application for deployment |
| `bun run deploy:production` | Deploy to production environment |
| `bun run deploy:staging` | Deploy to staging environment |

### Monitoring and Maintenance

| Command | Description |
|---------|-------------|
| `bun run logs:production` | View production logs |
| `bun run metrics:check` | Check application metrics |
| `bun run backup:database` | Backup production database |
| `bun run health:check` | Run application health checks |

## Blockchain Tools

### Contract Interaction

| Command | Description |
|---------|-------------|
| `bun run contract:verify <address>` | Verify contract on block explorer |
| `bun run contract:interact <address>` | Interactive contract interface |
| `bun run contract:deploy <name>` | Deploy contract to configured network |

### Network Management

| Command | Description |
|---------|-------------|
| `bun run network:switch <network>` | Switch to a different blockchain network |
| `bun run network:status` | Check status of connected networks |
| `bun run rpc:test` | Test RPC endpoints for performance |

## Debugging Tools

### Server Debugging

| Command | Description |
|---------|-------------|
| `bun run debug` | Start server with debugger enabled |
| `bun run profile` | Run server with profiler enabled |
| `bun run trace:events` | Trace event bus traffic |
| `bun run trace:agents` | Trace agent activity |

### Frontend Debugging

| Command | Description |
|---------|-------------|
| `bun run analyze` | Analyze frontend bundle size |
| `bun run lighthouse` | Run Lighthouse performance tests |
| `bun run debug:render` | Enable component render debugging |

## CI/CD Tools

| Command | Description |
|---------|-------------|
| `bun run ci:test` | Run tests in CI environment |
| `bun run ci:build` | Build application in CI environment |
| `bun run ci:deploy` | Deploy from CI environment |

## Custom Script Development

When developing custom scripts, follow these guidelines:

1. Place scripts in the appropriate directory:
   - Server scripts in `server/scripts/`
   - Frontend scripts in `frontend/scripts/`
   - Shared scripts in `scripts/`

2. Use the TypeScript template for new scripts:

```typescript
#!/usr/bin/env bun
/**
 * @script example-script
 * @description Example script for documentation
 * @usage bun run scripts/example-script.ts [options]
 */

import { parseArgs } from 'node:util';
import { exit } from 'node:process';

// Parse command line arguments
const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    verbose: { type: 'boolean', short: 'v' },
  },
  strict: true,
});

// Show help if requested
if (values.help) {
  console.log('Usage: bun run scripts/example-script.ts [options]');
  console.log('Options:');
  console.log('  -h, --help     Show this help message');
  console.log('  -v, --verbose  Enable verbose output');
  exit(0);
}

// Script implementation
async function main() {
  try {
    // Script logic here
    console.log('Example script executed successfully');
  } catch (error) {
    console.error('Script failed:', error);
    exit(1);
  }
}

// Run the script
main();
```

## Troubleshooting

If you encounter issues with any of the tools or commands, try these steps:

1. **Clear Node Modules**:
   ```bash
   rm -rf node_modules
   bun install
   ```

2. **Reset Development Environment**:
   ```bash
   docker-compose down --volumes
   docker-compose up -d
   ```

3. **Check Logs**:
   ```bash
   bun run logs:server
   bun run logs:frontend
   ```

4. **Verify Environment Variables**:
   ```bash
   bun run env:check
   ```

For more detailed troubleshooting, refer to the [Troubleshooting Guide](../support/troubleshooting.md). 