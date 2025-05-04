/**
 * A2A Protocol Types for Ava Portfolio Manager
 * Based on Google's Agent-to-Agent (A2A) Protocol
 */

// Agent Card provides metadata about the agent and its capabilities
export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
}

// Task States in the A2A Protocol
export enum TaskState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

// Message Roles
export enum MessageRole {
  USER = "user",
  AGENT = "agent",
  SYSTEM = "system"
}

// Message Part Formats
export interface MessagePart {
  text?: string;
  html?: string;
  form?: any;
  file?: {
    name: string;
    type: string;
    content: string;
  };
}

// A message in the A2A protocol
export interface Message {
  role: MessageRole;
  parts: MessagePart[];
}

// Status for task tracking
export interface TaskStatus {
  state: TaskState;
  reason?: string;
}

// Request structure for sending tasks
export interface TaskRequest {
  id: string;
  message: Message;
}

// Response structure for tasks
export interface TaskResponse {
  id: string;
  status: TaskStatus;
  messages: Message[];
  artifacts?: any[];
}

// Base Task structure
export interface Task {
  id: string;
  status: TaskStatus;
  messages: Message[];
}

// Used when updating task status
export interface TaskUpdate {
  id: string;
  status: TaskStatus;
} 