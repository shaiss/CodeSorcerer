// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.12;

import {ISafe} from "../interfaces/ISafe.sol";

library EncGnosisSafe {
    enum Operation {
        Call,
        DelegateCall
    }

    uint256 constant SAFE_TX_GAS = 0;
    uint256 constant BASE_GAS = 0;
    uint256 constant GAS_PRICE = 0;
    address constant GAS_TOKEN = address(uint160(0));
    address payable constant REFUND_RECEIVER = payable(address(uint160(0)));

    function calldataToExecTransaction(address from, address to, bytes memory data, Operation op)
        internal
        pure
        returns (bytes memory)
    {
        return encodeForExecutor(from, to, 0, data, op);
    }

    function calldataToExecTransaction(address from, address to, uint256 value, bytes memory data, Operation op)
        internal
        pure
        returns (bytes memory)
    {
        return encodeForExecutor(from, to, value, data, op);
    }

    function encodeForExecutor(address from, address to, uint256 value, bytes memory data, Operation op)
        internal
        pure
        returns (bytes memory)
    {
        bytes1 v = bytes1(uint8(1));
        bytes32 r = bytes32(uint256(uint160(from)));
        bytes32 s;
        bytes memory sig = abi.encodePacked(r, s, v);

        return abi.encodeCall(
            ISafe.execTransaction,
            (to, value, data, uint8(op), SAFE_TX_GAS, BASE_GAS, GAS_PRICE, GAS_TOKEN, REFUND_RECEIVER, sig)
        );
    }
}
