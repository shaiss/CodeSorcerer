import { spawn, ChildProcess } from 'child_process';

/**
 * Simple implementation of AsyncExitStack similar to Python's contextlib.AsyncExitStack
 */
class AsyncExitStack {
  private callbacks: Array<() => Promise<void>> = [];

  async enter_async_context(context: { 
    __aenter__: () => Promise<any>, 
    __aexit__: () => Promise<void> 
  }): Promise<any> {
    const resource = await context.__aenter__();
    this.callbacks.push(() => context.__aexit__());
    return resource;
  }

  async aclose(): Promise<void> {
    const errors: Error[] = [];
    
    // Call callbacks in reverse order (LIFO)
    for (let i = this.callbacks.length - 1; i >= 0; i--) {
      try {
        await this.callbacks[i]();
      } catch (err) {
        errors.push(err as Error);
      }
    }
    
    this.callbacks = [];
    
    if (errors.length > 0) {
      throw new Error(`Errors during AsyncExitStack.aclose(): ${errors.map(e => e.message).join(', ')}`);
    }
  }
}

/**
 * Model Context Protocol (MCP) Service
 * Manages MCP servers for agent tools
 */
export class MCPService {
  private servers: Map<string, MCPServer> = new Map();
  private exitStack: AsyncExitStack;

  constructor() {
    this.exitStack = new AsyncExitStack();
  }

  /**
   * Register an MCP server
   * @param name Unique name for the server
   * @param config Configuration for the server
   * @returns The registered server
   */
  registerServer(name: string, config: MCPServerConfig): MCPServer {
    const server = new MCPServer(name, config);
    this.servers.set(name, server);
    return server;
  }

  /**
   * Get a registered MCP server by name
   * @param name The server name
   * @returns The server or undefined if not found
   */
  getServer(name: string): MCPServer | undefined {
    return this.servers.get(name);
  }

  /**
   * Start all registered MCP servers
   */
  async startAll(): Promise<void> {
    for (const server of this.servers.values()) {
      await this.exitStack.enter_async_context({
        __aenter__: async () => {
          await server.start();
          return server;
        },
        __aexit__: async () => {
          await server.stop();
        }
      });
    }
  }

  /**
   * Stop all running MCP servers
   */
  async stopAll(): Promise<void> {
    await this.exitStack.aclose();
  }
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class MCPServer {
  private name: string;
  private config: MCPServerConfig;
  private process: ChildProcess | null = null;
  private isRunning = false;

  constructor(name: string, config: MCPServerConfig) {
    this.name = name;
    this.config = config;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[MCPServer] ${this.name} is already running`);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const env = { ...process.env, ...this.config.env };
        
        this.process = spawn(this.config.command, this.config.args, {
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        this.process.stdout?.on('data', (data) => {
          console.log(`[MCPServer:${this.name}] ${data.toString().trim()}`);
        });

        this.process.stderr?.on('data', (data) => {
          console.error(`[MCPServer:${this.name}] Error: ${data.toString().trim()}`);
        });

        this.process.on('error', (err) => {
          console.error(`[MCPServer:${this.name}] Failed to start: ${err.message}`);
          this.isRunning = false;
          reject(err);
        });

        this.process.on('exit', (code, signal) => {
          console.log(`[MCPServer:${this.name}] Exited with code ${code} and signal ${signal}`);
          this.isRunning = false;
        });

        // Wait a moment to ensure the server starts properly
        setTimeout(() => {
          this.isRunning = true;
          console.log(`[MCPServer:${this.name}] Started successfully`);
          resolve();
        }, 1000);
      } catch (error) {
        console.error(`[MCPServer:${this.name}] Error starting server:`, error);
        reject(error);
      }
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      console.log(`[MCPServer] ${this.name} is not running`);
      return;
    }

    return new Promise((resolve) => {
      // First try to gracefully terminate
      this.process?.kill('SIGTERM');

      // Set a timeout to force kill if it doesn't exit gracefully
      setTimeout(() => {
        if (this.process?.killed === false) {
          console.log(`[MCPServer:${this.name}] Force killing process`);
          this.process?.kill('SIGKILL');
        }
        this.isRunning = false;
        this.process = null;
        resolve();
      }, 5000);
    });
  }

  /**
   * Check if the server is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get the server name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the server configuration
   */
  getConfig(): MCPServerConfig {
    return this.config;
  }
} 