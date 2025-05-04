import { Rpc, RpcGroup } from "@effect/rpc";
import { Console, Effect, Schema, Stream } from "effect";
import { makePokerRoom } from "poker-state-machine";
import {
  ProcessingStateStreamErrorsSchema,
  GameEventSchema,
  PlayerViewSchema,
  PokerStateSchema,
  ProcessEventErrorSchema,
} from "poker-state-machine";

export class PokerRpc extends RpcGroup.make(
  Rpc.make("currentState", {
    success: PokerStateSchema,
  }),
  Rpc.make("processEvent", {
    success: PokerStateSchema,
    error: ProcessEventErrorSchema,
    payload: { event: GameEventSchema },
  }),
  Rpc.make("playerView", {
    success: PlayerViewSchema,
    error: ProcessingStateStreamErrorsSchema,
    payload: { playerId: Schema.String },
    // stream: true
  }),
  Rpc.make("stateUpdates", {
    success: PokerStateSchema,
    error: ProcessingStateStreamErrorsSchema,
    stream: true,
  })
) {}

export const PokerRpcLive = PokerRpc.toLayer(
  Effect.gen(function* () {
    // TODO: convert poker room to an Effect.Service and provide it
    const ROOM = yield* makePokerRoom(2);

    return {
      currentState: (_payload, _headers) => {
        return ROOM.currentState();
      },
      processEvent: (payload, _headers) => {
        return ROOM.processEvent(payload.event);
      },
      playerView: (payload, _headers) => {
        return ROOM.playerView(payload.playerId);
      },
      stateUpdates: (_payload, _headers) => {
        return ROOM.stateUpdates.pipe(
          Stream.tap(() => Console.log("state updates"))
        );
      },
    };
  })
);
