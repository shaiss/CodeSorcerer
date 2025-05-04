"use client";
import { ValidationResult, PortfolioAnalysis } from '../contracts/abis';
import { createThirdwebClient, ThirdwebClient } from 'thirdweb';

export interface AIClient extends ThirdwebClient {
    analyzePortfolioValidations(validations: ValidationResult[]): Promise<PortfolioAnalysis>;
}

export const client = createThirdwebClient({
    clientId: process.env["NEXT_PUBLIC_THIRDWEB_CLIENT_ID"] as string,
}) as AIClient;

// Implement the analyze method
client.analyzePortfolioValidations = async (validations: ValidationResult[]): Promise<PortfolioAnalysis> => {
    // AI analysis implementation
    const analysis = await fetch('/api/analyze-portfolio', {
        method: 'POST',
        body: JSON.stringify({ validations })
    }).then(res => res.json());

    return analysis;
};