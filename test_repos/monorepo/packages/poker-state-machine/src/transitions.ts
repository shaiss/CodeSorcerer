/*
    transitions: functions that operate on the current poker state to return the next one.
 */
import { Effect, Iterable, pipe, Schema } from "effect"
import { determineWinningPlayers, getShuffledDeck, type RiverCommunity } from "./poker"
import { bigBlind, findDealerIndex, firstPlayerIndex, rotated, roundRotation, smallBlind } from "./queries"
import type { Card, Move, PlayerState, PokerState, StateMachineError } from "./schemas"
import { PLAYER_DEFAULT_STATE } from "./state_machine"
import { commit } from "effect/STM"


export const SMALL_BLIND = 10
export const BIG_BLIND = 20

// precondition: waiting for players | finished previous round
export function addPlayer(state: PokerState, playerId: string): PokerState {
  return {
    ...state,
    players: [
        ...state.players,
        {
            ...PLAYER_DEFAULT_STATE,
            id: playerId
        }
    ]
  }
}

// TEST: consider what happens when you remove the player supposed to be the dealer
// precondition: waiting for players | finished previous round
export function removePlayer(state: PokerState, playerId: string): PokerState {
    const removeIndex = state.players.findIndex(p => p.id === playerId)
    const newIndex = state.currentPlayerIndex <= removeIndex
        ? state.currentPlayerIndex
        : state.currentPlayerIndex - 1

    const players = state.players.filter((_, index) => index !== removeIndex)

    return {
        ...state,
        players,
        currentPlayerIndex: newIndex
    }
}

// precondition: waiting for players | finished previous round
export function dealCards(state: PokerState): PokerState {
    const deck = getShuffledDeck()
    const dealtCards = deck.splice(0, 2 * state.players.length)

    return {
        ...state,
        status: 'PLAYING',
        deck,
        community: [],
        players: state.players.map((p, i) => ({
            ...p,
            hand: dealtCards.slice(2 * i, 2 * i + 2) as [Card, Card],
            status: "PLAYING",
        }))
    }
}

// precondition: waiting for players | finished previous round
export function rotateBlinds(state: PokerState): PokerState {
    const dealerIndex = findDealerIndex(state)
    const nextDealerIndex = (dealerIndex + 1) % state.players.length
    const nextDealerId = state.players[nextDealerIndex].id
    const next = {
        ...state,
        dealerId: nextDealerId,
    }
    return {
        ...next,
        currentPlayerIndex: firstPlayerIndex(next)
    }
}

export type StateTransition = (state: PokerState) => PokerState

// precondition: cards are dealt
export const collectBlinds: StateTransition = state => {
    const bigBlindId = bigBlind(state).id;
    const smallBlindId = smallBlind(state).id;
    return pipe(
        state,
        (state: PokerState) => playerBet(state, smallBlindId, SMALL_BLIND),
        (state: PokerState) => playerBet(state, bigBlindId, BIG_BLIND),
    )
}

export const startRound: StateTransition = (state: PokerState) => pipe(
    state,
    dealCards,
    rotateBlinds,
    collectBlinds,
)

function playerBet(state: PokerState, playerId: string, amount: number): PokerState {
    const player = state.players.find(p => p.id === playerId)!
    const diff = Math.min(amount - player.bet.round, player.chips)
    const bet = {
        round: player.bet.round + diff,
        total: player.bet.total + diff,
    }
    const remaining = player.chips - diff
    const raised = amount > state.bet

    return {
        ...state,
        pot: state.pot + diff,
        bet: Math.max(state.bet, bet.round),
        players: state.players.map(p => p.id !== playerId ? p : {
            ...p,
            bet,
            chips: remaining,
            status: remaining === 0 ? 'ALL_IN' : 'PLAYING'
        })
    }
}

// README: note that the Move type doesn't include playerId, that's validated on the
// event-processing layer, where a MoveEvent can only be processed if it's from the
// currentPlayer
export function processPlayerMove(state: PokerState, move: Move): Effect.Effect<PokerState, StateMachineError> {
    const player = state.players[state.currentPlayerIndex]
    const playerId = player.id;

    let nextState = structuredClone(state);
    switch (move.type) {
        case "fold": {
            // TODO: check if the player already has enough bet
            nextState = {
                ...state,
                players: state.players.map(p => p.id !== playerId ? p : { ...p, status: 'FOLDED' })
            }
            break;
        }

        case "call": {
            nextState = playerBet(nextState, playerId, state.bet)
            break;
        }

        // TODO: on raise we should validate amount of chips and return an error if the player
        // has insufficient chips
        case "raise": {
            nextState = playerBet(nextState, playerId, move.amount)
            break;
        }

        case 'all_in': {
            nextState = playerBet(nextState, playerId, player.chips)
        }
    }

    return transition(nextState)
}

// TEST: test-case for allowing blinds to raise (especially big blind, which's already called)
export function transition(state: PokerState): Effect.Effect<PokerState, StateMachineError> {
    const players = roundRotation(state)
    const isLastPlayer = state.currentPlayerIndex >= players.findLastIndex(p => p.status === "PLAYING")
    const allCalled = state.bet !== 0 && state.players.every(p => (
           p.status    === "FOLDED"
        || p.status    === "ALL_IN"
        || p.bet.round === state.bet
    ))
    const allChecked = state.bet === 0 && isLastPlayer
    const playersLeft = state.players.filter(p => p.status === "PLAYING")

    if (playersLeft.length <= 1) return showdown(state)
    if (allCalled || allChecked) return nextPhase(state)

    // shift bet rotation
    return Effect.succeed({
        ...state,
        currentPlayerIndex: isLastPlayer
            ? players.findIndex(p => p.status === 'PLAYING')
            : players.findIndex((p, i) => p.status === 'PLAYING' && state.currentPlayerIndex < i)
    })
}

// precondition: betting round is over
export function nextPhase(state: PokerState): Effect.Effect<PokerState, StateMachineError> {
    const communityCards = state.community.length
    if (communityCards === 5) return showdown(state)

    const toBeDealt = ({ 0: 3, 3: 1, 4: 1 })[state.community.length]!
    const deckCards = state.deck.length
    const community = state.deck.slice(deckCards - toBeDealt, deckCards)
    const deck = state.deck.slice(0, deckCards - toBeDealt)

    const nextState: PokerState = {
        ...state,
        deck,
        community,
        bet: 0,
        players: state.players.map(p => ({
            ...p,
            bet: {
                total: p.bet.total,
                round: 0,
            },
        }))
    }

    return Effect.succeed({
        ...nextState,
        currentPlayerIndex: firstPlayerIndex(nextState)
    })
}

// precondition: players are sorted by bet total
// returns the bet size for each pot
const getPotBets = (players: PlayerState[]) => pipe(
    players,
    Iterable.map(p => p.bet.total),
    Iterable.dedupeAdjacent,
    Iterable.reduce<number[], number>([], (ps, p) => [...ps, p])
)

// precondition: potBets is sorted
// returns the amount each player has at stake on each pot
const calculatePots = (potBets: number[], players: PlayerState[]): Map<number, number> => {
    const pots = new Map<number, number>()
    for (const player of players) {
        let remaining = player.bet.total;
        for (const potBet of potBets) {
            const amount = Math.min(remaining, potBet)
            remaining -= amount
            const pot = pots.get(potBet)!
            pots.set(potBet, pot + amount)
        }
    }
    return pots
}

function determinePotWinner(
    potBet: number,
    players: PlayerState[],
    community: RiverCommunity,
): string[] {
    const potPlayers = players.filter(p => p.bet.total >= potBet)
    return determineWinningPlayers(players, community)
}

// TEST: test-case for when there's only 1 pot but 2 all-in players in it
// precondition: all players which are not folded or all-in have the same bet total
// precondition: either there's only one player left which hasn't folded or gone all-in
// or we are already at river
export function showdown(state: PokerState): Effect.Effect<PokerState, StateMachineError> {
    // fast-forward to river before checking hands and pots
    if (state.community.length < 5) return pipe(
        state,
        nextPhase,
        Effect.flatMap(showdown)
    )

    const allPlayers = state.players.toSorted((a, b) => a.bet.total - b.bet.total)
    const inPlayers = allPlayers.filter(p => p.status !== 'FOLDED')
    // TODO: better name for this status
    const playingPlayers = inPlayers.filter(p => p.status === 'PLAYING')

    // TODO: abstract this into a more general showdown state assertion function
    const playingPotBets = getPotBets(playingPlayers)
    if (playingPotBets.length !== 1) {
        return Effect.fail({
            type: 'inconsistent_state',
            message: "Inconsistent State Error: there's more than one pot for non all-in players."
        })
    }

    const potBets = getPotBets(inPlayers)
    const pots = calculatePots(potBets, inPlayers)

    const rewards: Map<string, number> = new Map()
    for (const [bet, pot] of pots) {
        const winnerIds = determinePotWinner(bet, inPlayers, state.community as RiverCommunity)
        // TODO: usually pots are even and ties are 2-ways, but it could be a 3-way tie
        // so we also have to do a remainder distribution to the player closest to the
        // dealer
        for (const winnerId of winnerIds) {
            const current = rewards.get(winnerId) ?? 0
            const reward = Math.floor(pot / winnerIds.length)
            rewards.set(winnerId, current + reward)
        }
    }

    // TODO: consider what to do with other fields (i.e. pot)
    return Effect.succeed({
        ...state,
        status: 'ROUND_OVER',
        players: state.players.map(p => ({
            ...p,
            chips: p.chips + (rewards.get(p.id) ?? 0)
        }))
    })
}
