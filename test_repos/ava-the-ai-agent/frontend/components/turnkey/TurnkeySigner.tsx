"use client";

import React, { useState } from "react";
import { useTurnkey } from "@/app/contexts/TurnkeyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const TurnkeySigner: React.FC = () => {
  const { isAuthenticated, address, signTransaction } = useTurnkey();
  
  const [privateKeyId, setPrivateKeyId] = useState("");
  const [unsignedTx, setUnsignedTx] = useState("");
  const [signedTx, setSignedTx] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSignedTx("");

    try {
      const signed = await signTransaction(privateKeyId, unsignedTx);
      setSignedTx(signed);
    } catch (err) {
      console.error("Signing error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !address) {
    return (
      <div className="p-4 bg-slate-800 rounded-lg shadow-lg">
        <p className="text-white">Please authenticate and create a wallet first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Sign Transaction</h2>

      {error && (
        <div className="bg-red-500 text-white p-2 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSign} className="space-y-4">
        <div>
          <Label htmlFor="privateKeyId" className="text-white">Private Key ID</Label>
          <Input
            id="privateKeyId"
            type="text"
            value={privateKeyId}
            onChange={(e) => setPrivateKeyId(e.target.value)}
            required
            placeholder="Enter private key ID"
            className="w-full"
          />
        </div>
        
        <div>
          <Label htmlFor="unsignedTx" className="text-white">Unsigned Transaction (hex)</Label>
          <Textarea
            id="unsignedTx"
            value={unsignedTx}
            onChange={(e) => setUnsignedTx(e.target.value)}
            required
            placeholder="Enter unsigned transaction hex"
            className="w-full h-32"
          />
        </div>
        
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Signing..." : "Sign Transaction"}
        </Button>
      </form>

      {signedTx && (
        <div className="mt-4">
          <Label htmlFor="signedTx" className="text-white">Signed Transaction</Label>
          <Textarea
            id="signedTx"
            value={signedTx}
            readOnly
            className="w-full h-32 mt-1"
          />
        </div>
      )}
    </div>
  );
}; 