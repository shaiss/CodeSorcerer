export interface AgentConfig {
  name: string;
  description: string;
}

export interface AgentStatus {
  isActive: boolean;
  lastUpdate: string;
  currentTask?: string;
}

export interface Position {
  asset: string;
  size: number;
  leverage: number;
  pnl: number;
  liquidationPrice: number;
}

export interface PositionUpdate {
  protocol: string;
  position: Position;
  timestamp: number;
}

export interface PositionAnalysis {
  requiresAction: boolean;
  recommendation?: {
    action: 'INCREASE' | 'DECREASE' | 'CLOSE' | 'HOLD';
    reason: string;
    suggestedSize?: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  metrics: {
    currentPrice: number;
    distanceToLiquidation: number;
    utilizationRate: number;
  };
}

export interface Task {
  id: string;
  type: string;
  data: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface MonitorConfig {
  protocol: string;
  interval: number;
  callback: (data: any) => void;
} 