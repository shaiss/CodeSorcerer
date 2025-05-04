// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.12;

import {ZeusScript} from "../utils/ZeusScript.sol";

/**
 * @title EOADeployer
 * @notice Template for an Externally Owned Account (EOA) deploy script.
 */
abstract contract EOADeployer is ZeusScript {
    Deployment[] private _deployments;

    /**
     * @notice Struct for deployment information.
     * @param deployedTo The address where the contract is deployed.
     * @param name The name of the deployed contract.
     * @param singleton True to have Zeus track this contract within the config. Use for contracts with meaningful identity (e.g. _the_ EigenPodManager implementation).
     */
    struct Deployment {
        address deployedTo;
        string name;
        bool singleton;
    }

    /**
     * @notice Deploys contracts based on the configuration specified in the provided environment file.
     * Emits via ZeusDeploy event.
     */
    function runAsEOA() public {
        _runAsEOA();
    }

    /**
     * @dev Internal function to deploy contracts based on the provided addresses, environment, and parameters.
     */
    function _runAsEOA() internal virtual;

    function deploySingleton(address deployedTo, string memory name) internal {
        emit ZeusDeploy(name, deployedTo, true /* singleton */ );
        _deployments.push(Deployment(deployedTo, name, true));
        updatedContracts[name] = deployedTo;
    }

    function deployInstance(address deployedTo, string memory name) internal {
        emit ZeusDeploy(name, deployedTo, false /* singleton */ );
        _deployments.push(Deployment(deployedTo, name, false));
    }

    function deploys() public view returns (Deployment[] memory) {
        return _deployments;
    }
}
