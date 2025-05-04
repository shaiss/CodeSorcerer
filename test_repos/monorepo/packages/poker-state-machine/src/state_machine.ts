import { type PlayerState, type PokerState } from "./schemas";

export const POKER_ROOM_DEFAULT_STATE: PokerState = {
  status: "WAITING",
  players: [],
  deck: [],
  community: [],
  pot: 0,
  bet: 0,
  // FIXME: both of these are bad default values, refactor later
  dealerId: '',
  currentPlayerIndex: -1,
};

export const PLAYER_DEFAULT_STATE: Omit<PlayerState, "id"> = {
  status: "PLAYING",
  hand: [],
  chips: 100,
  bet: { round: 0, total: 0 },
};
