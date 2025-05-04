export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
  toolResults?: Array<{
    success: boolean;
    result: any;
    error?: string;
  }>;
}

export interface AIProvider {
  // chat(messages: Array<{ role: string; content: string }>): Promise<string>;
  // stream(messages: Array<{ role: string; content: string }>, onToken: (token: string) => void): Promise<void>;
  // complete(prompt: string): Promise<string>;
  // streamComplete(prompt: string, onToken: (token: string) => void): Promise<void>;
  generateText: (prompt: string, systemPrompt: string) => Promise<AIResponse>;
  generateEmbeddings?: (text: string) => Promise<number[]>;
  generateImage?: (
    prompt: string,
    options?: {
      width?: number;
      height?: number;
      steps?: number;
      style_preset?: string;
    }
  ) => Promise<{ images: string[] }>;
  processPrompt: (systemPrompt: string, userPrompt: string) => Promise<string>;
}

export interface AIConfig {
  provider: "openai" | "atoma" | "venice" | "groq";
  apiKey: string;
  enablePrivateCompute?: boolean;
  modelName?: string;
}

export interface ToolResult {
  success: boolean;
  result: any;
  error?: string;
}

export interface ToolExecutionOptions {
  toolCallId?: string;
  messages?: any[];
  severity?: "info" | "warning" | "error";
}

export interface Tool {
  execute: (
    args: Record<string, any>,
    options?: ToolExecutionOptions
  ) => Promise<ToolResult>;
  parameters: any;
  description: string;
}
