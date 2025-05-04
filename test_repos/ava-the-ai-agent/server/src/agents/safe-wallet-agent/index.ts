import Safe, {
  PredictedSafeProps,
  SafeAccountConfig,
} from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { getAllowanceModuleDeployment } from "@safe-global/safe-modules-deployments";
import { OperationType, MetaTransactionData } from "@safe-global/types-kit";
import { Agent } from "../agent";
import type { EventBus } from "../../comms";
import type { AIProvider } from "../../services/ai/types";
import { encodeFunctionData, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type {
  SafeWalletConfig,
  CreateSafeConfig,
  TransactionConfig,
  SpendingLimitConfig,
  AllowanceConfig,
  SafeWalletState,
} from "./types";

export class SafeWalletAgent extends Agent implements SafeWalletState {
  safe: Safe;
  apiKit: SafeApiKit;
  allowanceModule: any;
  safeAddress: string;

  constructor(
    name: string,
    eventBus: EventBus,
    aiProvider?: AIProvider,
    config?: SafeWalletConfig
  ) {
    super(name, eventBus, aiProvider);
    this.safeAddress = config?.safeAddress || "";
    this.initializeSafe(config?.rpcUrl || "", config?.chainId || 11155111);
  }

  private async initializeSafe(rpcUrl: string, chainId: number) {
    this.apiKit = new SafeApiKit({
      chainId: BigInt(chainId),
    });

    if (this.safeAddress) {
      this.safe = await Safe.init({
        provider: rpcUrl,
        safeAddress: this.safeAddress,
      });
    }

    this.allowanceModule = getAllowanceModuleDeployment({
      network: chainId.toString(),
    });
  }

  async createNewSafe(config: CreateSafeConfig) {
    const account = privateKeyToAccount(
      config.agentPrivateKey as `0x${string}`
    );
    const provider = this.safe.getSafeProvider().provider as any;
    console.log("provider", provider);

    const safeAccountConfig: SafeAccountConfig = {
      owners: config.owners,
      threshold: config.threshold,
    };

    const predictedSafe: PredictedSafeProps = {
      safeAccountConfig,
    };

    this.safe = await Safe.init({
      provider: provider,
      signer: config.agentPrivateKey,
      predictedSafe: predictedSafe,
    });
    this.safeAddress = await this.safe.getAddress();
    return this.safeAddress;
  }

  async proposeTransaction(tx: TransactionConfig) {
    const account = privateKeyToAccount(tx.agentPrivateKey as `0x${string}`);

    const safeTransaction = await this.safe.createTransaction({
      transactions: [
        {
          to: tx.to,
          data: tx.data,
          value: tx.value,
        },
      ],
    });

    const safeTxHash = await this.safe.getTransactionHash(safeTransaction);
    const signature = await this.safe.signHash(safeTxHash);

    await this.apiKit.proposeTransaction({
      safeAddress: this.safeAddress,
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderSignature: signature.data,
      senderAddress: await this.safe.getAddress(),
    });

    return safeTxHash;
  }

  async setSpendingLimit(config: SpendingLimitConfig) {
    const account = privateKeyToAccount(
      config.ownerPrivateKey as `0x${string}`
    );
    const allowanceModuleAddress =
      this.allowanceModule.networkAddresses[this.safe.getChainId().toString()];

    const addDelegateData = encodeFunctionData({
      abi: this.allowanceModule.abi,
      functionName: "addDelegate",
      args: [config.agentAddress],
    });

    const setAllowanceData = encodeFunctionData({
      abi: this.allowanceModule.abi,
      functionName: "setAllowance",
      args: [
        config.agentAddress,
        config.tokenAddress,
        config.amount,
        config.resetTimeInMinutes,
        0,
      ],
    });

    const transactions: MetaTransactionData[] = [
      {
        to: allowanceModuleAddress,
        value: "0",
        data: addDelegateData,
        operation: OperationType.Call,
      },
      {
        to: allowanceModuleAddress,
        value: "0",
        data: setAllowanceData,
        operation: OperationType.Call,
      },
    ];

    const safeTransaction = await this.safe.createTransaction({ transactions });
    return await this.safe.executeTransaction(safeTransaction);
  }

  async spendAllowance(config: AllowanceConfig) {
    const account = privateKeyToAccount(
      config.agentPrivateKey as `0x${string}`
    );

    const publicClient = createPublicClient({
      transport: http(this.safe.getSafeProvider().provider as any),
    });

    const allowance = (await publicClient.readContract({
      address:
        this.allowanceModule.networkAddresses[
          this.safe.getChainId().toString()
        ],
      abi: this.allowanceModule.abi,
      functionName: "getTokenAllowance",
      args: [
        this.safeAddress,
        await this.safe.getAddress(),
        config.tokenAddress,
      ],
    })) as any; // Type assertion since we know the structure

    const hash = await publicClient.readContract({
      address:
        this.allowanceModule.networkAddresses[
          this.safe.getChainId().toString()
        ],
      abi: this.allowanceModule.abi,
      functionName: "generateTransferHash",
      args: [
        this.safeAddress,
        config.tokenAddress,
        await this.safe.getAddress(),
        config.amount,
        "0x0000000000000000000000000000000000000000",
        0,
        allowance[4],
      ],
    });

    const signature = await this.safe.signHash(hash as `0x${string}`);

    const { request } = await publicClient.simulateContract({
      address:
        this.allowanceModule.networkAddresses[
          this.safe.getChainId().toString()
        ],
      abi: this.allowanceModule.abi,
      functionName: "executeAllowanceTransfer",
      args: [
        this.safeAddress,
        config.tokenAddress,
        await this.safe.getAddress(),
        config.amount,
        "0x0000000000000000000000000000000000000000",
        0,
        await this.safe.getAddress(),
        signature,
      ],
      account,
    });

    return request;
  }

  async handleEvent(event: string, data: any) {
    switch (event) {
      case "propose-transaction":
        return await this.proposeTransaction(data);
      case "set-spending-limit":
        return await this.setSpendingLimit(data);
      case "spend-allowance":
        return await this.spendAllowance(data);
      default:
        console.log(`Unknown event: ${event}`);
    }
  }

  async onStepFinish({ text, toolCalls, toolResults }: any): Promise<void> {
    // Handle step completion logic
    console.log("Step completed:", { text, toolCalls, toolResults });
  }
}
