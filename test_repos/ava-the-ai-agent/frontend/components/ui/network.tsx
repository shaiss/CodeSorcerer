"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

export function NetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<{
    [key: string]: boolean;
  }>({
    arbitrum: false,
    base: false,
    ethereum: false,
  });

  useEffect(() => {
    const checkNetworks = async () => {
      const networks = {
        arbitrum: [
          "https://arb1.arbitrum.io/rpc",
          "https://arbitrum-mainnet.infura.io",
          "https://arbitrum.llamarpc.com",
        ],
        base: [
          "https://mainnet.base.org",
          "https://base.llamarpc.com",
          "https://base.gateway.tenderly.co",
        ],
        ethereum: [
          "https://eth-mainnet.g.alchemy.com/v2/demo",
          "https://ethereum.publicnode.com",
          "https://eth.llamarpc.com",
        ],
      };

      const newStatus = { ...networkStatus };

      for (const [network, urls] of Object.entries(networks)) {
        let isOnline = false;
        for (const url of urls) {
          try {
            const provider = new ethers.JsonRpcProvider(url);
            const blockNumber = await provider.getBlockNumber();
            if (blockNumber > 0) {
              isOnline = true;
              break;
            }
          } catch (error) {
            console.debug(`Failed to connect to ${network} via ${url}:`, error);
            continue;
          }
        }
        newStatus[network] = isOnline;
      }

      setNetworkStatus(newStatus);
    };

    checkNetworks().catch(console.error);
    const interval = setInterval(() => {
      checkNetworks().catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full backdrop-blur-sm border border-white/10">
      <div className="flex items-center gap-8 sm:gap-12">
        {Object.entries(networkStatus).map(([network, isOnline]) => (
          <div key={network} className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            />
            <span className="text-xs text-white/60 capitalize hidden sm:inline">
              {network}
            </span>
            <span className="text-xs text-white/60 capitalize sm:hidden">
              {network.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
