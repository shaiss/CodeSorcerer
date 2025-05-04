import { ethers } from 'ethers';
import { DEX_ABI, AI_TRADING_AGENT_ABI } from '../contracts/abis';

export class PortfolioManager {
    private dex: ethers.Contract;
    private aiAgent: ethers.Contract;
    private provider: ethers.providers.Web3Provider;

    constructor(
        dexAddress: string,
        aiAgentAddress: string,
        provider: ethers.providers.Web3Provider
    ) {
        this.provider = provider;
        this.dex = new ethers.Contract(dexAddress, DEX_ABI, provider.getSigner());
        this.aiAgent = new ethers.Contract(aiAgentAddress, AI_TRADING_AGENT_ABI, provider.getSigner());
    }

    async getPoolStats() {
        const reserveA = await this.dex.reserveA();
        const reserveB = await this.dex.reserveB();
        const totalLiquidity = await this.dex.totalLiquidity();

        return {
            reserveA: ethers.utils.formatEther(reserveA),
            reserveB: ethers.utils.formatEther(reserveB),
            totalLiquidity: ethers.utils.formatEther(totalLiquidity)
        };
    }

    async executeAITrade(tokenIn: string, amountIn: string) {
        const tx = await this.aiAgent.executeAITrade(
            tokenIn,
            ethers.utils.parseEther(amountIn)
        );
        return tx.wait();
    }

    async setRiskLevel(level: number) {
        const tx = await this.aiAgent.setRiskLevel(level);
        return tx.wait();
    }

    async toggleAgent() {
        const tx = await this.aiAgent.toggleAgent();
        return tx.wait();
    }
} 