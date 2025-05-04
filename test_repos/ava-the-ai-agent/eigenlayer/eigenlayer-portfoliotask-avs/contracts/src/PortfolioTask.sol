// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

enum TaskStatus {
    Active,
    Completed,
    Failed
}

enum ValidationStrategy {
    TokenEligibility,
    PortfolioBalance,
    RiskAssessment
}

struct PortfolioTask {
    address[] tokens;      // Token addresses in portfolio
    uint256[] amounts;     // Token amounts
    string strategy;       // Strategy identifier
    TaskStatus status;     // Current task status
    uint256 createdAt;     // Task creation timestamp
    uint32 responses;      // Number of operator responses
    ValidationStrategy validationType; // Type of validation needed
    bytes32 taskHash;      // Hash of task data
    mapping(address => bytes) operatorResponses; // Operator responses
}

struct TokenData {
    string chain;          // Chain identifier
    address tokenAddress;  // Token contract address
    uint32 createdBlock;   // Block number at creation
    bool isEligible;      // Token eligibility status
    string metadata;      // Additional token metadata
} 