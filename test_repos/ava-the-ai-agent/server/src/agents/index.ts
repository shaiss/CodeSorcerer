import type { Account } from "viem";
import { EventBus } from "../comms";
import { ExecutorAgent } from "./executor";
import { ObserverAgent } from "./observer";
import { TaskManagerAgent } from "./task-manager";
import { CdpAgent } from "./cdp-agent";
import { HederaAgent } from "./hedera-agent";
import { ZircuitAgent } from "./zircuit-agent";
import { SonicAgent } from "./sonic-agent";
import { AIProvider } from "../services/ai/types";
import { HybridStorage } from "./plugins/hybrid-storage";
import { ATCPIPProvider } from "./plugins/atcp-ip";
import { RecallStorage } from "./plugins/recall-storage";
import { StorageInterface } from "./types/storage";
import { SonicMarketProvider } from "./plugins/sonic-market";
import { MarginZeroProvider } from "./plugins/margin-zero";
import { CHAIN_IDS } from "@clober/v2-sdk";
/**
 * Registers the agents and returns them
 * @returns The registered agents
 */
export const registerAgents = (
  eventBus: EventBus,
  account: Account,
  aiProvider: AIProvider,
  storage: StorageInterface,
  atcpipProvider: ATCPIPProvider
) => {
  console.log("======== Registering agents =========");

  // Initialize agents with account
  const executorAgent = new ExecutorAgent(
    'executor',
    eventBus,
    account,
    storage,
    atcpipProvider
  );
  console.log(`[registerAgents] executor agent initialized.`);

  console.log(`[registerAgents] initializing observer agent...`);

  const observerAgent = new ObserverAgent(
    'observer',
    eventBus,
    account,
    aiProvider,
    storage,
    atcpipProvider
  );
  console.log(`[registerAgents] observer agent initialized with address: ${account.address}`);

  const taskManagerAgent = new TaskManagerAgent(
    'task-manager',
    eventBus,
    account,
    storage,
    atcpipProvider
  );
  console.log(`[registerAgents] task manager agent initialized.`);

  // Initialize CDP agent
  const cdpagent = new CdpAgent("cdp-agent", eventBus, storage, atcpipProvider);
  console.log(`[registerAgents] cdp agent initialized.`);


  // Initialize Zircuit agent
  const zircuitAgent = new ZircuitAgent(
    'zircuit-agent',
    eventBus,
    account,
    aiProvider
  );
  console.log(`[registerAgents] zircuit agent initialized.`);

  // Initialize Hedera agent
  const hederaConfig = {
    accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.123456',
    privateKey: process.env.HEDERA_PRIVATE_KEY || 'your-private-key',
    network: (process.env.HEDERA_NETWORK || 'testnet') as 'mainnet' | 'testnet' | 'previewnet'
  };

  console.log(`[registerAgents] Initializing Hedera agent with account ID: ${hederaConfig.accountId} on network: ${hederaConfig.network}`);
  console.log(`[registerAgents] Private key available: ${!!hederaConfig.privateKey}`);

  const hederaAgent = new HederaAgent(
    'hedera-agent',
    eventBus,
    hederaConfig,
    aiProvider
  );
  console.log(`[registerAgents] hedera agent initialized.`);



  // Initialize Sonic Market agent
  const sonicConfig = {
    chainId: (process.env.SONIC_CHAIN_ID || '146') as unknown as CHAIN_IDS,
    rpcUrl: process.env.SONIC_RPC_URL || 'https://sonic-rpc.publicnode.com',
  };

  console.log(`[registerAgents] Initializing Sonic Market agent`);
  console.log(`[registerAgents] Sonic config: chainId=${sonicConfig.chainId}, rpcUrl available: ${!!sonicConfig.rpcUrl}`);

  // Initialize MarginZero config
  const marginZeroConfig = {
    chainId: sonicConfig.chainId,
    rpcUrl: sonicConfig.rpcUrl,
    account: account,
    positionManagerAddress: (process.env.MARGIN_ZERO_POSITION_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    optionMarketAddress: (process.env.MARGIN_ZERO_OPTION_MARKET_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`
  };

  console.log(`[registerAgents] MarginZero config: positionManagerAddress=${marginZeroConfig.positionManagerAddress}, optionMarketAddress=${marginZeroConfig.optionMarketAddress}`);

  // Declare sonicAgent outside the try block so it's accessible in the scope
  let sonicAgent: SonicAgent | null = null;
  let marginZeroProvider: MarginZeroProvider | null = null;

  try {
    // Create the Sonic Market provider
    const sonicProvider = new SonicMarketProvider({
      ...sonicConfig,
      account: account
    });

    // Create the MarginZero provider if addresses are valid
    if (
      marginZeroConfig.positionManagerAddress !== '0x0000000000000000000000000000000000000000' &&
      marginZeroConfig.optionMarketAddress !== '0x0000000000000000000000000000000000000000'
    ) {
      marginZeroProvider = new MarginZeroProvider(marginZeroConfig);
      console.log(`[registerAgents] MarginZero provider initialized.`);
    } else {
      console.log(`[registerAgents] MarginZero provider not initialized due to missing contract addresses.`);
    }

    sonicAgent = new SonicAgent(
      'sonic-agent',
      eventBus,
      storage,
      sonicProvider,
      marginZeroProvider || undefined,
      aiProvider
    );
    console.log(`[registerAgents] Sonic Market agent initialized.`);
  } catch (error) {
    console.error(`[registerAgents] Failed to initialize Sonic Market agent:`, error);
  }

  // Register event handlers
  registerEventHandlers(eventBus, {
    executorAgent,
    observerAgent,
    taskManagerAgent,
    cdpagent,
    zircuitAgent,
    hederaAgent,
    ...(sonicAgent ? { sonicAgent } : {})
  });

  console.log("all events registered");

  return {
    executorAgent,
    observerAgent,
    taskManagerAgent,
    cdpagent,
    zircuitAgent,
    hederaAgent,
    ...(sonicAgent ? { sonicAgent } : {})
  };
};

function registerEventHandlers(eventBus: EventBus, agents: any) {
  // Observer <-> Task Manager
  eventBus.register(`observer-task-manager`, (data) =>
    agents.taskManagerAgent.handleEvent(`observer-task-manager`, data)
  );

  // Task Manager <-> CDP
  eventBus.register(`task-manager-cdp`, (data) =>
    agents.cdpAgent.handleEvent(`task-manager-cdp`, data)
  );
  eventBus.register(`cdp-task-manager`, (data) =>
    agents.taskManagerAgent.handleEvent(`cdp-task-manager`, data)
  );

  // Task Manager <-> Observer
  eventBus.register(`task-manager-observer`, (data) =>
    agents.observerAgent.handleEvent(`task-manager-observer`, data)
  );

  // Task Manager <-> Executor
  eventBus.register(`task-manager-executor`, (data) =>
    agents.executorAgent.handleEvent(`task-manager-executor`, data)
  );
  eventBus.register(`executor-task-manager`, (data) =>
    agents.taskManagerAgent.handleEvent(`executor-task-manager`, data)
  );

  // Task Manager <-> CDP
  eventBus.register(`task-manager-cdp`, (data) =>
    agents.cdpAgent.handleEvent(`task-manager-cdp`, data)
  );
  eventBus.register(`cdp-task-manager`, (data) =>
    agents.taskManagerAgent.handleEvent(`cdp-task-manager`, data)
  );

  // Task Manager <-> Zircuit
  eventBus.register(`task-manager-zircuit-agent`, (data) =>
    agents.zircuitAgent.handleEvent(`task-manager-zircuit-agent`, data)
  );
  eventBus.register(`zircuit-agent-task-manager`, (data) =>
    agents.taskManagerAgent.handleEvent(`zircuit-agent-task-manager`, data)
  );

  // Task Manager <-> Hedera
  eventBus.register(`task-manager-hedera-agent`, (data) =>
    agents.hederaAgent.handleEvent(`task-manager-hedera-agent`, data)
  );
  eventBus.register(`hedera-agent-task-manager`, (data) =>
    agents.taskManagerAgent.handleEvent(`hedera-agent-task-manager`, data)
  );


  // Task Manager <-> Sonic Market
  if (agents.sonicAgent) {
    eventBus.register(`task-manager-sonic-agent`, (data) =>
      agents.sonicAgent.handleEvent(`task-manager-sonic-agent`, data)
    );
    eventBus.register(`sonic-agent-task-manager`, (data) =>
      agents.taskManagerAgent.handleEvent(`sonic-agent-task-manager`, data)
    );
  }
}