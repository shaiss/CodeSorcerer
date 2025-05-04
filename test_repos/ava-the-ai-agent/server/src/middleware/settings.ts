import { MiddlewareHandler } from "hono";
import type { Environment } from "../env";
import { AIFactory } from "../services/ai/factory";
import { observerAgent } from "../setup";

interface Variables {
  agentSettings: any;
}

export const settingsMiddleware: MiddlewareHandler<Environment, Variables> = async (c, next) => {
  // Get settings from request if available
  const settings = c.req.header('X-Agent-Settings');
  
  if (settings) {
    try {
      const parsedSettings = JSON.parse(settings);
      
      // Create new AI provider with user settings
      const aiProvider = AIFactory.createProvider({
        provider: parsedSettings.aiProvider.provider,
        apiKey: parsedSettings.aiProvider.apiKey,
        enablePrivateCompute: parsedSettings.enablePrivateCompute,
        modelName: parsedSettings.aiProvider.modelName
      });

      // Update observer agent with new provider
      observerAgent.updateAIProvider(aiProvider);
      
      c.set('agentSettings', parsedSettings);
    } catch (error) {
      console.error('Failed to apply agent settings:', error);
    }
  }

  await next();
}; 