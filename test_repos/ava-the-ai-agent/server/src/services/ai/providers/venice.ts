import OpenAI from "openai";
import type { AIProvider, AIResponse } from "../types";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class VeniceProvider implements AIProvider {
  private client: OpenAI;
  private defaultModel: string = "dolphin-2.9.2-qwen2-72b";

  constructor(apiKey: string, modelName?: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.venice.ai/api/v1",
    });

    if (modelName) {
      this.defaultModel = modelName;
    }
  }

  async processPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.generateText(userPrompt, systemPrompt);
    return response.text;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        { role: "user" as const, content: prompt }
      ];

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages,
        // @ts-expect-error Venice.ai parameters are unique to Venice
        venice_parameters: {
          include_venice_system_prompt: false, // We'll use our own system prompts
        },
      });

      return {
        text: response.choices[0].message.content || "",
        toolCalls: [], // Venice doesn't support tool calls in the same way yet
      };
    } catch (error) {
      console.error("Venice AI error:", error);
      throw error;
    }
  }

  // Optional: Implement image generation if needed
  async generateImage(prompt: string, options?: {
    width?: number;
    height?: number;
    steps?: number;
    style_preset?: string;
  }): Promise<{ images: string[] }> {
    try {
      const response = await fetch(`${this.client.baseURL}/image/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.client.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "sdxl-1.0", // Default image model
          prompt,
          width: options?.width || 1024,
          height: options?.height || 1024,
          steps: options?.steps || 30,
          style_preset: options?.style_preset,
        }),
      });

      if (!response.ok) {
        throw new Error(`Venice API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Venice AI image generation error:", error);
      throw error;
    }
  }
} 