import { StoryClient, StoryConfig, SupportedChainIds, GenerateIpMetadataParam, RegisterPILTermsRequest } from "@story-protocol/core-sdk";
import { Transport } from "viem";
import { IPLicenseTerms, IPMetadata } from '../../types/ip-agent';
import { Address, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import env from "../../../env";
import { createHash } from 'crypto';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const WIP_TOKEN_ADDRESS = '0x1514000000000000000000000000000000000000' as const;
const DEFAULT_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const RoyaltyPolicyLAP = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E' as `0x${string}`;

export interface ATCPIPConfig {
  agentId: string;
}

export class ATCPIPProvider {
  private storyClient: StoryClient;
  private agentId: string;

  constructor(config: ATCPIPConfig) {
    this.agentId = config.agentId;

    // Initialize Story Protocol client with proper configuration
    const privateKey = env.WALLET_PRIVATE_KEY as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    const storyConfig: StoryConfig = {
      account: account.address,
      // @ts-ignore
      transport: http(env.STORY_RPC_PROVIDER_URL) as unknown as Transport,
      chainId: "aeneid" as SupportedChainIds,
    };

    this.storyClient = StoryClient.newClient(storyConfig);
  }

  private getStoryClient(): StoryClient {
    if (!this.storyClient) throw new Error("StoryClient not connected");
    return this.storyClient;
  }

  private createCommercialRemixTerms(terms: IPLicenseTerms): RegisterPILTermsRequest {
    const ipfsHash = createHash('sha256').update(JSON.stringify(terms)).digest('hex');
    return {
      transferable: terms.transferability || false,
      royaltyPolicy: RoyaltyPolicyLAP,
      commercialUse: true,
      commercialAttribution: true,
      commercializerChecker: ZERO_ADDRESS as `0x${string}`,
      commercializerCheckerData: ZERO_ADDRESS as `0x${string}`,
      commercialRevShare: Math.floor((terms.royalty_rate || 0.05) * 100),
      derivativesAllowed: true,
      derivativesAttribution: true,
      derivativesApproval: false,
      derivativesReciprocal: true,
      currency: WIP_TOKEN_ADDRESS as `0x${string}`,
      uri: `ipfs://${ipfsHash}`,
      defaultMintingFee: '0',
      expiration: '0',
      commercialRevCeiling: '0',
      derivativeRevCeiling: '0',
    };
  }

  async mintLicense(terms: IPLicenseTerms, metadata: IPMetadata): Promise<string> {
    const client = this.getStoryClient();
    
    try {
      // Generate IP metadata using Story Protocol's format
      const ipMetadata: GenerateIpMetadataParam = {
        additionalProperties: {
          agentId: this.agentId,
          version: metadata.version,
          issueDate: metadata.issue_date.toString(),
          name: terms.name,
          description: terms.description,
          licenseType: terms.scope
        }
      };

      // Create NFT metadata
      const nftMetadata = {
        name: `NFT representing ${terms.name}`,
        description: terms.description,
        agentId: this.agentId,
      };

      // Generate metadata hashes
      const ipIpfsHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex');
      const nftIpfsHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex');

      // Register IP with Story Protocol
      const response = await client.ipAsset.mintAndRegisterIpAssetWithPilTerms({
        spgNftContract: (env.STORY_NFT_CONTRACT || ZERO_ADDRESS) as `0x${string}`,
        allowDuplicates: true,
        licenseTermsData: [{
          terms: this.createCommercialRemixTerms(terms),
          licensingConfig: {
            isSet: false,
            mintingFee: BigInt(0),
            licensingHook: ZERO_ADDRESS as `0x${string}`,
            hookData: DEFAULT_HASH,
            commercialRevShare: Math.floor((terms.royalty_rate || 0.05) * 100),
            disabled: false,
            expectMinimumGroupRewardShare: 0,
            expectGroupRewardPool: ZERO_ADDRESS as `0x${string}`,
          }
        }],
        ipMetadata: {
          ipMetadataURI: `ipfs://${ipIpfsHash}`,
          ipMetadataHash: `0x${ipIpfsHash}`,
          nftMetadataURI: `ipfs://${nftIpfsHash}`,
          nftMetadataHash: `0x${nftIpfsHash}`,
        },
        txOptions: { waitForTransaction: true },
      });

      console.log(
        `[Story] IP Asset created at transaction hash ${response.txHash}, IP ID: ${response.ipId}`,
      );

      return response.ipId || '';
    } catch (error) {
      console.error('[Story] Failed to mint license:', error);
      throw error;
    }
  }

  async getLicenses(address: string): Promise<any[]> {
    const client = this.getStoryClient();
    try {

      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-Api-Key': 'MhBsxkU1z9fG6TofE59KqiiWV-YlYE8Q4awlLQehF3U',
          'X-Chain': 'story-aeneid'
        }
      };

      const response = await fetch('https://api.storyapis.com/api/v3/licenses/ip/terms/ipId', options)
      .then(res => res.json())
      .then(res => console.log(res))
      .catch(err => console.error(err));
      
      

      // const license = await client.ipAsset.getIpAssetsByAddress(address);
      // @ts-ignore
      return response;
    } catch (error) {
      console.error('[Story] Failed to get licenses:', error);
      return [];
    }
  }

  async verifyLicense(licenseId: string): Promise<boolean> {
    const client = this.getStoryClient();
    try {
      const license = await client.ipAsset.register({
        nftContract: (process.env.NFT_CONTRACT_ADDRESS || ZERO_ADDRESS) as Address,
        tokenId: licenseId as Address,
        ipMetadata: {
          ipMetadataURI: '',
          ipMetadataHash: DEFAULT_HASH,
          nftMetadataURI: '',
          nftMetadataHash: DEFAULT_HASH,
        },
        txOptions: { waitForTransaction: true }
      });
      return !!license;
    } catch {
      return false;
    }
  }

  async getLicenseTerms(licenseId: string): Promise<IPLicenseTerms> {
    const client = this.getStoryClient();
    const license = await client.ipAsset.register({
      nftContract: (process.env.NFT_CONTRACT_ADDRESS || ZERO_ADDRESS) as Address,
      tokenId: licenseId as Address,
      ipMetadata: {
        ipMetadataURI: '',
        ipMetadataHash: DEFAULT_HASH,
        nftMetadataURI: '',
        nftMetadataHash: DEFAULT_HASH,
      },
      txOptions: { waitForTransaction: true }
    });
    
    return {
      name: license.ipId || '',
      description: '',
      scope: 'commercial',
      transferability: true,
      onchain_enforcement: true,
      royalty_rate: 0.05, // Default 5% royalty
    };
  }

  async getLicenseMetadata(licenseId: string): Promise<IPMetadata> {
    const client = this.getStoryClient();
    const license = await client.ipAsset.register({
      nftContract: (process.env.NFT_CONTRACT_ADDRESS || ZERO_ADDRESS) as Address,
      tokenId: licenseId as Address,
      ipMetadata: {
        ipMetadataURI: '',
        ipMetadataHash: DEFAULT_HASH,
        nftMetadataURI: '',
        nftMetadataHash: DEFAULT_HASH,
      },
      txOptions: { waitForTransaction: true }
    });
    
    return {
      license_id: license.ipId || '',
      issuer_id: license.ipId || '',
      holder_id: license.ipId || '',
      issue_date: Date.now(),
      version: '1.0',
      link_to_terms: '',
      previous_license_id: '',
    };
  }

  async listLicenses(options?: {
    issuerId?: string;
    holderId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{ licenseId: string; terms: IPLicenseTerms; metadata: IPMetadata }>> {
    const client = this.getStoryClient();
    const owner = options?.issuerId || options?.holderId || ZERO_ADDRESS;
    
    // Get licenses using Story Protocol's list method
    const licenses = await client.ipAsset.register({
      nftContract: (process.env.NFT_CONTRACT_ADDRESS || ZERO_ADDRESS) as Address,
      tokenId: owner as Address,
      ipMetadata: {
        ipMetadataURI: '',
        ipMetadataHash: DEFAULT_HASH,
        nftMetadataURI: '',
        nftMetadataHash: DEFAULT_HASH,
      },
      txOptions: { waitForTransaction: true }
    });

    return [{
      licenseId: licenses.ipId || '',
      terms: {
        name: '',
        description: '',
        scope: 'commercial',
        transferability: true,
        onchain_enforcement: true,
        royalty_rate: 0.05,
      },
      metadata: {
        license_id: licenses.ipId || '',
        issuer_id: licenses.ipId || '',
        holder_id: licenses.ipId || '',
        issue_date: Date.now(),
        version: '1.0',
        link_to_terms: '',
        previous_license_id: '',
      }
    }];
  }

  // New methods for agent-specific licensing

  async licenseTrainingData(
    trainingData: any,
    terms: IPLicenseTerms,
    metadata: IPMetadata
  ): Promise<string> {
    // First mint a license for the training data
    const licenseId = await this.mintLicense(terms, metadata);
    return licenseId;
  }

  async licenseAgentOutput(
    output: any,
    outputType: 'image' | 'text' | 'code',
    terms: IPLicenseTerms,
    metadata: IPMetadata
  ): Promise<string> {
    // Mint license for agent output
    const licenseId = await this.mintLicense(terms, metadata);
    return licenseId;
  }

  async exchangeIP(
    fromAgentId: string,
    toAgentId: string,
    licenseId: string,
    terms: IPLicenseTerms
  ): Promise<boolean> {
    const client = this.getStoryClient();

    try {
      // Transfer the IP license using registerDerivativeWithLicenseTokens
      await client.ipAsset.registerDerivativeWithLicenseTokens({
        childIpId: toAgentId as Address,
        licenseTokenIds: [BigInt(licenseId)],
        txOptions: { waitForTransaction: true },
        maxRts: 100_000_000,
      });

      return true;
    } catch (error) {
      console.error('Failed to exchange IP:', error);
      return false;
    }
  }

  async payRoyalties(
    licenseId: string,
    amount: number
  ): Promise<boolean> {
    const client = this.getStoryClient();

    try {
      // Pay royalties using Story Protocol's payment system
      await client.royalty.payRoyaltyOnBehalf({
        receiverIpId: licenseId as Address,
        payerIpId: ZERO_ADDRESS as Address,
        token: WIP_TOKEN_ADDRESS as Address,
        amount: BigInt(amount),
        txOptions: { waitForTransaction: true }
      });

      return true;
    } catch (error) {
      console.error('Failed to pay royalties:', error);
      return false;
    }
  }
}