// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DEX.sol";
import "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";

contract AITradingAgent is Ownable, GelatoRelayContext {
    DEX public dex;
    
    // Trading parameters
    uint public riskLevel; // 1-10, where 10 is highest risk
    uint public maxTradeSize;
    bool public isActive;
    
    // Events
    event TradeExecuted(address tokenIn, address tokenOut, uint amountIn, uint amountOut);
    event RiskLevelUpdated(uint newLevel);
    event AgentStatusChanged(bool isActive);

    constructor(address _dex) {
        dex = DEX(_dex);
        riskLevel = 5; // Default medium risk
        isActive = false;
    }

    function executeAITrade(
        address tokenIn,
        uint amountIn,
        bytes calldata /* permission */
    ) external onlyGelatoRelay {
        require(isActive, "Agent is not active");
        require(amountIn <= maxTradeSize, "Trade size too large");

        // Execute trade on DEX
        IERC20(tokenIn).approve(address(dex), amountIn);
        dex.swap(tokenIn, amountIn);

        emit TradeExecuted(
            tokenIn,
            tokenIn == address(dex.tokenA()) ? address(dex.tokenB()) : address(dex.tokenA()),
            amountIn,
            0 // Actual amount out will be calculated by DEX
        );
    }

    function setRiskLevel(uint _riskLevel) external onlyOwner {
        require(_riskLevel >= 1 && _riskLevel <= 10, "Invalid risk level");
        riskLevel = _riskLevel;
        emit RiskLevelUpdated(_riskLevel);
    }

    function setMaxTradeSize(uint _maxTradeSize) external onlyOwner {
        maxTradeSize = _maxTradeSize;
    }

    function toggleAgent() external onlyOwner {
        isActive = !isActive;
        emit AgentStatusChanged(isActive);
    }
} 