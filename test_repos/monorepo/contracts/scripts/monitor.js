#!/usr/bin/env node

const { connect, keyStores, utils } = require('near-api-js');
const readline = require('readline');
const path = require('path');
const homedir = require('os').homedir();

// Configuration
const CONFIG = {
  testnet: {
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
  },
  mainnet: {
    networkId: 'mainnet',
    nodeUrl: 'https://rpc.mainnet.near.org',
  }
};

// Event types to filter
const EVENT_TYPES = [
  'CONTRACT_INITIALIZED',
  'NEAR_DEPOSIT',
  'NEAR_WITHDRAWAL',
  'USDC_DEPOSIT',
  'USDC_WITHDRAWAL',
  'NEAR_BALANCE_LOCKED',
  'NEAR_BALANCE_UNLOCKED',
  'USDC_BALANCE_LOCKED',
  'USDC_BALANCE_UNLOCKED',
  'ADMIN_CHANGED'
];

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Parse command line arguments
const args = process.argv.slice(2);
const network = args[0] === 'mainnet' ? 'mainnet' : 'testnet';
const contractId = args[1];
const blockHeight = args[2] || 'latest';
const numBlocks = args[3] || '100';

// Validate arguments
if (!contractId) {
  console.error('[ERROR][CONFIG] Usage: monitor.js [network] [contract_id] [block_height] [num_blocks]');
  console.error('  network: "testnet" or "mainnet" (default: testnet)');
  console.error('  contract_id: The account ID of the contract');
  console.error('  block_height: Block height to start from (default: latest)');
  console.error('  num_blocks: Number of blocks to scan (default: 100)');
  process.exit(1);
}

// Connect to NEAR and monitor contract events
async function monitorEvents() {
  try {
    // Configure the connection
    const keyStore = new keyStores.UnencryptedFileSystemKeyStore(
      path.join(homedir, `.near-credentials/${network}`)
    );
    
    const nearConfig = {
      ...CONFIG[network],
      keyStore,
    };
    
    // Connect to NEAR
    const near = await connect(nearConfig);
    const provider = near.connection.provider;
    
    console.info(`[INFO][EVENTS] Monitoring events for contract ${contractId} on ${network}...`);
    
    // Get latest block height if not specified
    let startBlockHeight;
    if (blockHeight === 'latest') {
      const status = await provider.status();
      startBlockHeight = status.sync_info.latest_block_height - parseInt(numBlocks);
    } else {
      startBlockHeight = parseInt(blockHeight);
    }
    
    const endBlockHeight = startBlockHeight + parseInt(numBlocks);
    
    console.info(`[INFO][EVENTS] Scanning blocks from ${startBlockHeight} to ${endBlockHeight}`);
    
    // Ask which event types to filter
    console.info('\n[INFO][EVENTS] Available event types:');
    EVENT_TYPES.forEach((type, index) => {
      console.info(`${index + 1}. ${type}`);
    });
    console.info(`${EVENT_TYPES.length + 1}. ALL EVENTS`);
    
    const filterAnswer = await new Promise(resolve => {
      rl.question('Enter event type numbers to filter (comma-separated, or "all" for all events): ', resolve);
    });
    
    let selectedEventTypes = [];
    if (filterAnswer.toLowerCase() === 'all') {
      selectedEventTypes = EVENT_TYPES;
    } else {
      const selectedIndices = filterAnswer.split(',').map(s => parseInt(s.trim()) - 1);
      selectedEventTypes = selectedIndices.map(i => EVENT_TYPES[i]).filter(Boolean);
    }
    
    if (selectedEventTypes.length === 0) {
      console.info('[INFO][EVENTS] No valid event types selected. Monitoring all events.');
      selectedEventTypes = EVENT_TYPES;
    }
    
    console.info(`[INFO][EVENTS] Filtering for event types: ${selectedEventTypes.join(', ')}`);
    
    // Optional account filter
    const accountFilter = await new Promise(resolve => {
      rl.question('Filter by account ID (leave empty for all accounts): ', answer => {
        resolve(answer.trim());
      });
    });
    
    if (accountFilter) {
      console.info(`[INFO][EVENTS] Filtering for account: ${accountFilter}`);
    }
    
    // Process blocks and look for events
    let eventsFound = 0;
    
    for (let blockHeight = startBlockHeight; blockHeight <= endBlockHeight; blockHeight++) {
      try {
        // Get block
        const block = await provider.block({ blockId: blockHeight });
        
        // Get all chunks in the block
        for (const chunk of block.chunks) {
          try {
            // Get chunk details with transactions
            const chunkDetails = await provider.chunk(chunk.chunk_hash);
            
            // Process transactions
            if (chunkDetails.transactions) {
              for (const tx of chunkDetails.transactions) {
                // Check if transaction involves our contract
                if (tx.receiver_id === contractId) {
                  // Get transaction outcome
                  const txOutcome = await provider.txStatus(tx.hash, contractId);
                  
                  // Look for logs in receipts
                  for (const receipt of txOutcome.receipts_outcome) {
                    for (const log of receipt.outcome.logs) {
                      // Check if log is an event
                      if (log.startsWith('EVENT:')) {
                        try {
                          // Parse event JSON
                          const eventJson = log.slice(6).trim();
                          const event = JSON.parse(eventJson);
                          
                          // Check if event matches our filters
                          if (
                            event.standard === 'ai-gaming-club' && 
                            selectedEventTypes.includes(event.event) &&
                            (!accountFilter || 
                              (event.data.account_id && event.data.account_id === accountFilter) ||
                              (event.data.admin && event.data.admin === accountFilter))
                          ) {
                            eventsFound++;
                            
                            // Format and display the event
                            console.log('\n' + '='.repeat(80));
                            console.log(`EVENT #${eventsFound} (Block ${blockHeight}, Tx ${tx.hash})`);
                            console.log(`Type: ${event.event}`);
                            console.log(`Timestamp: ${new Date(parseInt(event.data.timestamp) / 1000000).toISOString()}`);
                            console.log('Data:');
                            console.log(JSON.stringify(event.data, null, 2));
                            console.log('='.repeat(80));
                          }
                        } catch (error) {
                          // Skip invalid event logs
                          continue;
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            // Skip problematic chunks
            continue;
          }
        }
        
        // Show progress every 10 blocks
        if (blockHeight % 10 === 0) {
          const progress = Math.floor(((blockHeight - startBlockHeight) / (endBlockHeight - startBlockHeight)) * 100);
          process.stdout.write(`\r[INFO][EVENTS] Scanning blocks... ${progress}% complete (${eventsFound} events found)`);
        }
      } catch (error) {
        // Skip problematic blocks
        continue;
      }
    }
    
    console.info(`\n\n[INFO][EVENTS] Scan complete. Found ${eventsFound} events matching your criteria.`);
    
    if (eventsFound === 0) {
      console.info('[INFO][EVENTS] No events found. Try scanning more blocks or adjusting your filters.');
    }
    
  } catch (error) {
    console.error('[ERROR][EVENTS] Error monitoring events:', error.message);
  } finally {
    rl.close();
  }
}

monitorEvents();
