// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/Test.sol";
import {CoreDeploymentLib} from "./CoreDeploymentLib.sol";
import {UpgradeableProxyLib} from "./UpgradeableProxyLib.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {PortfolioValidationServiceManager} from "../../src/PortfolioValidationServiceManager.sol";
import {TransparentUpgradeableProxy} from 
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Quorum} from "@eigenlayer-middleware/src/interfaces/IECDSAStakeRegistryEventsAndErrors.sol";

library PortfolioDeploymentLib {
    using UpgradeableProxyLib for address;

    struct DeploymentData {
        address stakeRegistry;
        address portfolioServiceManager;
        address strategy;
        address[] supportedTokens;
    }

    function deployContracts(
        address proxyAdmin,
        CoreDeploymentLib.DeploymentData memory coreDeployment,
        Quorum memory quorum
    ) internal returns (DeploymentData memory deploymentData) {
        // Deploy stake registry
        ECDSAStakeRegistry stakeRegistryImpl = new ECDSAStakeRegistry();
        bytes memory stakeRegistryInitData = abi.encodeWithSelector(
            ECDSAStakeRegistry.initialize.selector,
            quorum
        );
        deploymentData.stakeRegistry = address(stakeRegistryImpl).deployProxy(
            proxyAdmin,
            stakeRegistryInitData
        );

        // Deploy portfolio service manager
        PortfolioValidationServiceManager portfolioServiceManagerImpl = 
            new PortfolioValidationServiceManager();
        bytes memory portfolioServiceManagerInitData = abi.encodeWithSelector(
            PortfolioValidationServiceManager.initialize.selector,
            coreDeployment.avsDirectory,
            deploymentData.stakeRegistry,
            coreDeployment.rewardsCoordinator,
            coreDeployment.delegationManager
        );
        deploymentData.portfolioServiceManager = address(portfolioServiceManagerImpl).deployProxy(
            proxyAdmin,
            portfolioServiceManagerInitData
        );

        return deploymentData;
    }

    function writeDeploymentJson(DeploymentData memory deploymentData) internal {
        string memory json = vm.serializeAddress(
            "deployment",
            "stakeRegistry",
            deploymentData.stakeRegistry
        );
        json = vm.serializeAddress(
            "deployment",
            "portfolioServiceManager",
            deploymentData.portfolioServiceManager
        );
        json = vm.serializeAddress(
            "deployment",
            "strategy",
            deploymentData.strategy
        );
        json = vm.serializeAddress(
            "deployment",
            "supportedTokens",
            deploymentData.supportedTokens
        );

        vm.writeJson(json, string.concat("deployments/portfolio/", vm.toString(block.chainid), ".json"));
    }

    function readDeploymentJson(
        string memory path,
        uint256 chainId
    ) internal view returns (DeploymentData memory deploymentData) {
        string memory json = vm.readFile(
            string.concat(path, vm.toString(chainId), ".json")
        );

        deploymentData.stakeRegistry = vm.parseJsonAddress(
            json,
            ".stakeRegistry"
        );
        deploymentData.portfolioServiceManager = vm.parseJsonAddress(
            json,
            ".portfolioServiceManager"
        );
        deploymentData.strategy = vm.parseJsonAddress(
            json,
            ".strategy"
        );
        deploymentData.supportedTokens = vm.parseJsonAddress(
            json,
            ".supportedTokens"
        );

        return deploymentData;
    }
} 