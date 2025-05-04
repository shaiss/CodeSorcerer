// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.12;

import {ZeusScript} from "../utils/ZeusScript.sol";
import {MultisigCall, MultisigCallUtils} from "../utils/MultisigCallUtils.sol";
import {SafeTx, EncGnosisSafe} from "../utils/SafeTxUtils.sol";

/**
 * @title MultisigBuilder
 * @dev Abstract contract for building arbitrary multisig scripts.
 */
abstract contract MultisigBuilder is ZeusScript {
    using MultisigCallUtils for MultisigCall[];

    string internal constant multiSendCallOnlyName = "MultiSendCallOnly";

    /**
     * @notice Constructs a SafeTx object for a Gnosis Safe to ingest. Emits via `ZeusMultisigExecute`
     */
    function execute() public {
        MultisigOptions memory opt = options();
        emit ZeusRequireMultisig(opt.addr, opt.callType);
        vm.startPrank(opt.addr, opt.addr);
        runAsMultisig();
        vm.stopPrank();
    }

    /**
     * Indicate the multisig address
     */
    function options() internal virtual returns (MultisigOptions memory);

    /**
     * @notice To be implemented by inheriting contract.
     *
     * This function will be pranked from the perspective of the multisig you choose to run with.
     * DO NOT USE vm.startPrank()/stopPrank() during your implementation.
     */
    function runAsMultisig() internal virtual;
}
