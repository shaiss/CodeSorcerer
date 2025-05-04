import { ethers } from 'ethers';
import ETokenABI from './abis/ETokenABI.json';
import PTokenABI from './abis/PTokenABI.json';
import UniversalBalanceABI from './abis/UniversalBalanceABI.json';

// Contract addresses on Monad Testnet
const CONTRACT_ADDRESSES = {
  'EToken-SWETH': '0x0f1208510A8C3373179F08F496992735a4B0878e',
  'EToken-USDC': '0x7a9C5264bCa5a04B7555bEe2B85c81bd85b12D51',
  'EToken-WBTC': '0x9E8B8EF23E4dF648ad186C38868E0D09Aae0A14f',
  'EToken-aUSD': '0xcf812caa58BEcD37DA673b6c265Bb1505b1D93a4',
  'PToken-LUSD': '0xe6DB1Fb846A59E0780124b659358B6d2ccb45A81',
  'PToken-USDC': '0x9E7EbD0f8255F3A910Bc77FD006A410E9D54EE36',
  'PToken-WBTC': '0xcDA16E9c25f429F4B01A87Ff302Ee7943F2D5015',
  'PToken-aprMON': '0xCfeE48B617F60067F1976E558D47c2Af3F9BD7a7',
  'shMonUniBalance': '0x483d37C74906d258b5Fc99fC88b3A781F5bAB23a',
  'usdcUniBalance': '0xa598C0533F7BDC43b9ebef054Ac92A48001BE727',
};

export class CurvanceService {
  private provider: ethers.providers.JsonRpcProvider;
  private adminWallet: ethers.Wallet;
  private agentAddress: string;

  constructor(
    providerUrl: string,
    adminPrivateKey: string,
    agentAddress: string
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
    this.adminWallet = new ethers.Wallet(adminPrivateKey, this.provider);
    this.agentAddress = agentAddress;
  }

  // Get contract instances
  private getETokenContract(tokenSymbol: string) {
    const address = CONTRACT_ADDRESSES[`EToken-${tokenSymbol}`];
    if (!address) throw new Error(`EToken for ${tokenSymbol} not found`);
    return new ethers.Contract(address, ETokenABI, this.adminWallet);
  }

  private getPTokenContract(tokenSymbol: string) {
    const address = CONTRACT_ADDRESSES[`PToken-${tokenSymbol}`];
    if (!address) throw new Error(`PToken for ${tokenSymbol} not found`);
    return new ethers.Contract(address, PTokenABI, this.adminWallet);
  }

  private getUniversalBalanceContract(tokenSymbol: string = 'usdc') {
    const address = CONTRACT_ADDRESSES[`${tokenSymbol}UniBalance`];
    if (!address) throw new Error(`UniversalBalance for ${tokenSymbol} not found`);
    return new ethers.Contract(address, UniversalBalanceABI, this.adminWallet);
  }

  // Plugin System Methods
  
  // Delegate approval to the AI agent
  async setDelegateApproval(userAddress: string, contractType: 'EToken' | 'PToken' | 'UniversalBalance', tokenSymbol: string, approve: boolean): Promise<string> {
    let contract;
    
    switch (contractType) {
      case 'EToken':
        contract = this.getETokenContract(tokenSymbol);
        break;
      case 'PToken':
        contract = this.getPTokenContract(tokenSymbol);
        break;
      case 'UniversalBalance':
        contract = this.getUniversalBalanceContract(tokenSymbol);
        break;
      default:
        throw new Error('Invalid contract type');
    }

    const tx = await contract.setDelegateApproval(this.agentAddress, approve);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  // UniversalBalance methods
  async depositFor(userAddress: string, amount: string, tokenSymbol: string = 'usdc'): Promise<string> {
    const contract = this.getUniversalBalanceContract(tokenSymbol);
    const tx = await contract.depositFor(amount, true, userAddress);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  async withdrawFor(userAddress: string, amount: string, recipientAddress: string, tokenSymbol: string = 'usdc'): Promise<string> {
    const contract = this.getUniversalBalanceContract(tokenSymbol);
    const tx = await contract.withdrawFor(amount, false, recipientAddress, userAddress);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  // EToken methods
  async borrowFor(userAddress: string, recipientAddress: string, amount: string, tokenSymbol: string): Promise<string> {
    const contract = this.getETokenContract(tokenSymbol);
    const tx = await contract.borrowFor(userAddress, recipientAddress, amount);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  // PToken methods
  async redeemCollateralFor(userAddress: string, amount: string, recipientAddress: string, tokenSymbol: string): Promise<string> {
    const contract = this.getPTokenContract(tokenSymbol);
    const tx = await contract.redeemCollateralFor(amount, recipientAddress, userAddress);
    const receipt = await tx.wait();
    return receipt.transactionHash;
  }

  // Market data methods
  async getInterestRate(tokenSymbol: string): Promise<{ supplyRate: string, borrowRate: string }> {
    const contract = this.getETokenContract(tokenSymbol);
    const interestRateModel = await contract.interestRateModel();
    // This would need to be expanded based on actual contract implementation
    return {
      supplyRate: "0", // Placeholder
      borrowRate: "0", // Placeholder
    };
  }

  async getUserBalance(userAddress: string, tokenSymbol: string = 'usdc'): Promise<{ sitting: string, lent: string }> {
    const contract = this.getUniversalBalanceContract(tokenSymbol);
    const balance = await contract.userBalances(userAddress);
    return {
      sitting: balance.sitting.toString(),
      lent: balance.lent.toString(),
    };
  }

  async getCollateralBalance(userAddress: string, tokenSymbol: string): Promise<string> {
    const contract = this.getPTokenContract(tokenSymbol);
    const balance = await contract.balanceOfUnderlying(userAddress);
    return balance.toString();
  }

  async getLiquidityData(tokenSymbol: string): Promise<{ totalBorrows: string, totalSupply: string }> {
    const contract = this.getETokenContract(tokenSymbol);
    const totalBorrows = await contract.totalBorrows();
    const totalSupply = await contract.totalSupply();
    return {
      totalBorrows: totalBorrows.toString(),
      totalSupply: totalSupply.toString(),
    };
  }
}

export const curvanceService = new CurvanceService(
  process.env.MONAD_RPC_URL || 'https://rpc.monad.testnet.io', 
  process.env.ADMIN_PRIVATE_KEY || '',
  process.env.AGENT_ADDRESS || ''
); 