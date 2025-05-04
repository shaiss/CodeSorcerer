# SQLite Adapter for ElizaOS

A lightweight SQLite adapter for ElizaOS that provides persistent storage with vector embedding support, relationship management, and caching capabilities. Designed for embedded applications and local development.

## Features

- Vector embedding storage with BLOB support
- JSON storage with validation
- Comprehensive schema for agents, rooms, and participants
- Relationship management system
- Memory and goal tracking
- Built-in caching system
- Foreign key constraints
- Automatic timestamp management

## Installation

```bash
pnpm add @elizaos/adapter-sqlite
```

## Database Schema

### Core Tables

#### Accounts
```sql
- id (TEXT PRIMARY KEY)
- name (TEXT)
- username (TEXT)
- email (TEXT)
- avatarUrl (TEXT)
- details (JSON)
```

#### Memories
```sql
- id (TEXT PRIMARY KEY)
- type (TEXT)
- content (TEXT)
- embedding (BLOB)
- userId (TEXT FK)
- roomId (TEXT FK)
- agentId (TEXT FK)
```

#### Goals
```sql
- id (TEXT PRIMARY KEY)
- name (TEXT)
- status (TEXT)
- description (TEXT)
- objectives (JSON)
```

### Relationship Management
```sql
- participants (user-room relationships)
- relationships (user-user connections)
- rooms (conversation spaces)
```

## Usage

### Basic Setup

```typescript
import { SqliteDatabaseAdapter } from '@elizaos/adapter-sqlite';

const adapter = new SqliteDatabaseAdapter('path/to/database.db');
await adapter.init();
```

### Room Management

```typescript
// Get room by ID
const room = await adapter.getRoom(roomId);

// Get participants in a room
const participants = await adapter.getParticipantsForRoom(roomId);
```

### Participant Management

```typescript
// Get participant state
const state = await adapter.getParticipantUserState(roomId, userId);

// Set participant state
await adapter.setParticipantUserState(roomId, userId, 'FOLLOWED');

// Get all participants for an account
const participants = await adapter.getParticipantsForAccount(userId);
```

### Memory Operations

```typescript
// Store a memory with embedding
await adapter.createMemory({
  type: 'conversation',
  content: 'Memory content',
  embedding: new Float32Array([...]),
  userId,
  roomId
});
```

### Goal Tracking

```typescript
// Create a new goal
await adapter.createGoal({
  name: 'Complete task',
  status: 'IN_PROGRESS',
  objectives: ['Research', 'Implementation'],
  userId,
  roomId
});
```

## Special Features

### JSON Validation
- Automatic JSON validation for fields like `details`, `objectives`, and `value`
- Enforced through SQLite CHECK constraints

### Vector Embeddings
- Optimized BLOB storage for embeddings
- Compatible with various embedding models
- Supports similarity search operations

### Timestamp Management
- Automatic `createdAt` timestamps
- Consistent datetime handling

## Performance Considerations

1. Uses prepared statements for efficient queries
2. Implements proper indexing on frequently accessed columns
3. Enforces data integrity through foreign key constraints
4. Optimized blob storage for vector embeddings
5. JSON validation at the database level

## Development and Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Test Coverage
- Room management operations
- Participant state handling
- Account relationships
- Database initialization
- Connection management

## Best Practices

1. Always initialize the adapter before use
2. Properly close the connection when done
3. Use transactions for multiple related operations
4. Handle potential JSON validation errors
5. Consider embedding size limitations
6. Implement proper error handling

## Requirements

- Node.js 23.3.0+
- SQLite 3.35.0+ (for JSON support)
- Sufficient disk space for vector storage
- ElizaOS core package
