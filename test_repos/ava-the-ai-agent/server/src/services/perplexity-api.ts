import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import env from "../env";

export class PerplexityApiService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.PERPLEXITY_API_KEY,
      baseURL: "https://api.perplexity.ai",
    });
  }

  async getInformation(prompt: string): Promise<string> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are an artificial intelligence assistant that provides detailed, accurate, and up-to-date information. Focus on delivering factual and well-researched responses.",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await this.client.chat.completions.create({
        model: "llama-3.1-sonar-large-128k-online",
        messages,
      });

      return response.choices[0].message.content || "No information found";
    } catch (error: any) {
      console.error("Perplexity API error:", error);
      throw new Error(`Failed to get information: ${error.message}`);
    }
  }

  async searchWeb(query: string, maxResults: number = 5): Promise<string> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are a web search assistant. Search the internet and provide relevant, up-to-date information with sources.",
        },
        {
          role: "user",
          content: `Search the web for: ${query}\nProvide up to ${maxResults} relevant results with brief summaries.`,
        },
      ];

      const response = await this.client.chat.completions.create({
        model: "llama-3.1-sonar-large-128k-online",
        messages,
      });

      return response.choices[0].message.content || "No search results found";
    } catch (error: any) {
      console.error("Perplexity search error:", error);
      throw new Error(`Failed to search web: ${error.message}`);
    }
  }
} 