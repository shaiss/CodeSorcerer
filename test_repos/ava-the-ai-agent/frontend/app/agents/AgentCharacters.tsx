'use client'

import { useEffect, useState } from 'react';
import { AgentCharacter } from './AgentCharacter';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  message?: string;
  agent?: any; // The actual agent instance
}

interface AgentCharactersProps {
  agents: Record<string, any> | null;
}

export function AgentCharacters({ agents }: AgentCharactersProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isMoving, setIsMoving] = useState<Record<string, boolean>>({});

  // Initialize random positions for agents
  useEffect(() => {
    if (!agents) return;

    const newPositions: Record<string, { x: number; y: number }> = {};
    const containerWidth = window.innerWidth * 0.8;
    const containerHeight = window.innerHeight * 0.6;
    const padding = 100;

    Object.keys(agents).forEach(agentKey => {
      if (!positions[agentKey]) {
        newPositions[agentKey] = {
          x: padding + Math.random() * (containerWidth - padding * 2),
          y: padding + Math.random() * (containerHeight - padding * 2)
        };
      }
    });

    setPositions(prev => ({ ...prev, ...newPositions }));
  }, [agents]);

  // Periodically move agents randomly
  useEffect(() => {
    if (!agents) return;

    const moveInterval = setInterval(() => {
      const agentKeys = Object.keys(agents);
      if (agentKeys.length === 0) return;

      const agentToMove = agentKeys[Math.floor(Math.random() * agentKeys.length)];
      setIsMoving(prev => ({ ...prev, [agentToMove]: true }));

      const currentPos = positions[agentToMove];
      if (!currentPos) return;

      const containerWidth = window.innerWidth * 0.8;
      const containerHeight = window.innerHeight * 0.6;
      const padding = 100;

      const newX = Math.max(padding, Math.min(containerWidth - padding,
        currentPos.x + (Math.random() - 0.5) * 100));
      const newY = Math.max(padding, Math.min(containerHeight - padding,
        currentPos.y + (Math.random() - 0.5) * 100));

      setPositions(prev => ({
        ...prev,
        [agentToMove]: { x: newX, y: newY }
      }));

      // Stop moving after animation
      setTimeout(() => {
        setIsMoving(prev => ({ ...prev, [agentToMove]: false }));
      }, 1000);
    }, 3000);

    return () => clearInterval(moveInterval);
  }, [agents, positions]);

  // Get sprite based on agent type
  const getSprite = (agentKey: string) => {
    switch (agentKey) {
      case 'tradingAgent':
        return '/agent_trader.png';
      case 'liquidityAgent':
        return '/agent_analyst.png';
      case 'portfolioAgent':
        return '/agent_researcher.png';
      case 'defiLlamaAgent':
        return '/agent_default.png';
      default:
        return '/agent_default.png';
    }
  };

  // Get agent display name
  const getAgentName = (agentKey: string) => {
    switch (agentKey) {
      case 'tradingAgent':
        return 'Trading Agent';
      case 'liquidityAgent':
        return 'Liquidity Agent';
      case 'portfolioAgent':
        return 'Portfolio Agent';
      case 'defiLlamaAgent':
        return 'DeFi Analytics';
      default:
        return agentKey;
    }
  };

  // Get movement direction based on position change
  const getDirection = (agentId: string) => {
    const currentPos = positions[agentId];
    if (!currentPos) return 'down';

    // Get previous position from 5 frames ago to determine overall direction
    const prevPos = positions[agentId];
    if (!prevPos) return 'down';

    const dx = currentPos.x - prevPos.x;
    const dy = currentPos.y - prevPos.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  };

  if (!agents) return null;

  return (
    <div className="relative w-full h-full">
      {Object.entries(agents).map(([agentKey, agent]) => {
        const position = positions[agentKey];
        if (!position) return null;

        return (
          <AgentCharacter
            key={agentKey}
            name={getAgentName(agentKey)}
            spriteSrc={getSprite(agentKey)}
            position={position}
            message={undefined}
            isMoving={isMoving[agentKey]}
            direction={getDirection(agentKey)}
          />
        );
      })}
    </div>
  );
}
