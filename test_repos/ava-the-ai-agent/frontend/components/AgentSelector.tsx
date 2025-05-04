"use client";

import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
  };
}

interface AgentSelectorProps {
  onSelectAgent: (agentName: string, useA2A: boolean) => void;
  selectedAgent: string;
  useA2A: boolean;
}

export default function AgentSelector({ 
  onSelectAgent, 
  selectedAgent, 
  useA2A 
}: AgentSelectorProps) {
  const [agentCards, setAgentCards] = useState<Record<string, AgentCard>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch agent cards from the server on component mount
  useEffect(() => {
    const fetchAgentCards = async () => {
      try {
        setIsLoading(true);
        
        // Fetch each agent's card from their well-known endpoints
        const response = await fetch('/api/agent-cards');
        const cards = await response.json();
        
        setAgentCards(cards);
      } catch (error) {
        console.error('Failed to fetch agent cards:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAgentCards();
  }, []);

  const handleSelectAgent = (value: string) => {
    onSelectAgent(value, useA2A);
  };

  const handleToggleA2A = (checked: boolean) => {
    onSelectAgent(selectedAgent, checked);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Agent Selection</CardTitle>
        <CardDescription>
          Select which agent to communicate with and configure the communication protocol
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-selector">Agent</Label>
          <Select
            value={selectedAgent}
            onValueChange={handleSelectAgent}
            disabled={isLoading}
          >
            <SelectTrigger id="agent-selector" className="w-full">
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>
                  Loading agents...
                </SelectItem>
              ) : (
                Object.entries(agentCards).map(([key, card]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <span>{card.name}</span>
                      <div className="flex space-x-2">
                        {card.capabilities.streaming && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600">
                            Streaming
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="use-a2a" 
            checked={useA2A}
            onCheckedChange={handleToggleA2A}
          />
          <Label htmlFor="use-a2a">Use A2A Protocol</Label>
        </div>

        {selectedAgent && agentCards[selectedAgent] && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium">Agent Details</h4>
            <p className="text-sm text-gray-500 mt-1">
              {agentCards[selectedAgent].description}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">
                v{agentCards[selectedAgent].version}
              </Badge>
              {agentCards[selectedAgent].capabilities.streaming && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600">
                  Streaming
                </Badge>
              )}
              {agentCards[selectedAgent].capabilities.pushNotifications && (
                <Badge variant="outline" className="bg-green-50 text-green-600">
                  Push Notifications
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 