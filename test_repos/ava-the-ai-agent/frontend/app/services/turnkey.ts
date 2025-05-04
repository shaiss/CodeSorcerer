/**
 * Turnkey service for frontend
 * This service communicates with the server-side Turnkey implementation
 */

// API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * TurnkeyService provides methods for interacting with Turnkey APIs
 */
class TurnkeyService {
  /**
   * Creates a new sub-organization for a user
   * @param email User's email address
   * @param username User's username
   * @returns The created sub-organization ID
   */
  async createSubOrganization(email: string, username: string): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/turnkey/sub-organization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create sub-organization");
      }

      const data = await response.json();
      return data.subOrganizationId;
    } catch (error) {
      console.error("Error creating sub-organization:", error);
      throw error;
    }
  }

  /**
   * Creates a new wallet for a sub-organization
   * @param subOrganizationId The sub-organization ID
   * @param walletName Name for the wallet
   * @returns The created wallet data
   */
  async createWallet(subOrganizationId: string, walletName: string): Promise<{ walletId: string, address: string }> {
    try {
      const response = await fetch(`${API_URL}/api/turnkey/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subOrganizationId, walletName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create wallet");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    }
  }

  /**
   * Signs a transaction using a private key
   * @param subOrganizationId The sub-organization ID
   * @param privateKeyId The private key ID
   * @param unsignedTransaction The transaction to sign
   * @returns The signed transaction
   */
  async signTransaction(
    subOrganizationId: string, 
    privateKeyId: string, 
    unsignedTransaction: string
  ): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/turnkey/sign-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          subOrganizationId, 
          privateKeyId, 
          unsignedTransaction 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to sign transaction");
      }

      const data = await response.json();
      return data.signedTransaction;
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw error;
    }
  }

  /**
   * Gets wallets for a sub-organization
   * @param subOrganizationId The sub-organization ID
   * @returns List of wallets
   */
  async getWallets(subOrganizationId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/turnkey/wallets/${subOrganizationId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get wallets");
      }

      const data = await response.json();
      return data.wallets;
    } catch (error) {
      console.error("Error getting wallets:", error);
      throw error;
    }
  }

  /**
   * Gets private keys for a wallet
   * @param subOrganizationId The sub-organization ID
   * @param walletId The wallet ID
   * @returns List of private keys
   */
  async getPrivateKeys(subOrganizationId: string, walletId: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/api/turnkey/private-keys/${subOrganizationId}/${walletId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get private keys");
      }

      const data = await response.json();
      return data.privateKeys;
    } catch (error) {
      console.error("Error getting private keys:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const turnkeyService = new TurnkeyService();
