"use client";

import React from "react";
import { TurnkeyWallet } from "@/components/turnkey/TurnkeyWallet";
import { TurnkeySigner } from "@/components/turnkey/TurnkeySigner";

export default function TurnkeyPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center text-white">Turnkey Wallet Integration</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div>
          <TurnkeyWallet />
        </div>
        <div>
          <TurnkeySigner />
        </div>
      </div>
    </div>
  );
} 