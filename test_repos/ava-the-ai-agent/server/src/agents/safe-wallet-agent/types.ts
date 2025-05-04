import  Safe  from '@safe-global/protocol-kit';
import SafeApiKit  from '@safe-global/api-kit';
import type SafeModuleDeployment from '@safe-global/safe-modules-deployments';

export interface SafeWalletConfig {
  rpcUrl: string;
  safeAddress?: string;
  chainId: number;
}

export interface CreateSafeConfig {
  owners: string[];
  threshold: number;
  agentPrivateKey: string;
}

export interface TransactionConfig {
  to: string;
  data: string;
  value: string;
  agentPrivateKey: string;
}

export interface SpendingLimitConfig {
  agentAddress: string;
  tokenAddress: string;
  amount: string;
  resetTimeInMinutes: number;
  ownerPrivateKey: string;
}

export interface AllowanceConfig {
  tokenAddress: string;
  amount: string;
  agentPrivateKey: string;
}

export interface SafeWalletState {
  safe: Safe;
  apiKit: SafeApiKit;
  allowanceModule;
  safeAddress: string;
} 