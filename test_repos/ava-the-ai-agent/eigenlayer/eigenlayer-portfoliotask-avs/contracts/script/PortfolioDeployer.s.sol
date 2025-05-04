// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/Test.sol";
import {PortfolioDeploymentLib} from "./utils/PortfolioDeploymentLib.sol";
import {CoreDeploymentLib} from "./utils/CoreDeploymentLib.sol";
import {UpgradeableProxyLib} from "./utils/UpgradeableProxyLib.sol";
import {StrategyBase} from "@eigenlayer/contracts/strategies/StrategyBase.sol";
import {ERC20Mock} from "../test/ERC20Mock.sol";
import {TransparentUpgradeableProxy} from 
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {StrategyFactory} from "@eigenlayer/contracts/strategies/StrategyFactory.sol";
import {StrategyManager} from "@eigenlayer/contracts/core/StrategyManager.sol";
import {
    Quorum,
    StrategyParams,
    IStrategy
} from "@eigenlayer-middleware/src/interfaces/IECDSAStakeRegistryEventsAndErrors.sol";

contract PortfolioDeployer is Script {
    using CoreDeploymentLib for *;
    using UpgradeableProxyLib for address;

    address private deployer;
    address proxyAdmin;
    IStrategy portfolioStrategy;
    CoreDeploymentLib.DeploymentData coreDeployment;
    PortfolioDeploymentLib.DeploymentData portfolioDeployment;
    Quorum internal quorum;
    ERC20Mock[] public tokens;

    function setUp() public virtual {
        deployer = vm.rememberKey(vm.envUint("PRIVATE_KEY"));
        vm.label(deployer, "Deployer");

        // Read core deployment data
        coreDeployment = CoreDeploymentLib.readDeploymentJson("deployments/core/", block.chainid);
        
        // Deploy mock tokens for testing
        for(uint i = 0; i < 3; i++) {
            tokens.push(new ERC20Mock());
        }

        // Deploy strategy for portfolio validation
        portfolioStrategy = IStrategy(
            StrategyFactory(coreDeployment.strategyFactory).deployNewStrategy(tokens[0])
        );

        // Set up quorum with strategy
        quorum.strategies.push(
            StrategyParams({
                strategy: portfolioStrategy,
                multiplier: 10_000
            })
        );
    }

    function run() external {
        vm.startBroadcast(deployer);

        // Deploy proxy admin
        proxyAdmin = UpgradeableProxyLib.deployProxyAdmin();

        // Deploy portfolio contracts
        portfolioDeployment = PortfolioDeploymentLib.deployContracts(
            proxyAdmin,
            coreDeployment,
            quorum
        );

        // Set strategy and tokens
        portfolioDeployment.strategy = address(portfolioStrategy);
        for(uint i = 0; i < tokens.length; i++) {
            portfolioDeployment.supportedTokens.push(address(tokens[i]));
        }

        vm.stopBroadcast();

        verifyDeployment();
        PortfolioDeploymentLib.writeDeploymentJson(portfolioDeployment);
    }

    function verifyDeployment() internal view {
        require(
            portfolioDeployment.stakeRegistry != address(0),
            "StakeRegistry address cannot be zero"
        );
        require(
            portfolioDeployment.portfolioServiceManager != address(0),
            "PortfolioServiceManager address cannot be zero"
        );
        require(
            portfolioDeployment.strategy != address(0),
            "Strategy address cannot be zero"
        );
        require(
            proxyAdmin != address(0),
            "ProxyAdmin address cannot be zero"
        );
        require(
            coreDeployment.delegationManager != address(0),
            "DelegationManager address cannot be zero"
        );
        require(
            coreDeployment.avsDirectory != address(0),
            "AVSDirectory address cannot be zero"
        );
        require(
            portfolioDeployment.supportedTokens.length > 0,
            "No supported tokens configured"
        );
    }
} 