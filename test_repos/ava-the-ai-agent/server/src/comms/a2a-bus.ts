import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { AgentCard, Message, TaskRequest, TaskResponse, TaskState } from '../types/a2a';

/**
 * A2ABus is an implementation of Google's Agent-to-Agent (A2A) protocol
 * It enables standardized communication between agents regardless of their 
 * underlying framework or implementation.
 */
export class A2ABus {
  private agentCards: Map<string, AgentCard>;
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.agentCards = new Map();
    this.baseUrl = baseUrl;
  }

  /**
   * Register an agent with the A2A bus
   * @param agentName - The name of the agent
   * @param agentCard - The agent's capability card
   */
  registerAgent(agentName: string, agentCard: AgentCard): void {
    this.agentCards.set(agentName, agentCard);
    console.log(`[A2ABus] Registered agent: ${agentName}`);
  }

  /**
   * Get an agent's capability card
   * @param agentName - The name of the agent
   * @returns The agent's capability card or undefined if not found
   */
  getAgentCard(agentName: string): AgentCard | undefined {
    return this.agentCards.get(agentName);
  }

  /**
   * Get all registered agents
   * @returns All agent cards
   */
  getAllAgentCards(): Map<string, AgentCard> {
    return this.agentCards;
  }

  /**
   * Send a task to an agent
   * @param agentName - The name of the target agent
   * @param message - The message to send
   * @returns The response from the agent
   */
  async sendTask(agentName: string, message: Message): Promise<TaskResponse> {
    const agentCard = this.agentCards.get(agentName);
    if (!agentCard) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const taskId = uuidv4();
    const taskRequest: TaskRequest = {
      id: taskId,
      message
    };

    try {
      const agentUrl = agentCard.url;
      const response = await axios.post(`${agentUrl}/tasks/send`, taskRequest);
      return response.data;
    } catch (error) {
      console.error(`[A2ABus] Error sending task to ${agentName}:`, error);
      return {
        id: taskId,
        status: { state: TaskState.FAILED, reason: 'Failed to send task' },
        messages: [message]
      };
    }
  }

  /**
   * Check the status of a task
   * @param agentName - The name of the agent handling the task
   * @param taskId - The ID of the task
   * @returns The current status of the task
   */
  async checkTaskStatus(agentName: string, taskId: string): Promise<TaskResponse> {
    const agentCard = this.agentCards.get(agentName);
    if (!agentCard) {
      throw new Error(`Agent ${agentName} not found`);
    }

    try {
      const agentUrl = agentCard.url;
      const response = await axios.get(`${agentUrl}/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`[A2ABus] Error checking task status from ${agentName}:`, error);
      throw new Error(`Failed to check task status: ${error}`);
    }
  }

  /**
   * Cancel a task
   * @param agentName - The name of the agent handling the task
   * @param taskId - The ID of the task to cancel
   * @returns The response from the cancelation request
   */
  async cancelTask(agentName: string, taskId: string): Promise<TaskResponse> {
    const agentCard = this.agentCards.get(agentName);
    if (!agentCard) {
      throw new Error(`Agent ${agentName} not found`);
    }

    try {
      const agentUrl = agentCard.url;
      const response = await axios.post(`${agentUrl}/tasks/${taskId}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`[A2ABus] Error canceling task from ${agentName}:`, error);
      throw new Error(`Failed to cancel task: ${error}`);
    }
  }
} 