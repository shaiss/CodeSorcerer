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

// Admin operations menu
const ADMIN_OPERATIONS = [
  { name: 'Lock NEAR Balance', method: 'lockNearBalance', args: ['account_id'] },
  { name: 'Unlock NEAR Balance', method: 'unlockNearBalance', args: ['account_id', 'new_balance?'] },
  { name: 'Lock USDC Balance', method: 'lockUsdcBalance', args: ['account_id'] },
  { name: 'Unlock USDC Balance', method: 'unlockUsdcBalance', args: ['account_id', 'new_balance?'] },
  { name: 'Change Admin', method: 'changeAdmin', args: ['new_admin'] },
  { name: 'Get Admin', method: 'getAdmin', args: [] },
  { name: 'Get NEAR Balance', method: 'getNearBalance', args: ['account_id'] },
  { name: 'Get USDC Balance', method: 'getUsdcBalance', args: ['account_id'] },
  { name: 'Check if NEAR Locked', method: 'isNearLocked', args: ['account_id'] },
  { name: 'Check if USDC Locked', method: 'isUsdcLocked', args: ['account_id'] },
  { name: 'Emergency Reset Admin', method: 'emergency_reset_admin', args: ['new_admin'] }
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

// Validate arguments
if (!contractId) {
  console.error('[ERROR][CONFIG] Usage: admin.js [network] [contract_id]');
  console.error('  network: "testnet" or "mainnet" (default: testnet)');
  console.error('  contract_id: The account ID of the contract');
  process.exit(1);
}

// Connect to NEAR and interact with the contract
async function adminOperations() {
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
    
    // Get list of accounts from keystore
    const accountIds = await keyStore.getAccounts(network);
    
    if (accountIds.length === 0) {
      console.error(`[ERROR][CONFIG] No accounts found for ${network}. Please login first with 'near login'.`);
      process.exit(1);
    }
    
    // If multiple accounts, ask which one to use
    let accountId;
    if (accountIds.length === 1) {
      accountId = accountIds[0];
    } else {
      console.info('[INFO][CONFIG] Available accounts:');
      accountIds.forEach((id, index) => {
        console.info(`${index + 1}. ${id}`);
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Select account number to use: ', resolve);
      });
      
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= accountIds.length) {
        console.error('[ERROR][CONFIG] Invalid selection');
        process.exit(1);
      }
      
      accountId = accountIds[index];
    }
    
    console.info(`[INFO][ACCOUNT] Using account: ${accountId}`);
    
    // Load the account
    const account = await near.account(accountId);
    
    // Check if the account is the admin
    try {
      const admin = await account.viewFunction({
        contractId,
        methodName: 'getAdmin',
        args: {}
      });
      
      console.info(`[INFO][ACCOUNT] Current admin: ${admin}`);
      
      if (admin !== accountId) {
        console.info(`[WARNING][ACCOUNT] You are not the admin of this contract. Some operations may fail.`);
      }
    } catch (error) {
      console.info(`[ERROR][ACCOUNT] Could not verify admin status: ${error.message}`);
    }
    
    // Display admin operations menu
    console.info('\n[INFO][ADMIN] Available admin operations:');
    ADMIN_OPERATIONS.forEach((op, index) => {
      console.info(`${index + 1}. ${op.name}`);
    });
    
    const opAnswer = await new Promise(resolve => {
      rl.question('Select operation number: ', resolve);
    });
    
    const opIndex = parseInt(opAnswer) - 1;
    if (isNaN(opIndex) || opIndex < 0 || opIndex >= ADMIN_OPERATIONS.length) {
      console.error('[ERROR][ADMIN] Invalid selection');
      process.exit(1);
    }
    
    const operation = ADMIN_OPERATIONS[opIndex];
    console.info(`[INFO][ADMIN] Selected operation: ${operation.name}`);
    
    // Collect arguments for the operation
    const methodArgs = {};
    for (const argName of operation.args) {
      const isOptional = argName.endsWith('?');
      const cleanArgName = isOptional ? argName.slice(0, -1) : argName;
      
      const argValue = await new Promise(resolve => {
        const prompt = `Enter ${cleanArgName}${isOptional ? ' (optional)' : ''}: `;
        rl.question(prompt, answer => {
          resolve(answer.trim() === '' && isOptional ? null : answer.trim());
        });
      });
      
      if (argValue !== null) {
        methodArgs[cleanArgName] = argValue;
      }
    }
    
    console.info(`[INFO][ADMIN] Arguments:`, methodArgs);
    
    // Determine if this is a view or call method
    const isView = operation.method.startsWith('get') || operation.method.startsWith('is') || operation.method.startsWith('view');
    
    let result;
    if (isView) {
      // Call view method
      result = await account.viewFunction({
        contractId,
        methodName: operation.method,
        args: methodArgs
      });
    } else {
      // Call change method
      result = await account.functionCall({
        contractId,
        methodName: operation.method,
        args: methodArgs,
        gas: '300000000000000' // 300 TGas
      });
    }
    
    console.info(`[INFO][ADMIN] Operation result:\n`, JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`[ERROR][ADMIN] Error performing admin operation: ${error.message}`);
  } finally {
    rl.close();
  }
}

adminOperations();
