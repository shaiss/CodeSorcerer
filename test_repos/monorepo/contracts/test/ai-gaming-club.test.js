import { expect } from 'chai';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { initNear, deployContract, callViewMethod, callWriteMethod } from './utils/near-utils.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory path
const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('AI Gaming Club Contract Tests', function() {
  // Test variables
  let near;
  let account;
  let accountId;
  let contractId;
  const wasmPath = join(__dirname, '..', 'build', 'ai-gaming-club.wasm');
  
  // Setup - runs before all tests
  before(async function() {
    try {
      // Initialize NEAR connection with private key from .env
      const connection = await initNear();
      
      // If we don't have a connection, throw an error
      if (!connection.account) {
        throw new Error('Failed to load NEAR account private key');
      }
      
      near = connection.near;
      account = connection.account;
      accountId = connection.accountId;
      contractId = process.env.CONTRACT_ID || accountId;
      
      console.log(`Successfully connected to NEAR account: ${accountId}`);
    } catch (error) {
      console.error('Error in before hook:', error);
      throw error;
    }
  });
  
  // Test 1: Deploy the contract with private key
  it('should deploy the contract', async function() {
    try {
      const usdcContractId = process.env.USDC_CONTRACT_ID || 'usdc.fakes.testnet';
      
      // Deploy the contract
      const deployResult = await deployContract(
        account, 
        contractId, 
        wasmPath, 
        {
          admin_account: accountId,
          usdc_token_contract: usdcContractId
        }
      );
      
      // If the deployment fails but the contract is already initialized,
      // we should still consider this a success for the test
      if (!deployResult.success && deployResult.error && 
          (deployResult.error.toString().includes('Contract already initialized') ||
           deployResult.alreadyInitialized === true)) {
        console.log('Contract was already deployed and initialized');
        this.skip(); // Skip the rest of the test
        return;
      }
      
      expect(deployResult.success).to.be.true;
      expect(deployResult.contractId).to.equal(contractId);
      
      console.log(`Successfully deployed contract to ${contractId}`);
    } catch (error) {
      console.error('Deployment error:', error);
      throw error;
    }
  });
  
  // Test 2: Call the contract to get the admin
  it('should get the admin account', async function() {
    try {
      // Call the getAdmin view method
      const admin = await callViewMethod(contractId, 'getAdmin', {});
      
      expect(admin).to.equal(accountId);
      console.log(`Admin account is ${admin}`);
    } catch (error) {
      console.error('Error getting admin:', error);
      throw error;
    }
  });
  
  // Test 3: Change the contract owner
  it('should change the contract owner', async function() {
    try {
      // New admin account - for testing we'll use a derived account
      const newAdmin = `new-admin.${accountId}`;
      
      // Call the changeAdmin method
      const changeResult = await callWriteMethod(
        account,
        contractId,
        'changeAdmin',
        { new_admin: newAdmin }
      );
      
      // Verify the transaction succeeded
      expect(changeResult.transaction_outcome.status).to.have.property('SuccessValue');
      
      // Verify the admin was changed
      const admin = await callViewMethod(contractId, 'getAdmin', {});
      expect(admin).to.equal(newAdmin);
      
      console.log(`Successfully changed admin to ${newAdmin}`);
    } catch (error) {
      console.error('Error changing admin:', error);
      throw error;
    }
  });
}); 