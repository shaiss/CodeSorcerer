"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { PortfolioManager } from './portfolio-manager';
import { MainLayout } from '@/components/layouts/MainLayout';

export default function AgentDashboard() {
    const [portfolioManager, setPortfolioManager] = useState<PortfolioManager | null>(null);
    const [poolStats, setPoolStats] = useState({ reserveA: '0', reserveB: '0', totalLiquidity: '0' });
    const [riskLevel, setRiskLevel] = useState(5);
    const [isAgentActive, setIsAgentActive] = useState(false);

    useEffect(() => {
        const initializeManager = async () => {
            if (typeof window.ethereum !== 'undefined') {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                await provider.send("eth_requestAccounts", []);

                const manager = new PortfolioManager(
                    process.env.NEXT_PUBLIC_DEX_ADDRESS!,
                    process.env.NEXT_PUBLIC_AI_AGENT_ADDRESS!,
                    provider
                );
                setPortfolioManager(manager);
            }
        };

        initializeManager();
    }, []);

    useEffect(() => {
        const fetchPoolStats = async () => {
            if (portfolioManager) {
                const stats = await portfolioManager.getPoolStats();
                setPoolStats(stats);
            }
        };

        fetchPoolStats();
        const interval = setInterval(fetchPoolStats, 10000);
        return () => clearInterval(interval);
    }, [portfolioManager]);

    const handleRiskLevelChange = async (newLevel: number) => {
        if (portfolioManager) {
            await portfolioManager.setRiskLevel(newLevel);
            setRiskLevel(newLevel);
        }
    };

    const handleToggleAgent = async () => {
        if (portfolioManager) {
            await portfolioManager.toggleAgent();
            setIsAgentActive(!isAgentActive);
        }
    };

    return (
        <MainLayout>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">AI Trading Dashboard</h1>

                {/* Pool Statistics */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">Token A Reserve</h3>
                        <p className="text-2xl">{poolStats.reserveA}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">Token B Reserve</h3>
                        <p className="text-2xl">{poolStats.reserveB}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold mb-2">Total Liquidity</h3>
                        <p className="text-2xl">{poolStats.totalLiquidity}</p>
                    </div>
                </div>

                {/* Agent Controls */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-2xl font-bold mb-4">Agent Controls</h2>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Risk Level (1-10)
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={riskLevel}
                            onChange={(e) => handleRiskLevelChange(Number(e.target.value))}
                            className="w-full"
                        />
                        <span className="text-sm text-gray-500">Current: {riskLevel}</span>
                    </div>

                    <button
                        onClick={handleToggleAgent}
                        className={`px-4 py-2 rounded-lg ${isAgentActive
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                            } text-white`}
                    >
                        {isAgentActive ? 'Deactivate Agent' : 'Activate Agent'}
                    </button>
                </div>

                {/* Trading History */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-2xl font-bold mb-4">Trading History</h2>
                    {/* Add trading history table here */}
                </div>
            </div>
        </MainLayout>
    );
}