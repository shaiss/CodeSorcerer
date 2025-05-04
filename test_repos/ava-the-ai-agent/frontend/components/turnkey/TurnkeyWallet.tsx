"use client";

import React, { useState } from "react";
import { useTurnkey } from "@/app/contexts/TurnkeyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const TurnkeyWallet: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    address,
    error,
    login,
    logout,
    createWallet,
  } = useTurnkey();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [walletName, setWalletName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, username);
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    await createWallet(walletName);
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-white">Turnkey Wallet</h2>

      {error && (
        <div className="bg-red-500 text-white p-2 rounded mb-4">
          {error}
        </div>
      )}

      {!isAuthenticated ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Logging in..." : "Login with Passkey"}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-700 p-3 rounded">
            <p className="text-sm text-gray-300">Wallet Address:</p>
            <p className="text-white break-all">
              {address || "No wallet created yet"}
            </p>
          </div>

          {!address && (
            <form onSubmit={handleCreateWallet} className="space-y-4">
              <div>
                <Label htmlFor="walletName" className="text-white">Wallet Name</Label>
                <Input
                  id="walletName"
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  required
                  placeholder="Enter wallet name"
                  className="w-full"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Creating wallet..." : "Create Wallet"}
              </Button>
            </form>
          )}

          <Button
            onClick={logout}
            variant="outline"
            className="w-full"
          >
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}; 