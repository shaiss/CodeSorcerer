import { Router, RequestHandler } from 'express';
import { A2AMiddleware } from '../middleware';

/**
 * Creates A2A protocol routes for an agent
 * @param agentName The name of the agent
 * @param middleware The A2A middleware for the agent
 * @returns Express router with A2A protocol routes
 */
export function createA2ARoutes(agentName: string, middleware: A2AMiddleware): Router {
  const router = Router();

  // Agent Card endpoint - serves metadata about the agent
  router.get('/.well-known/agent.json', middleware.getAgentCard() as RequestHandler);

  // Task endpoints
  router.post('/tasks/send', middleware.processTask(agentName) as RequestHandler);
  router.get('/tasks/:taskId', middleware.getTaskStatus() as RequestHandler);
  router.post('/tasks/:taskId/cancel', middleware.cancelTask() as RequestHandler);

  return router;
} 