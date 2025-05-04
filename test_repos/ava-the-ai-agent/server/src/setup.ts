import { privateKeyToAccount } from "viem/accounts";
import { registerAgents } from "./agents";
import { EventBus } from "./comms";
import { AIFactory } from "./services/ai/factory";
import env from "./env";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
console.log(account, "account in setup.ts");
// initialize the event bus
const eventBus = new EventBus();

const defaultProvider = AIFactory.createProvider({
  provider: 'openai',
  apiKey: env.OPENAI_API_KEY!
});

// register the agents
const { executorAgent, observerAgent, taskManagerAgent } = registerAgents(
  eventBus,
  account,
  defaultProvider
);
export { eventBus, executorAgent, observerAgent, taskManagerAgent, account };

