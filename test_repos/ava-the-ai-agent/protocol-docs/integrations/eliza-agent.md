# Eliza Agent

Eliza serves as our conversational AI interface, providing human-like interaction while coordinating with other specialized agents:

## Code Links

1. https://github.com/kamalbuilds/ava-the-ai-agent/tree/dev/server/src/agents/eliza-agent

2. https://github.com/kamalbuilds/ava-the-ai-agent/blob/dev/server/src/agents/task-manager/toolkit.ts#L59

## Features

### Multi-Agent Orchestration
```typescript
// Eliza coordinates with other agents through event-driven architecture

class ElizaAgent extends BaseAgent {
  async generateInsight({
    position,
    analysis,
    tone,
    powered_by
  }) {
    // Natural language generation with personality
    // Coordination with other agents
  }
}
```

### Protocol-Specific Adapters
- Navi Protocol integration for leveraged positions
- Bluefin interface for perpetual trading
- Cetus integration for liquidity provision
- Aftermath connection for DCA and staking

### User Interaction Layer
- Casual, friendly communication style
- Complex strategy simplification
- Real-time position monitoring
- Risk alerts and notifications 