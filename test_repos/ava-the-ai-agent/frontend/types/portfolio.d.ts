export enum ValidationStrategy {
    TokenEligibility,
    PortfolioBalance,
    RiskAssessment
}

export type ValidationResult = {
    operator: string;
    assessment: string;
    confidence: number;
};

export type PortfolioAnalysis = {
    consensus: number;
    recommendations: string[];
    risk_score: number;
    validations: ValidationResult[];
};

export type Portfolio = {
    tokens: string[];
    amounts: bigint[];
    strategy: string;
    validationType: ValidationStrategy;
    currentPortfolio?: boolean;
};

export type CurrentPortfolio = Portfolio & {
    currentPortfolio: true;
}; 