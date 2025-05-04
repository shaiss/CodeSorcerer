import { EventBus } from '../../comms';
import { CowTradingAgent } from './index';
import { OrderKind } from '@cowprotocol/cow-sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Create event bus
  const eventBus = new EventBus();

  // Initialize agent with private key from environment
  const privateKey = process.env.TRADER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TRADER_PRIVATE_KEY environment variable is required');
  }

  // Create agent instance
  const agent = new CowTradingAgent(
    eventBus,
    privateKey,
    'AVA_TEST'
  );

  // Subscribe to events
  eventBus.on('TRADE_EXECUTED', (data) => {
    console.log('Trade executed:', data);
  });

  eventBus.on('ALLOWLIST_UPDATED', (data) => {
    console.log('Allowlist updated:', data);
  });

  // Execute a test trade
  try {
    await agent.handleEvent('EXECUTE_TRADE', {
      sellToken: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14', // Test WETH
      buyToken: '0x0625afb445c3b6b7b929342a04a22599fd5dbb59',  // Test USDC
      amount: '100000000000000000', // 0.1 WETH
      kind: OrderKind.SELL,
    });

    console.log('Test trade executed successfully');
  } catch (error) {
    console.error('Test trade failed:', error);
  }
}

main().catch(console.error); 