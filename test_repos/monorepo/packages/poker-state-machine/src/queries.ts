/*
    queries: functions that map the poker state data structure to a workable format
 */
import { Option } from "effect"
import type { PlayerState, PlayerView, PokerState } from "./schemas"

export const findDealerIndex = (state: PokerState): number => state.players.findIndex(p => p.id === state.dealerId)

export function firstPlayerIndex(state: PokerState): number {
  const players = state.players.length
  const preflop = state.community.length === 0
  const dealerIndex = findDealerIndex(state)
  return players === 2 && preflop
    ? dealerIndex
    : (dealerIndex + 3) % players
}

export function rotated<T>(array: readonly T[], count: number): readonly T[] {
  return array.map((_, i, array) => array[(i + count) % array.length])
}

export function roundRotation(state: PokerState): readonly PlayerState[] {
    return rotated(state.players, state.players.length - firstPlayerIndex(state))
}

export const currentPlayer = (state: PokerState) => state.players[state.currentPlayerIndex]

export const bigBlind = (state: PokerState) => state.players[(findDealerIndex(state) + 1) % state.players.length]

export const smallBlind = (state: PokerState) => state.players[(findDealerIndex(state) + 2) % state.players.length]

export const playerView = (state: PokerState, playerId: string): PlayerView => {
    const player = state.players.find(p => p.id === playerId)!
    return {
        hand: player.hand ?? [],
        community: state.community,
        tableStatus: state.status,
        dealerId: state.dealerId,
        bigBlindId: Option.fromNullable(bigBlind(state)?.id),
        smallBlindId: Option.fromNullable(smallBlind(state)?.id),
        currentPlayerId: Option.fromNullable(currentPlayer(state)?.id),
        // winningPlayerId: state.winningPlayerId,
        pot: state.pot,
        bet: state.bet,
        player,
        opponents: state.players.filter(p => p.id !== playerId).map(({ status, chips, bet }) => ({ status, chips, bet }) )
    }
}
