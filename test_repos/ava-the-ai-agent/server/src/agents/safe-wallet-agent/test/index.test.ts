import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SafeWalletAgent } from '../index';
import { EventBus } from '../../../comms';
import { AIProvider } from '../../../services/ai/types';

// Mock dependencies
jest.mock('@safe-global/protocol-kit');
jest.mock('@safe-global/api-kit');
jest.mock('@safe-global/safe-modules-deployments');
jest.mock('viem');

describe('SafeWalletAgent', () => {
  let agent: SafeWalletAgent;
  let eventBus: EventBus;
  let aiProvider: AIProvider;

  const mockConfig = {
    rpcUrl: 'https://rpc.sepolia.org',
    chainId: 11155111,
  };

  beforeEach(() => {
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    aiProvider = {
      generateText: jest.fn(),
      generateStep: jest.fn(),
    };

    agent = new SafeWalletAgent('test-safe-wallet', eventBus, aiProvider, mockConfig);
  });

  describe('createNewSafe', () => {
    it('should create a new Safe wallet', async () => {
      const config = {
        owners: ['0x123', '0x456'],
        threshold: 2,
        agentPrivateKey: '0x789',
      };

      const mockSafeAddress = '0xabc';
      agent.safe.getAddress = jest.fn().mockResolvedValue(mockSafeAddress);

      const result = await agent.createNewSafe(config);
      expect(result).toBe(mockSafeAddress);
    });
  });

  describe('proposeTransaction', () => {
    it('should propose a new transaction', async () => {
      const tx = {
        to: '0x123',
        data: '0x456',
        value: '1000000000000000000',
        agentPrivateKey: '0x789',
      };

      const mockTxHash = '0xdef';
      agent.safe.getTransactionHash = jest.fn().mockResolvedValue(mockTxHash);
      agent.safe.signHash = jest.fn().mockResolvedValue({ data: '0xsignature' });

      const result = await agent.proposeTransaction(tx);
      expect(result).toBe(mockTxHash);
    });
  });

  describe('setSpendingLimit', () => {
    it('should set a spending limit', async () => {
      const config = {
        agentAddress: '0x123',
        tokenAddress: '0x456',
        amount: '1000000',
        resetTimeInMinutes: 1440,
        ownerPrivateKey: '0x789',
      };

      const mockTxHash = '0xdef';
      agent.safe.executeTransaction = jest.fn().mockResolvedValue({ hash: mockTxHash });

      const result = await agent.setSpendingLimit(config);
      expect(result.hash).toBe(mockTxHash);
    });
  });

  describe('spendAllowance', () => {
    it('should spend within allowance', async () => {
      const config = {
        tokenAddress: '0x456',
        amount: '500000',
        agentPrivateKey: '0x789',
      };

      const mockRequest = {
        to: '0x123',
        data: '0x456',
        value: '0',
      };

      const mockPublicClient = {
        readContract: jest.fn().mockResolvedValue(['0', '0', '0', '0', '1']),
        simulateContract: jest.fn().mockResolvedValue({ request: mockRequest }),
      };

      const result = await agent.spendAllowance(config);
      expect(result).toEqual(mockRequest);
    });
  });

  describe('handleEvent', () => {
    it('should handle propose-transaction event', async () => {
      const mockTxHash = '0xdef';
      agent.proposeTransaction = jest.fn().mockResolvedValue(mockTxHash);

      const result = await agent.handleEvent('propose-transaction', {
        to: '0x123',
        data: '0x456',
        value: '0',
        agentPrivateKey: '0x789',
      });

      expect(result).toBe(mockTxHash);
      expect(agent.proposeTransaction).toHaveBeenCalled();
    });

    it('should handle set-spending-limit event', async () => {
      const mockTxHash = '0xdef';
      agent.setSpendingLimit = jest.fn().mockResolvedValue({ hash: mockTxHash });

      const result = await agent.handleEvent('set-spending-limit', {
        agentAddress: '0x123',
        tokenAddress: '0x456',
        amount: '1000000',
        resetTimeInMinutes: 1440,
        ownerPrivateKey: '0x789',
      });

      expect(result.hash).toBe(mockTxHash);
      expect(agent.setSpendingLimit).toHaveBeenCalled();
    });

    it('should handle spend-allowance event', async () => {
      const mockRequest = {
        to: '0x123',
        data: '0x456',
        value: '0',
      };
      agent.spendAllowance = jest.fn().mockResolvedValue(mockRequest);

      const result = await agent.handleEvent('spend-allowance', {
        tokenAddress: '0x456',
        amount: '500000',
        agentPrivateKey: '0x789',
      });

      expect(result).toEqual(mockRequest);
      expect(agent.spendAllowance).toHaveBeenCalled();
    });
  });
}); 