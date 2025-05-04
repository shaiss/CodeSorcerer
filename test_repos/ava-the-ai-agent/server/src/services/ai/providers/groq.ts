import { generateText as aiGenerateText } from "ai";
import { groq } from "@ai-sdk/groq";
import type { AIProvider, AIResponse } from "../types";

// Define proper types for tool calls and results
interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface ToolResult {
  success: boolean;
  result: any;
  error?: string;
}

export class GroqProvider implements AIProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gpt-4o") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  private truncateResults(results: any[]): any[] {
    return results.map((result) => {
      if (typeof result === "string" && result.length > 1000) {
        return result.substring(0, 1000) + "...";
      }
      if (
        result.result &&
        typeof result.result === "string" &&
        result.result.length > 1000
      ) {
        return {
          ...result,
          result: result.result.substring(0, 1000) + "...",
        };
      }
      return result;
    });
  }

  async processPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.generateText(userPrompt, systemPrompt);
    return response.text;
  }

  async generateText(
    prompt: string,
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      const model = groq(this.modelName);

      // Truncate any large results in the prompt
      const truncatedPrompt =
        prompt.length > 4000 ? prompt.substring(0, 4000) + "..." : prompt;

      const response = await aiGenerateText({
        model: model as any,
        system: systemPrompt,
        prompt: truncatedPrompt,
        maxSteps: 100,
        maxRetries: 10,
        experimental_continueSteps: true,
      });

      // Transform tool calls to match our interface
      const transformedToolCalls = (response.toolCalls || []).map((call) => ({
        name: call.toolName,
        args: call.args,
      }));

      return {
        text: response.text,
        toolCalls: transformedToolCalls,
        toolResults: this.truncateResults(response.toolResults || []),
      };
    } catch (error) {
      console.error("OpenAI error:", error);
      throw error;
    }
  }
}