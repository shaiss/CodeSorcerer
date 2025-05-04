#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isContractInitialized } from '../test/utils/near-utils.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const buildDir = join(__dirname, '..', 'build');
const contractFile = join(buildDir, 'ai-gaming-club.wasm');

async function main() {
  // Check if contract file exists
  if (!fs.existsSync(contractFile)) {
    console.error(`Contract file not found: ${contractFile}`);
    console.error('Please run "npm run build" first to build the contract.');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const accountId = args[0];
  const adminAccount = args[1];
  const usdcTokenContract = args[2] || 'usdc.fakes.testnet'; // Default USDC contract on testnet

  // Validate arguments
  if (!accountId) {
    console.error('Usage: deploy-testnet.js [account_id] [admin_account] [usdc_token_contract]');
    console.error('  account_id: The account ID to deploy the contract to');
    console.error('  admin_account: The account ID of the admin (default: same as account_id)');
    console.error('  usdc_token_contract: The account ID of the USDC token contract (default: usdc.testnet)');
    process.exit(1);
  }

  // Set default admin account if not provided
  const finalAdminAccount = adminAccount || accountId;

  console.log(`Deploying AI Gaming Club contract to testnet...`);
  console.log(`Account ID: ${accountId}`);
  console.log(`Admin Account: ${finalAdminAccount}`);
  console.log(`USDC Token Contract: ${usdcTokenContract}`);

  try {
    // Login to NEAR account
    console.log(`\nPlease login to your NEAR account (${accountId})...`);
    execSync(`near login`, { stdio: 'inherit' });

    // Deploy the contract
    console.log(`\nDeploying contract...`);
    execSync(`near deploy ${accountId} ${contractFile} --networkId testnet`, { stdio: 'inherit' });

    // Check if the contract is already initialized
    console.log(`\nChecking if contract is already initialized...`);
    const {isInitialized, adminAccount} = await isContractInitialized(accountId);
    
    if (isInitialized) {
      console.log(`Contract is already initialized, skipping initialization.`);
    } else {
      // Initialize the contract
      console.log(`\nInitializing contract...`);
      execSync(
        `near call ${accountId} init '{"admin_account": "${finalAdminAccount}", "usdc_token_contract": "${usdcTokenContract}"}' --accountId ${accountId} --networkId testnet`,
        { stdio: 'inherit' }
      );
    }

    console.log(`\nContract deployed successfully!`);
    console.log(`Contract: ${accountId}`);
    console.log(`Admin: ${admin ? admin : adminAccount ? adminAccount : accountId}`);
    console.log(`USDC Token Contract: ${usdcTokenContract}`);
    console.log(`Explorer URL: https://explorer.testnet.near.org/accounts/${accountId}`);
  } catch (error) {
    console.error('Error deploying contract:', error.message);
    process.exit(1);
  }
}

// Execute the main function
main().catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});
