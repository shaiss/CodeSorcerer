import type { EventBus } from "../comms";
import type { AIProvider } from "../services/ai/types";
import { AgentCard, Message, MessageRole, TaskRequest, TaskResponse, TaskState } from "../types/a2a";

export abstract class Agent {
  name: string;
  protected eventBus: EventBus;
  protected aiProvider?: AIProvider;
  protected agentCard?: AgentCard;

  constructor(name: string, eventBus: EventBus, aiProvider?: AIProvider) {
    this.name = name;
    this.eventBus = eventBus;
    this.aiProvider = aiProvider;
  }

  abstract handleEvent(event: string, data: any): void;

  abstract onStepFinish({ text, toolCalls, toolResults }: any): Promise<void>;

  /**
   * Set the agent's A2A capability card
   * @param card The agent capability card
   */
  setAgentCard(card: AgentCard): void {
    this.agentCard = card;
  }
  
  /**
   * Get the agent's A2A capability card
   * @returns The agent capability card if set
   */
  getAgentCard(): AgentCard | undefined {
    return this.agentCard;
  }

  /**
   * Process a task request according to A2A protocol
   * @param request The task request to process
   * @returns The task response
   */
  async processA2ATask(request: TaskRequest): Promise<TaskResponse> {
    if (!request || !request.message || !request.id) {
      return {
        id: request.id || 'invalid',
        status: { state: TaskState.FAILED, reason: 'Invalid request format' },
        messages: request.message ? [request.message] : []
      };
    }

    try {
      // Create a system message to inform about task processing
      const systemMessage: Message = {
        role: MessageRole.SYSTEM,
        parts: [{ text: `Processing task ${request.id} by agent ${this.name}` }]
      };

      // Default failure response in case something goes wrong
      let response: TaskResponse = {
        id: request.id,
        status: { state: TaskState.FAILED, reason: 'Task processing failed' },
        messages: [request.message, systemMessage]
      };

      // Process the task (to be implemented by derived classes)
      response = await this.handleA2ATask(request);

      return response;
    } catch (error) {
      console.error(`[${this.name}] Error processing A2A task:`, error);
      return {
        id: request.id,
        status: { 
          state: TaskState.FAILED, 
          reason: error instanceof Error ? error.message : 'Unknown error'
        },
        messages: [request.message]
      };
    }
  }

  /**
   * Process the A2A task (must be implemented by derived classes)
   * @param request The task request to process 
   * @returns The task response
   */
  protected async handleA2ATask(request: TaskRequest): Promise<TaskResponse> {
    // Default implementation for agents that don't override this method
    return {
      id: request.id,
      status: { 
        state: TaskState.FAILED, 
        reason: `Agent ${this.name} does not implement A2A task handling`
      },
      messages: [request.message]
    };
  }
}
