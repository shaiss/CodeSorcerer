import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();
// Define the environment variables schema with A2A and MCP related fields
const schema = z.object({
  // Server configuration
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HTTP_PORT: z.string().default("3020"),
  WS_PORT: z.string().default("8020"),
  API_BASE_URL: z.string().default("http://localhost:3020"),

  PORT: z.coerce.number().default(3001),
  GROQ_API_KEY: z.string(),
  NETWORK_ID: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_KEY: z.string(),
  PRIVATE_KEY: z.string(),
  WALLET_ADDRESS: z.string(),
  WALLET_PRIVATE_KEY: z.string(),
  ZERION_API_KEY: z.string(),
  BRIAN_API_KEY: z.string(),
  PORTALS_API_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
  BRIAN_API_URL: z.string().default("https://api.brianknows.org"),
  CHAIN_ID: z.string().default("8453"),
  CHAIN_NAME: z.string().default("base"),
  MODEL_NAME: z.string().default("gpt-4o"),
  CDP_API_KEY_NAME: z.string(),
  CDP_API_KEY_PRIVATE_KEY: z.string(),
  MNEMONIC_PHRASE: z.string(),
  GOLDRUSH_API: z.string(),
  PERPLEXITY_API_KEY: z.string(),
  ENABLE_PRIVATE_COMPUTE: z.boolean().default(false),
  DEFAULT_AI_PROVIDER: z.enum(['openai', 'atoma', 'venice', 'groq']).default('openai'),
  COOKIE_API_KEY: z.string(),
  ATOMA_API_KEY: z.string().optional(),
  STORY_PROTOCOL_ENDPOINT: z.string().default("https://api.storyprotocol.xyz/v1"),
  STORY_PROTOCOL_API_KEY: z.string(),
  STORY_RPC_PROVIDER_URL: z.string().default("https://aeneid.storyrpc.io"),
  STORY_NFT_CONTRACT: z.string().default("0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E"),
  STORY_PRIVATE_KEY: z.string(),
  RPC_PROVIDER_URL: z.string().default("https://base.llamarpc.com"),
  APTOS_PRIVATE_KEY: z.string(),
  PANORA_API_KEY: z.string(),
  APTOS_NETWORK: z.string(),
  
  // Wallet configuration

  ANTHROPIC_API_KEY: z.string().optional(),
  
  // MCP servers
  BRAVE_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_TEAM_ID: z.string().optional(),
  
  // DeFi protocols
  HEDERA_ACCOUNT_ID: z.string().optional(),
  HEDERA_PRIVATE_KEY: z.string().optional(),
  HEDERA_NETWORK: z.enum(["mainnet", "testnet", "previewnet"]).optional(),
  
  // A2A configuration
  A2A_PROTOCOL_VERSION: z.string().default("1.0"),
  
  // Storage
  STORAGE_TYPE: z.enum(["hybrid", "memory", "eth"]).default("hybrid"),
  ETHSTORAGE_RPC: z.string().optional(),
});

// Parse and validate environment variables
const result = schema.parse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables:");
  console.error(result.error.format());
  throw new Error("Invalid environment variables");
}

export const env = result.data;

export type Environment = {
  Bindings: z.infer<typeof schema>;
};

export default env;
