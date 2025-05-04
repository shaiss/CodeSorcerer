// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.12;

import {ISafe} from "../interfaces/ISafe.sol";
import {IMultiSend} from "../interfaces/IMultiSend.sol";

struct MultisigCall {
    address to;
    uint256 value;
    bytes data;
}

library MultisigCallUtils {
    function append(MultisigCall[] storage multisigCalls, address to, uint256 value, bytes memory data)
        internal
        returns (MultisigCall[] storage)
    {
        multisigCalls.push(MultisigCall({to: to, value: value, data: data}));

        return multisigCalls;
    }

    /// @notice appends a multisig call with a value of 0
    function append(MultisigCall[] storage multisigCalls, address to, bytes memory data)
        internal
        returns (MultisigCall[] storage)
    {
        multisigCalls.push(MultisigCall({to: to, value: 0, data: data}));

        return multisigCalls;
    }

    function encodeMultisendTxs(IMultiSend ms, MultisigCall[] memory txs) public pure returns (bytes memory) {
        bytes memory ret = new bytes(0);
        for (uint256 i = 0; i < txs.length; i++) {
            ret = abi.encodePacked(
                ret, abi.encodePacked(uint8(0), txs[i].to, txs[i].value, uint256(txs[i].data.length), txs[i].data)
            );
        }

        return abi.encodeCall(ms.multiSend, ret);
    }
}
