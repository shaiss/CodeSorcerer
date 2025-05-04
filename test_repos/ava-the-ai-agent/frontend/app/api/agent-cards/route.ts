import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get API base URL from environment variable
    const apiBaseUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3020';
    
    // List of agent endpoints
    const agentEndpoints = [
      { name: 'observer', path: '/agent/observer/.well-known/agent.json' },
      { name: 'executor', path: '/agent/executor/.well-known/agent.json' },
      { name: 'task-manager', path: '/agent/task-manager/.well-known/agent.json' }
    ];
    
    // Fetch agent cards from the server
    const agentCards: Record<string, any> = {};
    
    await Promise.all(
      agentEndpoints.map(async ({ name, path }) => {
        try {
          const response = await fetch(`${apiBaseUrl}${path}`);
          
          if (response.ok) {
            const data = await response.json();
            agentCards[name] = data;
          } else {
            console.error(`Failed to fetch agent card for ${name}: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`Error fetching agent card for ${name}:`, error);
        }
      })
    );
    
    return NextResponse.json(agentCards);
  } catch (error) {
    console.error('Error fetching agent cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent cards' },
      { status: 500 }
    );
  }
} 