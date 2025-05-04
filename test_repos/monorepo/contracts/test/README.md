# AI Gaming Club Contract Testing

This directory contains automated tests for the AI Gaming Club NEAR contract. These tests use direct RPC calls instead of relying on the NEAR CLI, making them suitable for use in automated systems and backend integration.

## Prerequisites

- Node.js (v14 or later)
- NEAR account with testnet funds
- Access to the NEAR private key

## Setting Up

1. Copy the `.env.example` file to `.env` in the root directory:
   ```
   cp ../.env.example ../.env
   ```

2. Edit the `.env` file with your NEAR account information:
   ```
   NEAR_ACCOUNT_ID=your-testnet-account.testnet
   NEAR_PRIVATE_KEY=ed25519:your-private-key
   ```

   The private key can be found in one of these locations:
   - `~/.near-credentials/testnet/your-account.json` if you've used NEAR CLI
   - Exported from your NEAR wallet

3. Install dependencies:
   ```
   npm install
   ```

4. Build the contract:
   ```
   npm run build
   ```

## Running Tests

Run tests with:

```
npm test
```

This will:
1. Connect to NEAR using your private key
2. Deploy the contract to your account
3. Validate the user and admin functions
