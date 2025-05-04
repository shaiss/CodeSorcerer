import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address, Bytes } from "@graphprotocol/graph-ts"
import {
  Initialized,
  NewTokenDataCreated,
  OwnershipTransferred,
  RewardsInitiatorUpdated,
  TokenDataResponded
} from "../generated/Contract/Contract"

export function createInitializedEvent(version: i32): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(version))
    )
  )

  return initializedEvent
}

export function createNewTokenDataCreatedEvent(
  tokenDataIndex: BigInt,
  tokenName: string,
  contractAddress: string
): NewTokenDataCreated {
  let newTokenDataCreatedEvent = changetype<NewTokenDataCreated>(newMockEvent())

  newTokenDataCreatedEvent.parameters = new Array()

  newTokenDataCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenDataIndex",
      ethereum.Value.fromUnsignedBigInt(tokenDataIndex)
    )
  )
  newTokenDataCreatedEvent.parameters.push(
    new ethereum.EventParam("tokenName", ethereum.Value.fromString(tokenName))
  )
  newTokenDataCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "contractAddress",
      ethereum.Value.fromString(contractAddress)
    )
  )

  return newTokenDataCreatedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createRewardsInitiatorUpdatedEvent(
  prevRewardsInitiator: Address,
  newRewardsInitiator: Address
): RewardsInitiatorUpdated {
  let rewardsInitiatorUpdatedEvent = changetype<RewardsInitiatorUpdated>(
    newMockEvent()
  )

  rewardsInitiatorUpdatedEvent.parameters = new Array()

  rewardsInitiatorUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "prevRewardsInitiator",
      ethereum.Value.fromAddress(prevRewardsInitiator)
    )
  )
  rewardsInitiatorUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newRewardsInitiator",
      ethereum.Value.fromAddress(newRewardsInitiator)
    )
  )

  return rewardsInitiatorUpdatedEvent
}

export function createTokenDataRespondedEvent(
  tokenDataIndex: BigInt,
  tokenName: string,
  contractAddress: string,
  isEligible: Bytes,
  operator: Address
): TokenDataResponded {
  let tokenDataRespondedEvent = changetype<TokenDataResponded>(newMockEvent())

  tokenDataRespondedEvent.parameters = new Array()

  tokenDataRespondedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenDataIndex",
      ethereum.Value.fromUnsignedBigInt(tokenDataIndex)
    )
  )
  tokenDataRespondedEvent.parameters.push(
    new ethereum.EventParam("tokenName", ethereum.Value.fromString(tokenName))
  )
  tokenDataRespondedEvent.parameters.push(
    new ethereum.EventParam(
      "contractAddress",
      ethereum.Value.fromString(contractAddress)
    )
  )
  tokenDataRespondedEvent.parameters.push(
    new ethereum.EventParam(
      "isEligible",
      ethereum.Value.fromFixedBytes(isEligible)
    )
  )
  tokenDataRespondedEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )

  return tokenDataRespondedEvent
}
