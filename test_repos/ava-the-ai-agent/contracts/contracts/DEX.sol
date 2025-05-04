// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DEX is ReentrancyGuard {
    // Events
    event AddLiquidity(address indexed provider, uint amountA, uint amountB);
    event RemoveLiquidity(address indexed provider, uint amountA, uint amountB);
    event Swap(address indexed user, address tokenIn, address tokenOut, uint amountIn, uint amountOut);

    // Token pair
    IERC20 public tokenA;
    IERC20 public tokenB;
    
    // Liquidity tracking
    mapping(address => uint) public liquidity;
    uint public totalLiquidity;
    
    // Reserves
    uint public reserveA;
    uint public reserveB;

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(uint amountA, uint amountB) external nonReentrant {
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        // Transfer tokens
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        
        // Update reserves
        reserveA += amountA;
        reserveB += amountB;
        
        // Calculate liquidity tokens
        uint liquidityMinted;
        if (totalLiquidity == 0) {
            liquidityMinted = sqrt(amountA * amountB);
        } else {
            liquidityMinted = min(
                (amountA * totalLiquidity) / reserveA,
                (amountB * totalLiquidity) / reserveB
            );
        }
        
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        
        emit AddLiquidity(msg.sender, amountA, amountB);
    }

    function swap(address tokenIn, uint amountIn) external nonReentrant {
        require(tokenIn == address(tokenA) || tokenIn == address(tokenB), "Invalid token");
        require(amountIn > 0, "Invalid amount");

        bool isTokenA = tokenIn == address(tokenA);
        (IERC20 tokenInput, IERC20 tokenOutput, uint reserveInput, uint reserveOutput) = isTokenA 
            ? (tokenA, tokenB, reserveA, reserveB)
            : (tokenB, tokenA, reserveB, reserveA);

        // Calculate output amount using constant product formula
        uint amountOut = getAmountOut(amountIn, reserveInput, reserveOutput);
        
        // Transfer tokens
        tokenInput.transferFrom(msg.sender, address(this), amountIn);
        tokenOutput.transfer(msg.sender, amountOut);
        
        // Update reserves
        if (isTokenA) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }
        
        emit Swap(msg.sender, address(tokenInput), address(tokenOutput), amountIn, amountOut);
    }

    // Helper functions
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint) {
        require(amountIn > 0, "Invalid input amount");
        require(reserveIn > 0 && reserveOut > 0, "Invalid reserves");
        
        uint amountInWithFee = amountIn * 997; // 0.3% fee
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = (reserveIn * 1000) + amountInWithFee;
        
        return numerator / denominator;
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint x, uint y) internal pure returns (uint) {
        return x <= y ? x : y;
    }
} 