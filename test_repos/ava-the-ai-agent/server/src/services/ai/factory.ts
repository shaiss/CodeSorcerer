import type { AIConfig, AIProvider } from "./types";
import { AtomaProvider } from "./providers/atoma";
import { OpenAIProvider } from "./providers/openai";
import { GroqProvider } from "./providers/groq";
import { VeniceProvider } from "./providers/venice";

export class AIFactory {
  static createProvider(config: AIConfig): AIProvider {
    switch (config.provider) {
      case "atoma":
        return new AtomaProvider(config.apiKey, config.enablePrivateCompute);
      case "openai":
        return new OpenAIProvider(config.apiKey, config.modelName);
      case "groq":
        return new GroqProvider(config.apiKey, config.modelName);
      case "venice":
        return new VeniceProvider(config.apiKey, config.modelName);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}
