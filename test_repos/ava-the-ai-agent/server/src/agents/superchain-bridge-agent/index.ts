import { Agent } from '../agent';
import { EventBus } from '../../comms';
import { AIProvider } from '../../services/ai/types';
import { ethers } from 'ethers';
import { Chain } from 'viem';

// Predeploy addresses from the Superchain spec
const SUPERCHAIN_TOKEN_BRIDGE = '0x4200000000000000000000000000000000000028';
const L2_TO_L2_MESSENGER = '0x4200000000000000000000000000000007';

interface SuperchainConfig {
  sourceChain: Chain;
  destinationChain: Chain;
  providerUrls: {
    [chainId: number]: string;
  };
  privateKey: string;
  supportedTokens: {
    [chainId: number]: {
      [symbol: string]: string; // address
    };
  };
}

export class SuperchainBridgeAgent extends Agent {
  private config: SuperchainConfig;
  private providers: Map<number, ethers.providers.JsonRpcProvider>;
  private signers: Map<number, ethers.Wallet>;

  constructor(
    eventBus: EventBus,
    config: SuperchainConfig,
    aiProvider?: AIProvider
  ) {
    super('SuperchainBridgeAgent', eventBus, aiProvider);
    
    this.config = config;
    this.providers = new Map();
    this.signers = new Map();

    // Initialize providers and signers for each chain
    Object.entries(config.providerUrls).forEach(([chainId, url]) => {
      const provider = new ethers.providers.JsonRpcProvider(url);
      const signer = new ethers.Wallet(config.privateKey, provider);
      
      this.providers.set(parseInt(chainId), provider);
      this.signers.set(parseInt(chainId), signer);
    });
  }

  async handleEvent(event: string, data: any): Promise<void> {
    switch (event) {
      case 'BRIDGE_TOKENS':
        await this.handleBridgeTokens(data);
        break;
      case 'CHECK_BRIDGE_STATUS':
        await this.checkBridgeStatus(data);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }
  }

  private async handleBridgeTokens(data: {
    token: string;
    amount: string;
    fromChainId: number;
    toChainId: number;
    recipient: string;
  }) {
    const { token, amount, fromChainId, toChainId, recipient } = data;
    
    try {
      const signer = this.signers.get(fromChainId);
      if (!signer) {
        throw new Error(`No signer configured for chain ${fromChainId}`);
      }

      const tokenAddress = this.config.supportedTokens[fromChainId][token];
      if (!tokenAddress) {
        throw new Error(`Token ${token} not supported on chain ${fromChainId}`);
      }

      // Create contract instances
      const bridgeContract = new ethers.Contract(
        SUPERCHAIN_TOKEN_BRIDGE,
        [
          'function sendERC20(address token, address to, uint256 amount, uint256 chainId) external returns (bytes32)',
        ],
        signer
      );

      // First approve the bridge to spend tokens
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
        ],
        signer
      );

      console.log(`Approving bridge to spend ${amount} ${token}...`);
      const approveTx = await tokenContract.approve(SUPERCHAIN_TOKEN_BRIDGE, amount);
      await approveTx.wait();

      // Send tokens through the bridge
      console.log(`Bridging ${amount} ${token} from chain ${fromChainId} to ${toChainId}...`);
      const bridgeTx = await bridgeContract.sendERC20(
        tokenAddress,
        recipient,
        amount,
        toChainId
      );
      const receipt = await bridgeTx.wait();

      // Emit bridge initiated event
      this.eventBus.emit('BRIDGE_INITIATED', {
        token,
        amount,
        fromChainId,
        toChainId,
        recipient,
        txHash: receipt.hash,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Bridge transaction failed:', error);
      throw error;
    }
  }

  private async checkBridgeStatus(data: {
    txHash: string;
    fromChainId: number;
    toChainId: number;
  }) {
    const { txHash, fromChainId, toChainId } = data;

    try {
      // Get providers for both chains
      const sourceProvider = this.providers.get(fromChainId);
      const destProvider = this.providers.get(toChainId);

      if (!sourceProvider || !destProvider) {
        throw new Error('Missing provider configuration');
      }

      // Check source chain transaction
      const sourceTx = await sourceProvider.getTransactionReceipt(txHash);
      if (!sourceTx) {
        throw new Error('Source transaction not found');
      }

      // Create messenger contract instance on destination chain
      const messenger = new ethers.Contract(
        L2_TO_L2_MESSENGER,
        [
          'function messageStatus(bytes32 messageHash) external view returns (uint8)',
        ],
        destProvider
      );

      // Extract message hash from source transaction logs
      // This would need to be implemented based on the specific event structure
      const messageHash = this.extractMessageHashFromLogs(sourceTx.logs);
      
      // Check message status on destination chain
      const status = await messenger.messageStatus(messageHash);

      // Emit status update event
      this.eventBus.emit('BRIDGE_STATUS_UPDATE', {
        txHash,
        fromChainId,
        toChainId,
        status,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to check bridge status:', error);
      throw error;
    }
  }

  private extractMessageHashFromLogs(logs: any[]): string {
    // Implementation would depend on the specific event structure
    // This is a placeholder that would need to be implemented
    return '0x';
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    console.log('Step finished:', { text, toolCalls, toolResults });
  }
} 