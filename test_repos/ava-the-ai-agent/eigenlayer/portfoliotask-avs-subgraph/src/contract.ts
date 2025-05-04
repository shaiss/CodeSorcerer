import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  NewPortfolioTask,
  ValidationSubmitted,
  TokenDataUpdated
} from "../generated/Contract/Contract"
import { Portfolio, Token, Validation } from "../generated/schema"

export function handleNewPortfolioTask(event: NewPortfolioTask): void {
  let portfolio = new Portfolio(event.params.taskId.toHexString())
  portfolio.taskId = event.params.taskId
  portfolio.tokens = event.params.tokens.map(t => t.toHexString())
  portfolio.amounts = event.params.amounts
  portfolio.strategy = event.params.strategy
  portfolio.validationType = event.params.validationType
  portfolio.status = 0 // Active
  portfolio.createdAt = event.block.timestamp
  portfolio.save()
}

export function handleValidationSubmitted(event: ValidationSubmitted): void {
  let id = event.params.taskId.toHexString() + "-" + event.params.operator.toHexString()
  let validation = new Validation(id)
  validation.portfolio = event.params.taskId.toHexString()
  validation.operator = event.params.operator
  validation.validation = event.params.validation
  validation.timestamp = event.block.timestamp
  validation.save()
}

export function handleTokenDataUpdated(event: TokenDataUpdated): void {
  let token = new Token(event.params.tokenId.toHexString())
  token.chain = event.params.chain
  token.address = event.params.tokenAddress
  token.isEligible = event.params.isEligible
  token.metadata = event.params.metadata
  token.createdBlock = event.block.number
  token.save()
}
