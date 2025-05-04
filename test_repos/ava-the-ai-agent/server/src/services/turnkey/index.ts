import {  TurnkeyApiClient } from "@turnkey/sdk-server";
import { ApiKeyStamper } from "@turnkey/sdk-server";
import { createActivityPoller } from "@turnkey/sdk-server";
import { v4 as uuidv4 } from "uuid";

// Load environment variables
const TURNKEY_API_HOST = process.env.TURNKEY_API_HOST || "https://api.turnkey.com";
const TURNKEY_ORGANIZATION_ID = process.env.TURNKEY_ORGANIZATION_ID || "";
const TURNKEY_API_KEY = process.env.TURNKEY_API_KEY || "";
const TURNKEY_API_PRIVATE_KEY = process.env.TURNKEY_API_PRIVATE_KEY || "";

if (!TURNKEY_ORGANIZATION_ID || !TURNKEY_API_KEY || !TURNKEY_API_PRIVATE_KEY) {
  console.warn("Turnkey configuration is incomplete. Some wallet features may not work.");
}

// Initialize Turnkey client
const stamper = new ApiKeyStamper({
  apiPublicKey: TURNKEY_API_KEY,
  apiPrivateKey: TURNKEY_API_PRIVATE_KEY,
});

const turnkeyClient = new TurnkeyClient({
  baseUrl: TURNKEY_API_HOST,
}, stamper);

const activityPoller = createActivityPoller({
  client: turnkeyClient,
  requestFn: turnkeyClient.getActivity,
});

/**
 * TurnkeyService provides methods for managing wallets and signing transactions
 * using Turnkey's infrastructure.
 */
export class TurnkeyService {
  /**
   * Creates a new sub-organization for a user
   * @param email User's email address
   * @param username User's username
   * @returns The created sub-organization ID
   */
  async createSubOrganization(email: string, username: string): Promise<string> {
    try {
      const subOrgName = `${username}-${uuidv4().slice(0, 8)}`;
      
      const createSubOrgActivity = await turnkeyClient.createSubOrganization({
        organizationId: TURNKEY_ORGANIZATION_ID,
        subOrganizationName: subOrgName,
        rootQuorumThreshold: 1,
        rootUsers: [
          {
            userName: username,
            emailAddress: email,
          },
        ],
      });

      const completedActivity = await activityPoller({
        activityId: createSubOrgActivity.activityId,
        organizationId: TURNKEY_ORGANIZATION_ID,
      });

      if (completedActivity.status !== "ACTIVITY_STATUS_COMPLETED") {
        throw new Error(`Failed to create sub-organization: ${completedActivity.status}`);
      }

      const subOrgId = completedActivity.result.createSubOrganizationResult?.subOrganizationId;
      
      if (!subOrgId) {
        throw new Error("Sub-organization ID not found in activity result");
      }

      return subOrgId;
    } catch (error) {
      console.error("Error creating sub-organization:", error);
      throw error;
    }
  }

  /**
   * Creates a new wallet for a sub-organization
   * @param subOrganizationId The sub-organization ID
   * @param walletName Name for the wallet
   * @returns The created wallet ID and address
   */
  async createWallet(subOrganizationId: string, walletName: string): Promise<{ walletId: string, address: string }> {
    try {
      // Create a new wallet
      const createWalletActivity = await turnkeyClient.createWallet({
        organizationId: subOrganizationId,
        walletName: walletName,
        walletType: "WALLET_TYPE_CONSENSUS_LAYER",
      });

      const completedActivity = await activityPoller({
        activityId: createWalletActivity.activityId,
        organizationId: subOrganizationId,
      });

      if (completedActivity.status !== "ACTIVITY_STATUS_COMPLETED") {
        throw new Error(`Failed to create wallet: ${completedActivity.status}`);
      }

      const walletId = completedActivity.result.createWalletResult?.walletId;
      
      if (!walletId) {
        throw new Error("Wallet ID not found in activity result");
      }

      // Create a new private key (address) for the wallet
      const createPrivateKeyActivity = await turnkeyClient.createPrivateKeys({
        organizationId: subOrganizationId,
        privateKeysParams: [
          {
            walletId: walletId,
            privateKeyName: `${walletName}-key`,
            curve: "CURVE_SECP256K1",
            addressFormats: ["ADDRESS_FORMAT_ETHEREUM"],
          },
        ],
      });

      const completedKeyActivity = await activityPoller({
        activityId: createPrivateKeyActivity.activityId,
        organizationId: subOrganizationId,
      });

      if (completedKeyActivity.status !== "ACTIVITY_STATUS_COMPLETED") {
        throw new Error(`Failed to create private key: ${completedKeyActivity.status}`);
      }

      const privateKeyId = completedKeyActivity.result.createPrivateKeysResult?.privateKeys[0].privateKeyId;
      const address = completedKeyActivity.result.createPrivateKeysResult?.privateKeys[0].addresses[0].address;
      
      if (!privateKeyId || !address) {
        throw new Error("Private key details not found in activity result");
      }

      return { walletId, address };
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    }
  }

  /**
   * Signs a transaction using Turnkey
   * @param subOrganizationId The sub-organization ID
   * @param privateKeyId The private key ID to sign with
   * @param unsignedTransaction The unsigned transaction hex
   * @returns The signed transaction hex
   */
  async signTransaction(
    subOrganizationId: string,
    privateKeyId: string,
    unsignedTransaction: string
  ): Promise<string> {
    try {
      const signActivity = await turnkeyClient.signTransaction({
        organizationId: subOrganizationId,
        privateKeyId: privateKeyId,
        unsignedTransaction: unsignedTransaction,
        type: "TRANSACTION_TYPE_ETHEREUM",
      });

      const completedActivity = await activityPoller({
        activityId: signActivity.activityId,
        organizationId: subOrganizationId,
      });

      if (completedActivity.status !== "ACTIVITY_STATUS_COMPLETED") {
        throw new Error(`Failed to sign transaction: ${completedActivity.status}`);
      }

      const signedTransaction = completedActivity.result.signTransactionResult?.signedTransaction;
      
      if (!signedTransaction) {
        throw new Error("Signed transaction not found in activity result");
      }

      return signedTransaction;
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw error;
    }
  }

  /**
   * Gets a list of wallets for a sub-organization
   * @param subOrganizationId The sub-organization ID
   * @returns Array of wallets
   */
  async getWallets(subOrganizationId: string): Promise<any[]> {
    try {
      const response = await turnkeyClient.getWallets({
        organizationId: subOrganizationId,
      });
      
      return response.wallets;
    } catch (error) {
      console.error("Error getting wallets:", error);
      throw error;
    }
  }

  /**
   * Gets a list of private keys for a wallet
   * @param subOrganizationId The sub-organization ID
   * @param walletId The wallet ID
   * @returns Array of private keys
   */
  async getPrivateKeys(subOrganizationId: string, walletId: string): Promise<any[]> {
    try {
      const response = await turnkeyClient.getPrivateKeys({
        organizationId: subOrganizationId,
        walletId: walletId,
      });
      
      return response.privateKeys;
    } catch (error) {
      console.error("Error getting private keys:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const turnkeyService = new TurnkeyService(); 