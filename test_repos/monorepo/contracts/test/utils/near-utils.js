import { connect, keyStores, utils, providers } from 'near-api-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Initialize NEAR connection using private key from .env
 * @returns {Object} NEAR connection objects
 */
export async function initNear() {
  const {
    NEAR_ACCOUNT_ID,
    NEAR_PRIVATE_KEY,
    NEAR_NETWORK,
    NEAR_NODE_URL
  } = process.env;

  if (!NEAR_ACCOUNT_ID || !NEAR_PRIVATE_KEY) {
    throw new Error('[ERROR][CONFIG] Missing NEAR credentials in .env file');
  }

  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = utils.KeyPair.fromString(NEAR_PRIVATE_KEY);
  
  await keyStore.setKey(NEAR_NETWORK || 'testnet', NEAR_ACCOUNT_ID, keyPair);

  const config = {
    keyStore,
    networkId: NEAR_NETWORK || 'testnet',
    nodeUrl: NEAR_NODE_URL || 'https://rpc.testnet.near.org'
  };

  const near = await connect(config);
  const account = await near.account(NEAR_ACCOUNT_ID);
  
  return { near, account, accountId: NEAR_ACCOUNT_ID };
}

/**
 * Check if a contract is already initialized
 * @param {String} contractId Contract ID
 * @param {Object} options Options object
 * @param {String} options.nodeUrl NEAR node URL
 * @returns {Object} {isInitialized: boolean, adminAccount: string}
 */
export async function isContractInitialized(contractId, options = {}) {
  const { nodeUrl = process.env.NEAR_NODE_URL } = options;
  if (!nodeUrl) {
    throw new Error('[ERROR][CONFIG] Missing NEAR_NODE_URL in .env file');
  }

  try {
    const connectionConfig = {
      url: nodeUrl
    };
    const provider = new providers.JsonRpcProvider(connectionConfig);
    
    // Try to access admin account using the getAdmin method
    const response = await provider.query({
      request_type: 'call_function',
      account_id: contractId,
      method_name: 'getAdmin',
      args_base64: Buffer.from(JSON.stringify({})).toString('base64'),
      finality: 'optimistic',
    });
    
    // If we get a result, the contract has been initialized
    const adminAccount = JSON.parse(Buffer.from(response.result).toString());
    return {isInitialized: !!adminAccount, admin: adminAccount};
  } catch (error) {
    // If we get an error, the contract is likely not initialized or the method doesn't exist
    return {isInitialized: false, admin: null};
  }
}

/**
 * Deploy a contract to NEAR
 * @param {Object} account NEAR account
 * @param {String} contractName Contract name
 * @param {String} wasmPath Path to WASM file
 * @param {Object} initArgs Initialization arguments
 * @param {Object} options Options object
 * @param {String} options.verbose Verbose output
 * @returns {Object} Deployment result
 */
export async function deployContract(account, contractName, wasmPath, initArgs = {}, options = {}) {
  const { verbose = false } = options;
  try {
    const wasmBinary = readFileSync(wasmPath);
    
    // Deploy the contract
    if (verbose) {
      console.info(`[INFO][DEPLOY] Deploying contract to ${contractName}...`);
    }
    
    // First, check if the contract is already initialized
    const isInitialized = await isContractInitialized(contractName);
    if (verbose) {
      console.info(`[INFO][DEPLOY] Contract is initialized: ${isInitialized}`);
    }
    
    // First, create the account if it doesn't exist
    try {
      // Calculate gas and deposit for deployment
      const gas = utils.format.parseNearAmount('0.00000000003'); // 300 Tgas

      const deployResult = await account.deployContract(wasmBinary);

      if (verbose) {
        console.info(`[INFO][DEPLOY] Contract deployed successfully`);
      }

      // Initialize the contract if initialization arguments are provided and not already initialized
      if (Object.keys(initArgs).length > 0) {
        if (isInitialized) {
          if (verbose) {
            console.info(`[INFO][INIT] Contract is already initialized, skipping initialization`);
          }
          return { success: true, contractId: contractName, alreadyInitialized: true };
        } else {
          if (verbose) {
            console.info(`[INFO][INIT] Initializing contract with args:`, initArgs);
          }
          try {
            const initResult = await account.functionCall({
              contractId: contractName,
              methodName: 'init',
              args: initArgs,
              gas: gas,
              attachedDeposit: utils.format.parseNearAmount('0.01')
            });
            if (verbose) {
              console.info(`[INFO][INIT] Contract initialization successful`);
            }
            return { success: true, contractId: contractName };
          } catch (initError) {
            if (initError.toString().includes('Contract already initialized')) {
              if (verbose) {
                console.info(`[INFO][INIT] Contract is already initialized, initialization attempt was rejected`);
              }
              return { success: true, contractId: contractName, alreadyInitialized: true };
            } else {
              if (verbose) {
                console.error(`[ERROR][DEPLOY] Error initializing contract:`, initError);
              }
              return { success: false, error: initError, alreadyInitialized: false };
            }
          }
        }
      }

      return { success: true, contractId: contractName };
    } catch (error) {
      // Check if the error is because the contract is already initialized
      if (error.toString().includes('Contract already initialized')) {
        if (verbose) {
          console.info(`[INFO][INIT] Contract is already initialized`);
        }
        return { success: false, error, alreadyInitialized: true };
      }
      if (verbose) {
        console.error(`[ERROR][DEPLOY] Error deploying contract:`, error);
      }
      return { success: false, error, alreadyInitialized: isInitialized };
    }
  } catch (error) {
    if (verbose) {
      console.error(`[ERROR][DEPLOY] Failed to deploy contract:`, error);
    }
    return { success: false, error };
  }
}

/**
 * Call a contract view method
 * @param {String} contractId Contract ID
 * @param {String} methodName Method name
 * @param {Object} args Method arguments
 * @returns {Object} Method result
 */
export async function callViewMethod(contractId, methodName, args = {}) {
  const { NEAR_NODE_URL, NEAR_NETWORK } = process.env;
  const provider = new providers.JsonRpcProvider(NEAR_NODE_URL || `https://rpc.${NEAR_NETWORK || 'testnet'}.near.org`);
  
  try {
    const result = await provider.query({
      request_type: 'call_function',
      account_id: contractId,
      method_name: methodName,
      args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
      finality: 'optimistic',
    });
    
    return JSON.parse(Buffer.from(result.result).toString());
  } catch (error) {
    console.error(`Error calling view method ${methodName}:`, error);
    throw error;
  }
}

/**
 * Call a contract change method
 * @param {Object} account NEAR account
 * @param {String} contractId Contract ID
 * @param {String} methodName Method name
 * @param {Object} args Method arguments
 * @param {String} attachedDeposit Attached deposit in yoctoNEAR
 * @param {String} gas Gas to use
 * @returns {Object} Transaction result
 */
export async function callWriteMethod(account, contractId, methodName, args = {}, attachedDeposit = '0', gas = '300000000000000') {
  try {
    const result = await account.functionCall({
      contractId,
      methodName,
      args,
      gas,
      attachedDeposit
    });
    
    return result;
  } catch (error) {
    console.error(`Error calling change method ${methodName}:`, error);
    throw error;
  }
} 