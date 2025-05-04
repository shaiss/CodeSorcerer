import { create } from 'zustand';
import { SUPPORTED_CHAINS, type Chain } from '@/components/ui/chain-selector';

interface ChainState {
  selectedChain: Chain;
  setSelectedChain: (chain: Chain) => void;
}

// Ensure we have a default chain that's not undefined
const defaultChain: Chain = SUPPORTED_CHAINS[0]!;

export const useChainStore = create<ChainState>((set) => ({
  selectedChain: defaultChain,
  setSelectedChain: (chain) => set({ selectedChain: chain }),
})); 