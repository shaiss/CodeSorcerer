"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TurnkeyClient } from "@turnkey/sdk-browser";
import { WebauthnStamper } from "@turnkey/sdk-browser";
import { createActivityPoller } from "@turnkey/sdk-browser";

// Define the context type
interface TurnkeyContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  subOrganizationId: string | null;
  walletId: string | null;
  address: string | null;
  error: string | null;
  login: (email: string, username: string) => Promise<void>;
  logout: () => void;
  createWallet: (walletName: string) => Promise<void>;
  signTransaction: (privateKeyId: string, unsignedTransaction: string) => Promise<string>;
}

// Create the context with default values
const TurnkeyContext = createContext<TurnkeyContextType>({
  isAuthenticated: false,
  isLoading: false,
  subOrganizationId: null,
  walletId: null,
  address: null,
  error: null,
  login: async () => {},
  logout: () => {},
  createWallet: async () => {},
  signTransaction: async () => "",
});

// Hook for using the Turnkey context
export const useTurnkey = () => useContext(TurnkeyContext);

// Provider component
interface TurnkeyProviderProps {
  children: ReactNode;
}

export const TurnkeyProvider: React.FC<TurnkeyProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subOrganizationId, setSubOrganizationId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedSubOrgId = localStorage.getItem("turnkey_subOrganizationId");
    const storedWalletId = localStorage.getItem("turnkey_walletId");
    const storedAddress = localStorage.getItem("turnkey_address");

    if (storedSubOrgId) {
      setSubOrganizationId(storedSubOrgId);
      setIsAuthenticated(true);
    }

    if (storedWalletId) {
      setWalletId(storedWalletId);
    }

    if (storedAddress) {
      setAddress(storedAddress);
    }
  }, []);

  // Login function - creates a sub-organization for the user
  const login = async (email: string, username: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the server API to create a sub-organization
      const response = await fetch(`${process.env['NEXT_PUBLIC_API_URL']}/api/turnkey/sub-organization`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username }),
      });

      if (!response.ok) {
        throw new Error("Failed to create sub-organization");
      }

      const data = await response.json();
      const subOrgId = data.subOrganizationId;

      // Store the sub-organization ID
      setSubOrganizationId(subOrgId);
      localStorage.setItem("turnkey_subOrganizationId", subOrgId);
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setSubOrganizationId(null);
    setWalletId(null);
    setAddress(null);
    setIsAuthenticated(false);
    localStorage.removeItem("turnkey_subOrganizationId");
    localStorage.removeItem("turnkey_walletId");
    localStorage.removeItem("turnkey_address");
  };

  // Create wallet function
  const createWallet = async (walletName: string) => {
    if (!subOrganizationId) {
      setError("Not authenticated");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the server API to create a wallet
      const response = await fetch(`${process.env['NEXT_PUBLIC_API_URL']}/api/turnkey/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subOrganizationId, walletName }),
      });

      if (!response.ok) {
        throw new Error("Failed to create wallet");
      }

      const data = await response.json();
      
      // Store the wallet ID and address
      setWalletId(data.walletId);
      setAddress(data.address);
      localStorage.setItem("turnkey_walletId", data.walletId);
      localStorage.setItem("turnkey_address", data.address);
    } catch (err) {
      console.error("Create wallet error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign transaction function
  const signTransaction = async (privateKeyId: string, unsignedTransaction: string) => {
    if (!subOrganizationId) {
      throw new Error("Not authenticated");
    }

    try {
      // Call the server API to sign a transaction
      const response = await fetch(`${process.env['NEXT_PUBLIC_API_URL']}/api/turnkey/sign-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subOrganizationId, privateKeyId, unsignedTransaction }),
      });

      if (!response.ok) {
        throw new Error("Failed to sign transaction");
      }

      const data = await response.json();
      return data.signedTransaction;
    } catch (err) {
      console.error("Sign transaction error:", err);
      throw err;
    }
  };

  // Context value
  const value = {
    isAuthenticated,
    isLoading,
    subOrganizationId,
    walletId,
    address,
    error,
    login,
    logout,
    createWallet,
    signTransaction,
  };

  return <TurnkeyContext.Provider value={value}>{children}</TurnkeyContext.Provider>;
};

export default TurnkeyContext; 