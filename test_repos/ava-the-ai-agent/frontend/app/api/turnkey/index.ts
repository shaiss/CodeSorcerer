import { Hono } from "hono";
import { turnkeyService } from "@/app/services/turnkey";

// Create a new Hono router for Turnkey endpoints
const turnkeyRouter = new Hono();

// Create a new sub-organization
turnkeyRouter.post("/sub-organization", async (c) => {
  try {
    const { email, username } = await c.req.json();

    if (!email || !username) {
      return c.json({ error: "Email and username are required" }, 400);
    }

    const subOrgId = await turnkeyService.createSubOrganization(email, username);
    return c.json({ subOrganizationId: subOrgId });
  } catch (error) {
    console.error("Error creating sub-organization:", error);
    return c.json({ error: "Failed to create sub-organization" }, 500);
  }
});

// Create a new wallet for a sub-organization
turnkeyRouter.post("/wallet", async (c) => {
  try {
    const { subOrganizationId, walletName } = await c.req.json();

    if (!subOrganizationId || !walletName) {
      return c.json({ error: "Sub-organization ID and wallet name are required" }, 400);
    }

    const wallet = await turnkeyService.createWallet(subOrganizationId, walletName);
    return c.json(wallet);
  } catch (error) {
    console.error("Error creating wallet:", error);
    return c.json({ error: "Failed to create wallet" }, 500);
  }
});

// Sign a transaction
turnkeyRouter.post("/sign-transaction", async (c) => {
  try {
    const { subOrganizationId, privateKeyId, unsignedTransaction } = await c.req.json();

    if (!subOrganizationId || !privateKeyId || !unsignedTransaction) {
      return c.json({ error: "Sub-organization ID, private key ID, and unsigned transaction are required" }, 400);
    }

    const signedTransaction = await turnkeyService.signTransaction(
      subOrganizationId,
      privateKeyId,
      unsignedTransaction
    );
    return c.json({ signedTransaction });
  } catch (error) {
    console.error("Error signing transaction:", error);
    return c.json({ error: "Failed to sign transaction" }, 500);
  }
});

// Get wallets for a sub-organization
turnkeyRouter.get("/wallets/:subOrganizationId", async (c) => {
  try {
    const subOrganizationId = c.req.param("subOrganizationId");

    if (!subOrganizationId) {
      return c.json({ error: "Sub-organization ID is required" }, 400);
    }

    const wallets = await turnkeyService.getWallets(subOrganizationId);
    return c.json({ wallets });
  } catch (error) {
    console.error("Error getting wallets:", error);
    return c.json({ error: "Failed to get wallets" }, 500);
  }
});

// Get private keys for a wallet
turnkeyRouter.get("/private-keys/:subOrganizationId/:walletId", async (c) => {
  try {
    const subOrganizationId = c.req.param("subOrganizationId");
    const walletId = c.req.param("walletId");

    if (!subOrganizationId || !walletId) {
      return c.json({ error: "Sub-organization ID and wallet ID are required" }, 400);
    }

    const privateKeys = await turnkeyService.getPrivateKeys(subOrganizationId, walletId);
    return c.json({ privateKeys });
  } catch (error) {
    console.error("Error getting private keys:", error);
    return c.json({ error: "Failed to get private keys" }, 500);
  }
});

export default turnkeyRouter; 