import { TableStatus } from "./schemas";

export enum PlayerAction {
    FOLD = "FOLD",
    CHECK = "CHECK",
    CALL = "CALL",
    RAISE = "RAISE",
    ALL_IN = "ALL_IN",
}

export interface PokerDecision {
    action: PlayerAction;
    amount?: number;
}

export interface Card {
    suit: string;
    rank: string;
}

export interface PlayerState {
    id: string;
    name: string;
    chips: number;
    isReady: boolean;
    currentBet: number;
    isFolded: boolean;
    hand?: Card[];
}

export interface WinnerInfo {
    id: string;
    name: string;
    winningHand: Card[];
    handDescription: string;
}

export interface GameState {
    // id: string;
    players: PlayerState[];
    tableStatus: TableStatus;
    // gameState: "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
    pot: number;
    isGameOver: boolean;
    lastUpdateTime: string;
    currentBet: number;
    lastAction?: string;
    lastRaiseAmount?: number;
    currentPlayerIndex?: number;
    communityCards: Card[];
    roundHistory?: string[];
    winner?: WinnerInfo;
    finalHands?: Array<PlayerState & { hand: Card[] }>;
    finalCommunityCards?: Card[];
    finalPot?: number;
}

export interface AvailableGame {
    id: string;
    players: Array<{
        id?: string;
        name: string;
        isReady: boolean;
    }>;
    createdAt: string;
    state?: string;
    playersNeeded?: number;
}

export interface AvailableGamesResponse {
    games: AvailableGame[];
    maxGames: number;
    currentGames: number;
    canCreateNew: boolean;
}
