import { expect, test } from "bun:test";
import {
  PLAYER_DEFAULT_STATE,
  POKER_ROOM_DEFAULT_STATE,
} from "./state_machine";
import { bigBlind, currentPlayer, firstPlayerIndex, smallBlind } from "./queries";
import { BIG_BLIND, SMALL_BLIND } from "./transitions";
import { makePokerRoom } from "./room";
import { Effect } from "effect";
import type { GameEvent, PlayerState, PokerState } from "./schemas";

type Handless = Omit<PlayerState, 'hand'>

type Deckless = Omit<{
  [K in keyof PokerState]: K extends 'players'
    ? readonly Handless[]
    : PokerState[K]
}, 'deck'>

function handless(players: PlayerState[] | readonly Handless[]): Handless[] {
  // @ts-expect-error
  return Object.fromEntries(Object.entries(players).map(([id, { hand, ...player }]) => [id, player]))
}

// @ts-expect-error
function deckless({ deck, ...state }: PokerState | Deckless): Deckless {
  return {
    ...state,
    players: handless(state.players),
  }
}

// TODO: make the players field be a diff as well (so we don't have to `...states[1].players[id]`)
function expectStateDiff(states: PokerState[], diff: Partial<PokerState | Deckless>) {
  expect(deckless(states[0])).toEqual(deckless({ ...states[1], ...diff }))
}

type PokerRoomTestCase = {
    description: string
    minPlayers: number
    transitions: {
        event: GameEvent,
        diff: (previous: PokerState, current: PokerState) => Partial<PokerState | Deckless>,
        asserts?: (previous: PokerState, current: PokerState) => void
    }[]
}

const IDS = ['ID0', 'ID1'] as const

const testTable: PokerRoomTestCase[] = [
    {
        description: "complete game with two players",
        minPlayers: 2,
        transitions: [
            // player 0 joins
            {
                event: {
                    type: 'table',
                    action: 'join',
                    playerId: IDS[0]
                },
                diff: () => ({
                  players: [
                      {
                        ...PLAYER_DEFAULT_STATE,
                        id: IDS[0],
                      },
                    ]
                })
            },
            // player 1 joins
            {
                event: {
                    type: 'table',
                    action: 'join',
                    playerId: IDS[1]
                },
                diff: () => ({
                    status: 'PLAYING',
                    pot: SMALL_BLIND + BIG_BLIND,
                    bet: BIG_BLIND,
                    dealerIndex: 0,
                    // first  = dealer    & small blind & first player pre-flop
                    // second =             big blind   & first player post-flop
                    currentPlayerIndex: 0,
                    players: [
                        {
                            id: IDS[0],
                            status: 'PLAYING',
                            chips: 100 - SMALL_BLIND,
                            bet: { round: SMALL_BLIND, total: SMALL_BLIND }
                        },
                        {
                            id: IDS[1],
                            status: 'PLAYING',
                            chips: 100 - BIG_BLIND,
                            bet: { round: BIG_BLIND, total: BIG_BLIND }
                        },
                    ],
                }),
                asserts: (_previous, current) => {
                    expect(Object.values(current.players).map(p => p.hand.length)).toEqual([2, 2])
                    expect(smallBlind(current).id).toEqual(IDS[0]);
                    // TODO: recreate query and add reenable assertion
                    // expect(dealer(current).id).toEqual(IDS[0]);
                    expect(bigBlind(current).id).toEqual(IDS[1]);
                    expect(firstPlayerIndex(current)).toBe(0)
                    expect(currentPlayer(current).id).toBe(IDS[0])
                }
            },
            // player 0 starts preflop and calls, player 1 to play
            {
                event: {
                    type: 'move',
                    playerId: IDS[0],
                    move: { type: 'call' }
                },
                diff: previous => ({
                  currentPlayerIndex: 1,
                  pot: previous.pot + (BIG_BLIND - SMALL_BLIND),
                  players: [
                    {
                      ...previous.players[0],
                      chips: 100 - BIG_BLIND,
                      bet: { round: BIG_BLIND, total: BIG_BLIND }
                    },
                    previous.players[1],
                  ],
                })
            },
            // player 1 raises, player 0 to play
            {
                event: {
                    type: 'move',
                    playerId: IDS[1],
                    move: { type: "raise", amount: 30 }
                },
                diff: previous => ({
                    pot: previous.pot + (30 - BIG_BLIND),
                    bet: 30,
                    currentPlayerIndex: 0,
                    players: [
                      previous.players[0],
                      {
                        ...previous.players[1],
                        chips: 70,
                        bet: { round: 30, total: 30 }
                      },
                    ]
                })
            },
            // player 0 calls, player 1 to play
            {
                event: {
                    type: 'move',
                    playerId: IDS[0],
                    move: { type: 'call' }
                },
                diff: previous => ({
                    pot: previous.pot + (30 - BIG_BLIND),
                    bet: 30,
                    currentPlayerIndex: 1,
                    players: [
                      {
                        ...previous.players[0],
                        chips: 70,
                        bet: { round: 30, total: 30 }
                      },
                      previous.players[1],
                    ],
                })
            },
            // player 1 calls which triggers flop
            // post-flop with 2 players has inverted order
            // so player 1 plays again
            {
                event: {
                    type: 'move',
                    playerId: IDS[1],
                    move: { type: 'call' }
                },
                diff: (previous, current) => ({
                    bet: 0,
                    community: current.community,
                    currentPlayerIndex: 0,
                    players: [
                      {
                        ...previous.players[0],
                        chips: 70,
                        bet: { round: 0, total: 30 }
                      },
                      {
                        ...previous.players[1],
                        chips: 70,
                        bet: { round: 0, total: 30 }
                      },
                    ]
                }),
                asserts: (_previous, current) => {
                    expect(current.deck).toHaveLength(44);
                    expect(current.community).toHaveLength(3);
                    expect(firstPlayerIndex(current)).toBe(1);
                    expect(currentPlayer(current).id).toBe(IDS[1]);
                }
            },
            // player 1 calls, player 0 to play
            {
                event: {
                    type: 'move',
                    playerId: IDS[1],
                    move: { type: 'call' }
                },
                diff: () => ({ currentPlayerIndex: 1 }),
                asserts: (_previous, current) => {
                    expect(current.deck).toHaveLength(44);
                    expect(current.community).toHaveLength(3);
                    expect(currentPlayer(current).id).toBe(IDS[0]);
                }
            },
            // player 0 calls, which triggers turn, player 1 plays
            {
                event: {
                    type: 'move',
                    playerId: IDS[0],
                    move: { type: 'call' }
                },
                diff: (_previous, current) => ({
                    bet: 0,
                    // TODO: we could assert these come from the top of previous state's deck?
                    community: current.community,
                    currentPlayerIndex: 0
                }),
                asserts: (_previous, current) => {
                    expect(current.deck).toHaveLength(42);
                    expect(current.community).toHaveLength(4);
                    expect(currentPlayer(current).id).toBe(IDS[1]);
                }
            },
            // player 1 calls, player 0 to play
            {
                event: {
                    type: 'move',
                    playerId: IDS[1],
                    move: { type: 'call' }
                },
                diff: () => ({ currentPlayerIndex: 1 }),
                asserts: (_previous, current) => {
                    expect(currentPlayer(current).id).toBe(IDS[0]);
                }
            },
            // player 0 calls, triggers river, player 1 to play
            {
                event: {
                    type: 'move',
                    playerId: IDS[0],
                    move: { type: 'call' }
                },
                diff: (_previous, current) => ({
                    community: current.community,
                    currentPlayerIndex: 0,
                }),
                asserts: (_previous, current) => {
                    expect(current.deck).toHaveLength(40);
                    expect(current.community).toHaveLength(5);
                    expect(currentPlayer(current).id).toBe(IDS[1]);
                }
            },
            // player 1 raises, player 0 to play
            {
                event: {
                    type: 'move',
                    playerId: IDS[1],
                    move: { type: 'raise', amount: 40 }
                },
                diff: previous => ({
                    pot: 100,
                    bet: 40,
                    players: [
                        ...previous.players,
                        {
                            ...previous.players[1],
                            chips: 30,
                            bet: { round: 40, total: 70 }
                        }
                    ],
                    currentPlayerIndex: 1,
                }),
                asserts: (_previous, current) => {
                    expect(currentPlayer(current).id).toBe(IDS[0]);
                }
            },
            // player 0 folds, player 1 wins
            {
                event: {
                    type: 'move',
                    playerId: IDS[0],
                    move: { type: 'fold' }
                },
                diff: previous => ({
                    status: 'ROUND_OVER',
                    players: [
                        {
                            ...previous.players[0],
                            status: 'FOLDED'
                        },
                        {
                            ...previous.players[1],
                            chips: previous.players[1].chips + previous.pot
                        }
                    ]
                })
            }
        ]
    }
]

for (const testCase of testTable) {
    test(testCase.description, async function() {
        await Effect.runPromise(Effect.gen(function*() {
            const pokerRoom = yield* makePokerRoom(testCase.minPlayers)
            const states = [yield* pokerRoom.currentState()]
            expect(states[0]).toEqual(POKER_ROOM_DEFAULT_STATE);

            for (const transition of testCase.transitions) {
                const result = pokerRoom.processEvent(transition.event)
                console.log({ isFailure: yield* Effect.isFailure(result) })
                yield* result
                states.unshift(yield* pokerRoom.currentState())
                expectStateDiff(states, transition.diff(states[1], states[0]))
                transition.asserts?.(states[1], states[0])
            }
        }))
    })
}
