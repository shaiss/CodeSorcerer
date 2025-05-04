/**
 * Mock implementation of nexus-js
 * This file provides mock implementations of the classes from the nexus-js package,
 * allowing development to proceed without the actual package.
 */
import { Buffer } from 'buffer';

export class NexusClient {
  private appId: string;
  private rpcUrl: string;
  private isConnected: boolean = false;

  constructor(appId: string, rpcUrl: string) {
    this.appId = appId;
    this.rpcUrl = rpcUrl;
    console.log(`[NexusClient] Initialized with appId: ${appId}, rpcUrl: ${rpcUrl}`);
  }

  async connect(): Promise<void> {
    console.log(`[NexusClient] Connecting to Nexus network via ${this.rpcUrl}`);
    this.isConnected = true;
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {
    console.log(`[NexusClient] Disconnecting from Nexus network`);
    this.isConnected = false;
    return Promise.resolve();
  }

  async getAccount(): Promise<any> {
    console.log(`[NexusClient] Getting account for appId: ${this.appId}`);
    return {
      appId: this.appId,
      balance: "1000000000000000000",
      address: `0x${Buffer.from(this.appId).toString('hex').padStart(40, '0')}`
    };
  }
}

export class MailBoxClient {
  private mailboxAddress: string;
  private rpcUrl: string;
  private privateKey: string;
  private messageNonce: number = 0;
  private receivedMessages: any[] = [];

  constructor(mailboxAddress: string, rpcUrl: string, privateKey: string) {
    this.mailboxAddress = mailboxAddress;
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    console.log(`[MailBoxClient] Initialized with mailboxAddress: ${mailboxAddress}`);
  }

  async sendMessage(recipient: string, message: string): Promise<any> {
    console.log(`[MailBoxClient] Sending message to ${recipient}: ${message}`);
    const messageId = `msg_${Date.now()}_${this.messageNonce++}`;
    
    // Simulate message sending delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      messageId,
      recipient,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  }

  async receiveMessages(): Promise<any[]> {
    console.log(`[MailBoxClient] Receiving messages`);
    // Simulate some random messages
    const mockMessages = [
      {
        id: `msg_${Date.now()}_1`,
        sender: "0x1234567890123456789012345678901234567890",
        content: "Hello from source chain",
        timestamp: new Date().toISOString()
      },
      {
        id: `msg_${Date.now()}_2`,
        sender: "0x0987654321098765432109876543210987654321",
        content: "Token bridge request",
        timestamp: new Date().toISOString()
      }
    ];

    this.receivedMessages = [...this.receivedMessages, ...mockMessages];
    return this.receivedMessages;
  }

  getContract(): any {
    return {
      address: this.mailboxAddress,
      interface: {
        functions: {
          sendMessage: {
            name: "sendMessage",
            inputs: [
              { name: "to", type: "address" },
              { name: "data", type: "bytes" }
            ]
          },
          receiveMessage: {
            name: "receiveMessage",
            inputs: [
              { name: "messageId", type: "bytes32" }
            ]
          }
        }
      }
    };
  }

  getAddress(): string {
    return this.mailboxAddress;
  }
}

export class ProofManagerClient {
  private proofManagerAddress: string;
  private rpcUrl: string;
  private privateKey: string;
  private appStates: Map<string, any> = new Map();

  constructor(proofManagerAddress: string, rpcUrl: string, privateKey: string) {
    this.proofManagerAddress = proofManagerAddress;
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    console.log(`[ProofManagerClient] Initialized with proofManagerAddress: ${proofManagerAddress}`);
  }

  async verifyProof(proof: any): Promise<boolean> {
    console.log(`[ProofManagerClient] Verifying proof: ${JSON.stringify(proof)}`);
    // Mock implementation always returns true
    return true;
  }

  async updateNexusBlock(
    blockNumber: number,
    stateRoot: string,
    availHeaderHash: string,
    proof: string
  ): Promise<any> {
    console.log(`[ProofManagerClient] Updating Nexus block: ${blockNumber}`);
    return {
      txHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`,
      blockNumber,
      stateRoot,
      status: 'confirmed'
    };
  }

  async updateChainState(
    blockNumber: number,
    proof: any,
    appId: string,
    account: any
  ): Promise<any> {
    console.log(`[ProofManagerClient] Updating chain state for appId: ${appId}`);
    const newState = {
      blockNumber,
      appId,
      account,
      lastUpdated: new Date().toISOString()
    };
    this.appStates.set(appId, newState);
    return newState;
  }

  async getAppState(appId: string): Promise<any> {
    console.log(`[ProofManagerClient] Getting state for appId: ${appId}`);
    if (this.appStates.has(appId)) {
      return this.appStates.get(appId);
    }
    
    // Return a default state if none exists
    return {
      blockNumber: 0,
      appId,
      account: {},
      lastUpdated: new Date().toISOString()
    };
  }
}

export class ZKSyncVerifier {
  private config: {
    [appId: string]: {
      rpcUrl: string;
      mailboxContract: string;
      stateManagerContract: string;
      appID: string;
      chainId: string;
      type: string;
      privateKey: string;
    };
  };
  private sourceAppId: string;

  constructor(
    config: {
      [appId: string]: {
        rpcUrl: string;
        mailboxContract: string;
        stateManagerContract: string;
        appID: string;
        chainId: string;
        type: string;
        privateKey: string;
      };
    },
    sourceAppId: string
  ) {
    this.config = config;
    this.sourceAppId = sourceAppId;
    console.log(`[ZKSyncVerifier] Initialized with sourceAppId: ${sourceAppId}`);
  }

  getSourceAppId(): string {
    return this.sourceAppId;
  }

  getDestinationAppId(): string {
    // Find the destination app ID (the one that's not the source)
    const appIds = Object.keys(this.config);
    const destAppId = appIds.find(id => id !== this.sourceAppId);
    return destAppId || '';
  }

  async verifyProof(proof: any): Promise<boolean> {
    console.log(`[ZKSyncVerifier] Verifying proof: ${JSON.stringify(proof)}`);
    // Mock implementation always returns true
    return true;
  }

  async verifyStateTransition(from: string, to: string, proof: any): Promise<boolean> {
    console.log(`[ZKSyncVerifier] Verifying state transition from ${from} to ${to}`);
    // Mock implementation always returns true
    return true;
  }
}

export interface MailboxMessageStruct {
  nexusAppIDFrom: string;
  nexusAppIDTo: string[];
  data: string;
  from: string;
  to: string[];
  nonce: number;
}

export function getStorageLocationForReceipt(receiptHash: string): string {
  return `0x${Buffer.from(receiptHash).toString('hex').padStart(64, '0')}`;
} 