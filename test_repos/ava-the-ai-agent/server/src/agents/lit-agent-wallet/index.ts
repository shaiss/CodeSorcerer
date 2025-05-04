import {
  Admin,
  Delegatee,
  IntentMatcher,
  ToolMetadata,
} from "@lit-protocol/aw-signer";
import { CreateSafeConfig } from "../safe-wallet-agent/types";
import { privateKeyToAccount } from "viem/accounts";
import { AUTH_METHOD_SCOPE } from "@lit-protocol/constants";
import { type AwTool } from "@lit-protocol/aw-tool";

export class LitAgent {
  private admin: Admin;
  private delegatee: Delegatee;

  constructor(adminPrivateKey: string, litNetwork: string) {
    this.admin = this.createAdmin(adminPrivateKey, litNetwork);
    this.delegatee = this.createDelegatee(adminPrivateKey, litNetwork);
  }

  private async createAdmin(
    adminPrivateKey: string,
    litNetwork: string
  ): Promise<Admin> {
    const admin = await Admin.create(
      {
        type: "eoa",
        privateKey: adminPrivateKey,
      },
      {
        litNetwork: "datil-dev",
      }
    );

    return admin;
  }

  private async createDelegatee(
    agentPrivateKey: string,
    litNetwork: string
  ): Promise<Delegatee> {
    const delegatee = await Delegatee.create(agentPrivateKey, {
      litNetwork: "datil-dev",
    });

    return delegatee;
  }

  private async createNewAgentWallet() {
    try {
      const mintPkp = await this.admin.mintPkp();
      console.log("new PKP wallet created >>>", mintPkp);
    } catch (error) {
      console.log("Error in creating new wallet >>", error);
    }
  }

  public async getPkpsTokenId() {
    const pkps = await this.admin.getPkps();
    console.log("pkps", pkps, pkps[0].info.tokenId);
    return pkps[0].info.tokenId;
  }

  public async checkDelegatee(agentPrivateKey: string) {
    const account = privateKeyToAccount(agentPrivateKey as `0x${string}`);

    const pkpsTokenId = await this.getPkpsTokenId();

    const delegates = await this.admin.getDelegatees(pkpsTokenId);
    console.log("delegates", delegates);

    if (delegates.includes(account.address)) {
      return true;
    } else {
      return false;
    }
  }

  public async addDelegatee(delegateeAddress: string) {
    try {
      const pkpsTokenId = await this.getPkpsTokenId();

      await this.admin.addDelegatee(pkpsTokenId, delegateeAddress);
    } catch (error) {
      console.log("Error in adding delegatee >>", error);
    }
  }

  public async permitTool(delegateeAddress: string) {
    const pkpsTokenId = await this.getPkpsTokenId();
    await this.admin.permitToolForDelegatee(
      pkpsTokenId,
      "tool-ipfs-cid",
      delegateeAddress
    );
  }

  public async checkAndRegisterTool(toolipfsCid: string) {
    try {
      const pkpsTokenId = await this.getPkpsTokenId();

      const { isRegistered, isEnabled } = await this.admin.isToolRegistered(
        pkpsTokenId,
        toolipfsCid
      );
      if (!isRegistered) {
        const { litContractsTxReceipt, toolRegistryContractTxReceipt } =
          await this.admin.registerTool(pkpsTokenId, toolipfsCid);

        console.log("litContractsTxReceipt", litContractsTxReceipt);
        console.log(
          "toolRegistryContractTxReceipt",
          toolRegistryContractTxReceipt
        );
      }

      if (!isEnabled) {
        await this.admin.enableTool(pkpsTokenId, toolipfsCid);
      }
    } catch (error) {
      console.log("Error in registering tool for admin >>", error);
    }
  }

  public async permitAndSetToolPolicyForDelegatee(
    toolipfsCid: string,
    delegateeAddress: string,
    policyIPFSCID: string
  ) {
    try {
      await this.checkAndRegisterTool(toolipfsCid);

      const pkpsTokenId = await this.getPkpsTokenId();

      const { isPermitted } = await this.admin.isToolPermittedForDelegatee(
        pkpsTokenId,
        toolipfsCid,
        delegateeAddress
      );

      if (!isPermitted) {
        await this.admin.permitToolForDelegatee(
          pkpsTokenId,
          toolipfsCid,
          delegateeAddress
        );
      }

      const { policyIpfsCid, enabled } =
        await this.admin.getToolPolicyForDelegatee(
          pkpsTokenId,
          toolipfsCid,
          delegateeAddress
        );

      if (!policyIpfsCid) {
        const receipt = await this.admin.setToolPolicyForDelegatee(
          pkpsTokenId,
          toolipfsCid,
          delegateeAddress,
          policyIPFSCID,
          true
        );
        console.log("Receipt", receipt);
      }

      if (!enabled) {
        await this.admin.enableToolPolicyForDelegatee(
          pkpsTokenId,
          toolipfsCid,
          delegateeAddress
        );
      }
    } catch (error) {
      console.log("Error in registering tool for admin >>", error);
    }
  }

  public async executeTool(toolipfsCid: string) {
    const pkpsTokenId = await this.getPkpsTokenId();

    const {
      toolsWithPolicies,
      toolsWithoutPolicies,
      toolsUnknownWithPolicies,
      toolsUnknownWithoutPolicies,
    } = await this.delegatee.getPermittedToolsForPkp(pkpsTokenId);

    console.log("toolsWithPolicies", toolsWithPolicies);

    // Select a tool (in this example, we'll use the first tool with a policy)
    const selectedTool = toolsWithPolicies[toolipfsCid];
    console.log("Selected tool", selectedTool.parameters.descriptions);

    // const intentMatcher = {
    // analyzeIntentAndMatchTool: async (intent:string,registeredTools:AwTool<any,any>[]) => {
    //   return {
    //     analysis: "analysis",
    //     matchedTool: registeredTools.find(tool => tool.ipfsCid === toolipfsCid), // Assuming the first tool is matched for simplicity
    //     params: "params",
    //   };
    // },
    // };

    // await this.delegatee.getToolViaIntent(
    //   pkpsTokenId,
    //   "Transfer 1 ETH to 0x123...",
    //   intentMatcher
    // );

    // await this.delegatee.executeTool({
    //   ipfsId: selectedTool.ipfsCid,
    //   jsParams: {
    //     params: {
    //       // Tool-specific parameters
    //       // For example, for ERC20 transfer:
    //       // tokenAddress: '0x...',
    //       // recipientAddress: '0x...',
    //       // amount: '1000000000000000000'
    //     },
    //   },
    // });
  }
}
