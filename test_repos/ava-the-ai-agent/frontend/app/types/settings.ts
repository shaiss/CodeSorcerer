export interface AIProviderSettings {
  provider: 'openai' | 'atoma' | 'venice';
  apiKey: string;
  modelName?: string | undefined;
}

export interface AgentSettings {
  aiProvider: AIProviderSettings;
  walletKey: string;
  enablePrivateCompute: boolean;
  additionalSettings: {
    brianApiKey?: string;
    coingeckoApiKey?: string;
    zerionApiKey?: string;
    perplexityApiKey?: string;
  };
} 