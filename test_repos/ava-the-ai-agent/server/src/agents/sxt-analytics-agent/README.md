# Space and Time Analytics Agent

The SXT Analytics Agent is an integration with Space and Time's data services that provides advanced blockchain analytics and portfolio management capabilities for the AVA Portfolio Manager system.

## Overview

This agent leverages Space and Time's SQL database to access indexed blockchain data, enabling rich analytics and intelligence for portfolio management. The agent maintains synchronized portfolio data in SXT's database and provides analytics functions to other agents in the portfolio management system.

## Features

- **Portfolio Analytics**: Track asset distribution, portfolio value, and historical performance
- **Risk Analysis**: Assess portfolio risk based on asset and blockchain concentration
- **Market Intelligence**: Discover yield farming and liquidity opportunities based on SXT's blockchain data
- **On-chain Transaction History**: Access and analyze transaction history for portfolio assets

## Key Components

1. **SXT Analytics Agent**: Main agent that handles tasks, processes portfolio updates, and generates analytics
2. **SXT Data Provider**: Plugin that handles authentication and communication with the Space and Time SDK
3. **Database Schema**:
   - `PORTFOLIO.ASSETS`: Stores portfolio asset information
   - `PORTFOLIO.TRANSACTIONS`: Stores transaction history
   - `PORTFOLIO.ANALYTICS`: Stores generated analytics metrics

## Usage

The agent responds to the following event types:

1. **Task Manager Requests**: Process analytics tasks from the task manager
   ```typescript
   eventBus.emit(`task-manager-sxt-analytics-agent`, {
     taskId: 'unique-task-id',
     task: 'Get a summary of my portfolio'
   });
   ```

2. **Portfolio Updates**: Update assets and transactions data when portfolio changes
   ```typescript
   eventBus.emit(`portfolio-update`, {
     assets: [...],
     transactions: [...]
   });
   ```

## Available Operations

The agent can perform the following operations:

1. **getPortfolioSummary**: Get overall portfolio value and asset distribution
2. **getAssetPerformance**: Get detailed performance metrics for a specific asset
3. **getRiskAnalysis**: Calculate portfolio risk metrics based on concentration and diversification
4. **getMarketOpportunities**: Discover yield farming and liquidity opportunities
5. **getHistoricalPerformance**: Analyze portfolio performance over time

## Setup and Configuration

To use the SXT Analytics Agent, you need:

1. Space and Time account with API credentials
2. Environment variables:
   ```
   SXT_PRIVATE_KEY=your-private-key
   SXT_PUBLIC_KEY=your-public-key
   SXT_API_KEY=your-api-key
   ```

## Integration with AVA Portfolio Manager

The SXT Analytics Agent enhances the AVA Portfolio Manager by providing data-driven insights that help users make better investment decisions. It integrates with other agents in the system to provide a complete view of the portfolio's health and performance.

## Example: Risk Analysis Flow

1. User requests a risk analysis via the UI
2. Task Manager sends a task to the SXT Analytics Agent
3. Agent queries SXT database for portfolio assets
4. Agent calculates risk metrics based on asset concentration and blockchain diversification
5. Agent returns risk analysis to Task Manager
6. UI presents risk analysis to the user with visualizations

## Future Enhancements

- **AI-driven Investment Recommendations**: Use historical data and market trends to suggest portfolio adjustments
- **Tax Reporting**: Generate capital gains reports based on transaction history
- **Anomaly Detection**: Monitor for suspicious transactions or unusual portfolio changes
- **Cross-chain Analytics**: Analyze portfolio performance across multiple blockchains 