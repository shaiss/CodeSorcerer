declare module 'nexus-js' {
  export class NexusClient {
    constructor(appId: string, rpcUrl: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getAccount(): Promise<any>;
  }

  export class MailBoxClient {
    constructor(mailboxAddress: string, rpcUrl: string, privateKey: string);
    sendMessage(recipient: string, message: string): Promise<any>;
    receiveMessages(): Promise<any[]>;
    getContract(): any;
    getAddress(): string;
  }

  export class ProofManagerClient {
    constructor(proofManagerAddress: string, rpcUrl: string, privateKey: string);
    verifyProof(proof: any): Promise<boolean>;
    updateNexusBlock(
      blockNumber: number,
      stateRoot: string,
      availHeaderHash: string,
      proof: string
    ): Promise<any>;
    updateChainState(
      blockNumber: number,
      proof: any,
      appId: string,
      account: any
    ): Promise<any>;
    getAppState(appId: string): Promise<any>;
  }

  export class ZKSyncVerifier {
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
    );
    
    getSourceAppId(): string;
    getDestinationAppId(): string;
    verifyProof(proof: any): Promise<boolean>;
    verifyStateTransition(from: string, to: string, proof: any): Promise<boolean>;
  }

  export interface MailboxMessageStruct {
    nexusAppIDFrom: string;
    nexusAppIDTo: string[];
    data: string;
    from: string;
    to: string[];
    nonce: number;
  }

  export function getStorageLocationForReceipt(receiptHash: string): string;
} 