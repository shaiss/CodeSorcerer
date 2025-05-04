import { Console, Effect, pipe, Queue, Ref, Sink } from "effect";
import  * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import { POKER_ROOM_DEFAULT_STATE } from "./state_machine";
import { currentPlayer, playerView } from "./queries";
import { addPlayer, processPlayerMove, removePlayer, startRound, transition  } from "./transitions";
import type { GameEvent, PlayerView, PokerState, ProcessEventError, ProcessStateError, SystemEvent } from "./schemas";

export interface PokerGameService {
  readonly currentState: () => Effect.Effect<PokerState, never, never>

  readonly processEvent: (event: GameEvent) => Effect.Effect<PokerState, ProcessEventError, never>

  readonly playerView: (playerId: string) => Effect.Effect<
      PlayerView,
      ProcessEventError | ProcessStateError,
      never
  >

  readonly stateUpdates: Stream.Stream<
      PokerState,
      ProcessEventError | ProcessStateError,
      never
  >
}

function computeNextState(
    state: PokerState,
    event: GameEvent,
): Effect.Effect<PokerState, ProcessEventError, never> {
    switch (event.type) {
        case 'table': {
            if (state.status === 'PLAYING') {
                return Effect.fail<ProcessEventError>({ type: 'table_locked' })
            }
            switch (event.action) {
                case 'join': return Effect.succeed(addPlayer(state, event.playerId))
                case 'leave': return Effect.succeed(removePlayer(state, event.playerId))
            }
        }
        case 'move': {
            if (event.playerId !== currentPlayer(state).id) {
                return Effect.fail<ProcessEventError>({ type: 'not_your_turn' })
            }
            return processPlayerMove(state, event.move)
        }
        case 'start': {
            // console.log('computeNextState', { event })
            const next = startRound(state)
            return Effect.succeed(next)
            // TODO: sanity check for status?
            // return Effect.succeed(startRound(state))
        }
        case 'transition_phase': {
            return transition(state)
        }
    }
}

// TODO: the point of having system events is that we could add debounce or throttling
// before emitting them, but maybe all of that should just be emulated on the frontend.
// TODO: make minPlayers part of the Effect's context? (i.e. dependency)
function processState(state: PokerState, minPlayers: number): Effect.Effect<Option.Option<SystemEvent>, ProcessStateError> {
    if (state.status === "WAITING" && state.players.length >= minPlayers) {
        // TODO: add debounce here somehow
        // actually we can't add the debounce here because that would just stall
        // everything and not actually allow anyone else to join the table
        // the correct way is to make this system event trigger a fork which will
        // wait for a certain amount of time and then emit the new state, tricky though
        return Effect.succeed(Option.some({ type: 'start' }))
    }
    return Effect.succeed(Option.none())
}

export const makePokerRoom = (minPlayers: number): Effect.Effect<PokerGameService, never, never> => Effect.gen(function* (_adapter) {
    const stateRef = yield* Ref.make(POKER_ROOM_DEFAULT_STATE)
    const stateUpdateQueue = yield* Queue.unbounded<PokerState>()
    const stateStream = Stream.fromQueue(stateUpdateQueue).pipe(
        Stream.tap(s => Console.log('state stream received update'))
    )

    const currentState = () => Ref.get(stateRef)

    const processEvent = (event: GameEvent): Effect.Effect<PokerState, ProcessEventError, never> => {
        return pipe(
            currentState(),
            Effect.tap(({ deck, ...state }) => Console.debug('processano', { event, state })),
            Effect.flatMap(state => computeNextState(state, event)),
            // Effect.tap(({ deck, ...state }) => Console.log('post-processing', { event, state })),
            Effect.tap(state => Ref.set(stateRef, state)),
            // FIXME: I have no clue why the point-free version
            // doesn't work here; create an issue on effect-ts
            Effect.tap(state => stateUpdateQueue.offer(state)),
        )
    }

    const stateProcessingStream: Stream.Stream<
        PokerState,
        ProcessStateError | ProcessEventError
    > = pipe(
        stateStream,
        Stream.mapEffect(state => pipe(
            processState(state, minPlayers),
            Effect.flatMap(Option.match({
                onNone: () => Effect.succeed(state),
                onSome: event => {
                    const next = processEvent(event)
                    // console.log('onSome process state', { state, event })
                    return next
                },
            }),
            ))),
        Stream.tap(({ deck, ...s }) => Console.log('after processing', { s })),
        Stream.tapError(Console.error),
    );

    // return this or put in a context somehow
    const _systemFiber = pipe(
        stateProcessingStream,
        // Stream.tap(qlqrcoisa => Console.log({ qlqrcoisa })),
        Stream.run(Sink.drain),
        Effect.runFork,
    )

    return {
        currentState,
        processEvent,
        playerView: playerId => pipe(
            currentState(),
            Effect.map(state => playerView(state, playerId))
        ),
        // playerView: playerId => pipe(
        //     stateProcessingStream,
        //     Stream.tap(({ deck, ...state }) => Console.log('[playerView]', { state })),
        //     Stream.map(state => playerView(state, playerId)),
        //     Stream.tap(pv => Console.log('[playerView]', { pv }))
        // ),
        stateUpdates: stateProcessingStream,
    }
})
