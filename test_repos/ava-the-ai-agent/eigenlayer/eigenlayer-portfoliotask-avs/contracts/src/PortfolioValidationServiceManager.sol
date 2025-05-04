// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ECDSAServiceManagerBase} from
    "@eigenlayer-middleware/src/unaudited/ECDSAServiceManagerBase.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {IServiceManager} from "@eigenlayer-middleware/src/interfaces/IServiceManager.sol";
import {ECDSAUpgradeable} from "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC1271Upgradeable} from "@openzeppelin-upgrades/contracts/interfaces/IERC1271Upgradeable.sol";
import {PortfolioTask} from "./PortfolioTask.sol";

contract PortfolioValidationServiceManager is ECDSAServiceManagerBase {
    using ECDSAUpgradeable for bytes32;

    uint32 public currentTaskId;
    mapping(uint32 => PortfolioTask) public tasks;
    mapping(uint32 => TokenData) public tokenRegistry;
    
    event NewPortfolioTask(
        uint32 indexed taskId,
        address[] tokens,
        uint256[] amounts,
        string strategy,
        ValidationStrategy validationType
    );

    event ValidationSubmitted(
        uint32 indexed taskId,
        address indexed operator,
        bytes validation
    );

    event TokenDataUpdated(
        uint32 indexed tokenId,
        string chain,
        address tokenAddress,
        bool isEligible,
        string metadata
    );

    constructor(
        address _avsDirectory,
        address _stakeRegistry,
        address _rewardsCoordinator,
        address _delegationManager
    ) ECDSAServiceManagerBase(
        _avsDirectory,
        _stakeRegistry,
        _rewardsCoordinator,
        _delegationManager
    ) {}

    // creates a portfolio task
    function createPortfolioTask(
        address[] memory tokens,
        uint256[] memory amounts,
        string memory strategy,
        ValidationStrategy validationType
    ) external returns (uint32) {
        require(tokens.length == amounts.length, "Invalid input lengths");
        
        uint32 taskId = currentTaskId++;
        
        PortfolioTask storage task = tasks[taskId];
        task.tokens = tokens;
        task.amounts = amounts;
        task.strategy = strategy;
        task.status = TaskStatus.Active;
        task.createdAt = block.timestamp;
        task.validationType = validationType;
        task.taskHash = keccak256(abi.encode(tokens, amounts, strategy, validationType));

        emit NewPortfolioTask(taskId, tokens, amounts, strategy, validationType);
        return taskId;
    }

    function submitValidation(
        uint32 taskId,
        bytes memory validation,
        bytes memory signature
    ) external {
        require(tasks[taskId].status == TaskStatus.Active, "Task not active");
        require(isRegisteredOperator(msg.sender), "Not registered operator");
        
        // Verify operator signature
        bytes32 messageHash = keccak256(abi.encodePacked(taskId, validation));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        require(
            verifyOperatorSignature(msg.sender, ethSignedMessageHash, signature),
            "Invalid signature"
        );

        tasks[taskId].operatorResponses[msg.sender] = validation;
        tasks[taskId].responses++;

        emit ValidationSubmitted(taskId, msg.sender, validation);
    }

    function updateTokenData(
        uint32 tokenId,
        string memory chain,
        address tokenAddress,
        bool isEligible,
        string memory metadata
    ) external onlyOperator {
        TokenData storage token = tokenRegistry[tokenId];
        token.chain = chain;
        token.tokenAddress = tokenAddress;
        token.isEligible = isEligible;
        token.metadata = metadata;
        token.createdBlock = uint32(block.number);

        emit TokenDataUpdated(tokenId, chain, tokenAddress, isEligible, metadata);
    }

    function getTaskValidations(uint32 taskId) external view returns (
        address[] memory operators,
        bytes[] memory validations
    ) {
        // Implementation to return all validations for a task
    }

    modifier onlyOperator() {
        require(isRegisteredOperator(msg.sender), "Not an operator");
        _;
    }
} 