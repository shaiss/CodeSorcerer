import { ethers } from 'ethers';
import { PortfolioValidationServiceManager } from '@/contracts/abis';
import type { ValidationResult, PortfolioAnalysis, ValidationStrategy } from '@/types/portfolio';
import { x, client } from '@/lib/client';

export class PortfolioValidatorAgent {
    private contract: ethers.Contract;

    constructor(
        private contractAddress: string,
        private provider: ethers.Provider
    ) {
        if (!contractAddress) {
            throw new Error('Contract address is required');
        }
        this.contract = new ethers.Contract(
            contractAddress,
            PortfolioValidationServiceManager,
            provider
        );
    }

    async validatePortfolio(
        tokens: string[],
        amounts: bigint[],
        strategy: string,
        validationType: ValidationStrategy
    ) {
        // Create validation task
        const tx = await this.contract['createPortfolioTask'](
            tokens,
            amounts,
            strategy,
            validationType
        );
        const receipt = await tx.wait();

        const taskId = receipt.events?.[0]?.args?.taskId;
        if (!taskId) {
            throw new Error('Failed to get task ID from event');
        }

        // Wait for operator validations
        const validations = await this.waitForValidations(taskId);

        // Get token data
        const tokenData = await Promise.all(
            tokens.map(token => this.getTokenData(token))
        );

        // Analyze validations with AI
        const analysis = await this.analyzeValidations(validations, tokenData);

        return {
            taskId,
            validations,
            tokenData,
            analysis,
            consensus: this.calculateConsensus(validations),
            recommendations: analysis.recommendations
        };
    }

    private async getTokenData(tokenAddress: string) {
        return await this.contract['tokenRegistry'](tokenAddress);
    }

    private async waitForValidations(taskId: number): Promise<ValidationResult[]> {
        return await this.contract['getTaskValidations'](taskId);
    }

    private async analyzeValidations(validations: ValidationResult[], tokenData: any[]): Promise<PortfolioAnalysis> {
        if (!client.analyzePortfolioValidations) {
            throw new Error('AI client not properly initialized');
        }

        // Use AI to analyze operator validations
        const analysis = await client.analyzePortfolioValidations(validations, tokenData);
        return analysis;
    }

    private calculateConsensus(validations: ValidationResult[]): number {
        if (!validations.length) return 0;

        // Calculate weighted average of operator confidence scores
        const totalConfidence = validations.reduce((sum, v) => sum + v.confidence, 0);
        return totalConfidence / validations.length;
    }
} 