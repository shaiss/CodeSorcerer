// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.12;

import {StringUtils} from "./StringUtils.sol";
import {Script} from "forge-std/Script.sol";
import {EncGnosisSafe} from "./EncGnosisSafe.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

abstract contract ZeusScript is Script, Test {
    using StringUtils for string;

    enum Operation {
        Call,
        DelegateCall
    }

    struct MultisigOptions {
        address addr; // the address of the multisig
        Operation callType; // call vs. delegateCall
    }

    enum EnvironmentVariableType {
        UNMODIFIED,
        UINT_256,
        UINT_32,
        UINT_64,
        ADDRESS,
        STRING,
        BOOL,
        UINT_16,
        UINT_8
    }

    event ZeusRequireMultisig(address addr, Operation callType);
    event ZeusEnvironmentUpdate(string key, EnvironmentVariableType internalType, bytes value);
    event ZeusDeploy(string name, address addr, bool singleton);
    event ZeusMultisigExecute(address to, uint256 value, bytes data, EncGnosisSafe.Operation op);

    string internal constant addressPrefix = "ZEUS_DEPLOYED_";
    string internal constant envPrefix = "ZEUS_ENV_";

    string internal constant implSuffix = "_Impl";
    string internal constant proxySuffix = "_Proxy";

    mapping(string => address) internal updatedContracts;
    mapping(string => EnvironmentVariableType) updatedTypes;
    mapping(string => string) updatedStrings;
    mapping(string => address) updatedAddresses;
    mapping(string => uint256) updatedUInt256s;
    mapping(string => uint64) updatedUInt64s;
    mapping(string => uint32) updatedUInt32s;
    mapping(string => uint16) updatedUInt16s;
    mapping(string => uint8) updatedUInt8s;
    mapping(string => bool) updatedBools;

    function impl(string memory contractName) public pure returns (string memory) {
        return contractName.concat(implSuffix);
    }

    function proxy(string memory contractName) public pure returns (string memory) {
        return contractName.concat(proxySuffix);
    }

    /**
     * Environment manipulation - update variables in the current environment's configuration *****
     */
    // NOTE: you do not need to use these for contract addresses, which are tracked and injected automatically.
    // NOTE: do not use `.update()` during a vm.broadcast() segment.
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function zUpdate(string memory key, string memory value) public returns (string memory) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED
                || updatedTypes[key] == EnvironmentVariableType.STRING
        );
        updatedTypes[key] = EnvironmentVariableType.STRING;
        updatedStrings[key] = key;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.STRING, abi.encode(value));
        return value;
    }

    function zUpdate(string memory key, address value) public returns (address) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED
                || updatedTypes[key] == EnvironmentVariableType.ADDRESS
        );
        updatedTypes[key] = EnvironmentVariableType.ADDRESS;
        updatedAddresses[key] = value;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.ADDRESS, abi.encode(value));
        return value;
    }

    function zUpdateUint256(string memory key, uint256 value) public returns (uint256) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED
                || updatedTypes[key] == EnvironmentVariableType.UINT_256
        );
        updatedTypes[key] = EnvironmentVariableType.UINT_256;
        updatedUInt256s[key] = value;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.UINT_256, abi.encode(value));
        return value;
    }

    function zUpdateUint64(string memory key, uint64 value) public returns (uint64) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED
                || updatedTypes[key] == EnvironmentVariableType.UINT_64
        );
        updatedTypes[key] = EnvironmentVariableType.UINT_64;
        updatedUInt64s[key] = value;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.UINT_64, abi.encode(value));
        return value;
    }

    function zUpdateUint32(string memory key, uint32 value) public returns (uint32) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED
                || updatedTypes[key] == EnvironmentVariableType.UINT_32
        );
        updatedTypes[key] = EnvironmentVariableType.UINT_32;
        updatedUInt32s[key] = value;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.UINT_32, abi.encode(value));
        return value;
    }

    function zUpdateUint16(string memory key, uint16 value) public returns (uint16) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED
                || updatedTypes[key] == EnvironmentVariableType.UINT_16
        );
        updatedTypes[key] = EnvironmentVariableType.UINT_16;
        updatedUInt16s[key] = value;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.UINT_16, abi.encode(value));
        return value;
    }

    function zUpdateUint8(string memory key, uint8 value) public returns (uint8) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED
                || updatedTypes[key] == EnvironmentVariableType.UINT_8
        );
        updatedTypes[key] = EnvironmentVariableType.UINT_8;
        updatedUInt8s[key] = value;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.UINT_8, abi.encode(value));
        return value;
    }

    function zUpdate(string memory key, bool value) public returns (bool) {
        require(
            updatedTypes[key] == EnvironmentVariableType.UNMODIFIED || updatedTypes[key] == EnvironmentVariableType.BOOL
        );
        updatedTypes[key] = EnvironmentVariableType.BOOL;
        updatedBools[key] = value;
        emit ZeusEnvironmentUpdate(key, EnvironmentVariableType.BOOL, abi.encode(value));
        return value;
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Returns the address of a contract based on the provided key, querying the envvars injected by Zeus. This is typically the name of the contract.
     * @param key The key to look up the address for. Should be the contract name, with an optional suffix if deploying multiple instances. (E.g. "MyContract_1" and "MyContract_2")
     * @return The address of the contract associated with the provided key. Reverts if envvar not found.
     */
    function zDeployedContract(string memory key) public view returns (address) {
        //                     ZEUS_DEPLOYED_ + key
        string memory envvar = addressPrefix.concat(key);
        if (updatedContracts[key] != address(0)) {
            return updatedContracts[key];
        }
        return vm.envAddress(envvar);
    }

    function zDeployedProxy(string memory key) public view returns (address) {
        //                     ZEUS_DEPLOYED_ + key_Proxy
        string memory lookupKey = this.proxy(key);
        string memory envvar = addressPrefix.concat(lookupKey);
        if (updatedContracts[lookupKey] != address(0)) {
            return updatedContracts[lookupKey];
        }
        return vm.envAddress(envvar);
    }

    function zDeployedImpl(string memory key) public view returns (address) {
        //                     ZEUS_DEPLOYED_ + key_Impl
        string memory lookupKey = this.impl(key);
        string memory envvar = addressPrefix.concat(lookupKey);
        if (updatedContracts[lookupKey] != address(0)) {
            return updatedContracts[lookupKey];
        }
        return vm.envAddress(envvar);
    }

    /**
     * Returns an `address` set in the current environment. NOTE: If you deployed this contract with zeus, you want `zDeployedContract` instead.
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zAddress(string memory key) public view returns (address) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedAddresses[key];
        }

        string memory envvar = envPrefix.concat(key);
        return vm.envAddress(envvar);
    }

    /**
     * Returns a uin32 set in the current environment.
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zUint32(string memory key) public view returns (uint32) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedUInt32s[key];
        }

        string memory envvar = envPrefix.concat(key);
        return uint32(vm.envUint(envvar));
    }

    /**
     * Returns a uin16 set in the current environment.
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zUint16(string memory key) public view returns (uint16) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedUInt16s[key];
        }

        string memory envvar = envPrefix.concat(key);
        return uint16(vm.envUint(envvar));
    }

    /**
     * Returns a uin16 set in the current environment.
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zUint8(string memory key) public view returns (uint8) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedUInt8s[key];
        }

        string memory envvar = envPrefix.concat(key);
        return uint8(vm.envUint(envvar));
    }

    /**
     * Returns a uin64 set in the current environment.
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zUint64(string memory key) public view returns (uint64) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedUInt64s[key];
        }

        string memory envvar = envPrefix.concat(key);
        return uint64(vm.envUint(envvar));
    }

    /**
     * Returns a uin64 set in the current environment.
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zUint256(string memory key) public view returns (uint256) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedUInt256s[key];
        }

        string memory envvar = envPrefix.concat(key);
        return uint256(vm.envUint(envvar));
    }

    /**
     * Returns a boolean set in the current environment.
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zBool(string memory key) public view returns (bool) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedBools[key];
        }

        string memory envvar = envPrefix.concat(key);
        return bool(vm.envBool(envvar));
    }

    /**
     * Returns a string set in the current environment
     * @param key The environment key. Corresponds to a ZEUS_* env variable.
     */
    function zString(string memory key) public view returns (string memory) {
        if (updatedTypes[key] != EnvironmentVariableType.UNMODIFIED) {
            return updatedStrings[key];
        }

        string memory envvar = envPrefix.concat(key);
        return vm.envString(envvar);
    }
}
