// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.12;

interface IMultiSend {
    function multiSend(bytes memory transactions) external payable;
}
