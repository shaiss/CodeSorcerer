"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./dropdown-menu";

// Define the chain type
export type Chain = {
  id: string;
  name: string;
  icon: string;
  agentId: string;
};

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    icon: "/chains/icons/ethereum.svg",
    agentId: "ethereum-agent"
  },
  {
    id: "base",
    name: "Base",
    icon: "/chains/icons/base.svg",
    agentId: "base-agent"
  },
  {
    id: "polygon",
    name: "Polygon",
    icon: "/chains/icons/polygon.svg",
    agentId: "polygon-agent"
  },
  {
    id: "mode",
    name: "Mode",
    icon: "https://pbs.twimg.com/profile_images/1688569679877390338/IYXD4bdy_400x400.jpg",
    agentId: "mode-agent"
  },
  {
    id: "sonic",
    name: "Sonic",
    icon: "https://theoregongroup.com/wp-content/uploads/2024/12/sonic-fantom-crypto.jpg",
    agentId: "sonic-agent"
  },
  {
    id: "aptos",
    name: "Aptos",
    icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCaIIAhOxVoT5xg7qffkHijoY-vH4gzVjvXQ&s",
    agentId: "move-agent"
  },
  {
    id: "hedera",
    name: "Hedera",
    icon: "https://cryptologos.cc/logos/hedera-hbar-logo.png",
    agentId: "hedera-agent"
  },
  {
    id: "near",
    name: "NEAR Protocol",
    icon: "https://cryptologos.cc/logos/near-protocol-near-logo.png",
    agentId: "near-agent"
  }
];

// Ensure we have a non-undefined default chain
const DEFAULT_CHAIN: Chain = {
  id: "ethereum",
  name: "Ethereum",
  icon: "/chains/icons/ethereum.svg",
  agentId: "ethereum-agent"
};

interface ChainSelectorProps {
  onChainSelect: (chain: Chain) => void;
  selectedChain?: Chain;
}

export function ChainSelector({ onChainSelect, selectedChain }: ChainSelectorProps) {
  // Use the first chain as default if none is selected
  const [selected, setSelected] = useState<Chain>(() => {
    if (selectedChain) {
      return selectedChain;
    }
    return DEFAULT_CHAIN;
  });

  const handleSelect = (chain: Chain) => {
    setSelected(chain);
    onChainSelect(chain);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 px-3">
          {selected.icon ? (
            <div className="relative w-5 h-5 rounded-full overflow-hidden">
              <Image
                src={selected.icon}
                alt={selected.name}
                fill
                className="object-contain"
              />
            </div>
          ) : null}
          <span>{selected.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] bg-gray-800" >
        {SUPPORTED_CHAINS.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-600 border-none"
            onClick={() => handleSelect(chain)}
          >
            {chain.icon ? (
              <div className="relative w-5 h-5 rounded-full overflow-hidden">
                <Image
                  src={chain.icon}
                  alt={chain.name}
                  fill
                  className="object-contain"
                />
              </div>
            ) : null}
            <span>{chain.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 