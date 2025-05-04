import { elizaLogger } from "@elizaos/core";
import {
    GameState,
    PokerDecision,
    AvailableGamesResponse,
    AvailableGame,
    PlayerState,
    Card,
    WinnerInfo,
    PlayerAction,
} from "./game-state";
import {
    GameEvent,
    PlayerView,
    PokerState,
    ProcessEventError,
    ProcessStateError,
    PlayerEvent,
    SystemEvent,
    Move,
    TableAction,
} from "./schemas";

export class ApiConnector {
    private baseUrl: string;
    private playerId: string | null = null;
    private playerName: string | null = null;
    private apiKey: string | null = null;
    private ws: WebSocket | null = null;
    private messageId = 0;
    private messageCallbacks: Map<number, (data: any) => void> = new Map();
    private stateUpdateCallbacks: ((state: PokerState) => void)[] = [];
    private playerViewCallbacks: ((view: PlayerView) => void)[] = [];
    private connected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(baseUrl: string, apiKey?: string) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey || null;
        elizaLogger.log(
            "EffectApiConnector initialized with base URL:",
            baseUrl
        );
        if (apiKey) {
            elizaLogger.log("EffectApiConnector initialized with API key");
        }
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        if (this.apiKey) {
            headers["x-api-key"] = this.apiKey;
            elizaLogger.debug("Adding API key to request headers");
        } else {
            elizaLogger.warn("No API key available for request");
        }

        elizaLogger.debug("Request headers:", {
            ...headers,
            "x-api-key": this.apiKey ? "[REDACTED]" : "undefined",
        });
        return headers;
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    getPlayerId(): string | null {
        return this.playerId;
    }

    setPlayerId(id: string): void {
        this.playerId = id;
    }

    setPlayerName(name: string): void {
        this.playerName = name;
    }

    // WebSocket connection methods
    connect(): Promise<void> {
        elizaLogger.debug("Connecting to WebSocket");
        return new Promise((resolve, reject) => {
            if (this.ws) {
                if (this.ws.readyState === WebSocket.OPEN) {
                    elizaLogger.debug("WebSocket already connected");
                    resolve();
                    return;
                }
                this.ws.close();
            }

            const wsUrl = this.baseUrl.replace(/^http/, "ws") + "/rpc";
            elizaLogger.log(`Connecting to WebSocket at ${wsUrl}`);
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                elizaLogger.log("WebSocket connection established");
                this.connected = true;
                this.reconnectAttempts = 0;
                resolve();
            };

            this.ws.onmessage = (event) => {
                elizaLogger.debug("Received WebSocket message:", event.data);
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    elizaLogger.error(
                        "Error parsing WebSocket message:",
                        error
                    );
                }
            };

            this.ws.onclose = () => {
                elizaLogger.log("WebSocket connection closed");
                this.connected = false;
                this.attemptReconnect();
            };

            this.ws.onerror = (error) => {
                elizaLogger.error("WebSocket error:", error);
                reject(error);
            };
        });
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            elizaLogger.error("Max reconnection attempts reached");
            return;
        }

        const backoffTime = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            30000
        );
        elizaLogger.log(
            `Attempting to reconnect in ${backoffTime}ms (attempt ${
                this.reconnectAttempts + 1
            }/${this.maxReconnectAttempts})`
        );

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect().catch((error) => {
                elizaLogger.error("Reconnection attempt failed:", error);
            });
        }, backoffTime);
    }

    private handleWebSocketMessage(data: any): void {
        // Handle Effect Exit responses (for specific message callbacks)
        if (
            (data._tag === "Exit" || data._tag === "Defect") &&
            data.requestId
        ) {
            const id = parseInt(data.requestId);
            if (this.messageCallbacks.has(id)) {
                const callback = this.messageCallbacks.get(id);
                if (callback) {
                    callback(data);
                    this.messageCallbacks.delete(id);
                }
                return;
            }
        }

        // Handle state updates
        if (data.type === "stateUpdate") {
            this.stateUpdateCallbacks.forEach((callback) =>
                callback(data.state)
            );
            return;
        }

        // Handle player view updates
        if (data.type === "playerView") {
            this.playerViewCallbacks.forEach((callback) => callback(data.view));
            return;
        }

        elizaLogger.warn("Unhandled message type:", data);
    }

    private sendWebSocketMessage(method: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket is not connected"));
                return;
            }

            const id = this.messageId++;
            const message = {
                _tag: "Request",
                id: id.toString(),
                tag: method,
                payload: payload,
                traceId: "traceId",
                spanId: "spanId",
                sampled: true,
                headers: {},
            };

            // Set up callback for this specific message, receive on onmessage > handleWebSocketMessage
            this.messageCallbacks.set(id, (response) => {
                elizaLogger.debug("Response for message", id, ":", response);
                if (response._tag === "Exit") {
                    if (response.exit._tag === "Success") {
                        resolve(response.exit.value);
                    } else if (response.exit._tag === "Failure") {
                        reject(response.exit.cause);
                    } else {
                        reject(new Error("Unknown exit format"));
                    }
                } else if (response._tag === "Defect") {
                    reject(response.defect);
                } else {
                    reject(new Error("Unknown response format"));
                }
            });

            elizaLogger.debug("Sending WebSocket message:", message);
            this.ws.send(JSON.stringify(message));
        });
    }

    async getAvailableGames(): Promise<AvailableGame[]> {
        try {
            // In the Effect backend, we don't have multiple games
            // We'll return a single game with the current state
            const state = await this.getCurrentState();

            // Check if the game is in a state where it can accept new players
            const canJoinGame = state.status === "WAITING"; // || state.winningPlayerId !== undefined;

            if (!canJoinGame) {
                elizaLogger.info(
                    `Game is in state ${state.status}, cannot join`
                );
                return [];
            }

            // Check if the game is full (more than 9 players)
            // const playerCount = Object.keys(state.players).length;
            // const isGameFull = playerCount >= 9;

            // if (isGameFull) {
            //     elizaLogger.info(`Game is full with ${playerCount} players`);
            //     return [];
            // }

            // elizaLogger.info(`Game is available with ${playerCount} players`);
            return [
                {
                    id: "default",
                    players: Object.values(state.players).map((player) => ({
                        id: player.id,
                        name: player.id, // We don't have names in the new model
                        isReady: state.status !== "PLAYING",
                    })),
                    createdAt: new Date().toISOString(),
                    state: state.status,
                },
            ];
        } catch (error) {
            elizaLogger.error("Error getting available games:", error);
            return [];
        }
    }

    // TODO: Implement logic of multiple tables
    async getGameState(gameId?: string): Promise<GameState> {
        const state = await this.getCurrentState();
        return this.convertPokerStateToGameState(state);
    }

    async joinGame({
        gameId,
        playerName,
    }: {
        gameId?: string;
        playerName: string;
    }): Promise<string> {
        await this.connect();

        const playerId = this.playerId || `player-${Date.now()}`;
        this.setPlayerId(playerId);
        this.setPlayerName(playerName);

        // Send join event
        const event: PlayerEvent = {
            type: "table",
            playerId,
            action: "join",
        };

        await this.processEvent(event);
        return playerId;
    }

    async setPlayerReady(): Promise<void> {
        // In the Effect model, players are ready as soon as they join
        // No need for an explicit ready action
    }

    async leaveGame(gameId: string, playerId: string): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket is not connected");
        }

        const event: PlayerEvent = {
            type: "table",
            playerId,
            action: "leave",
        };

        await this.processEvent(event);
    }

    // async createGame(gameName: string, options: any = {}): Promise<string> {
    //     try {
    //         await this.connect();

    //         // In the Effect model, we don't create games directly
    //         // Instead, we check if the current game is in a state where it can accept new players
    //         const state = await this.getCurrentState();

    //         // Check if the game is in a state where it can accept new players
    //         const canJoinGame = state.status === "WAITING";

    //         if (!canJoinGame) {
    //             elizaLogger.info(
    //                 `Game is in state ${state.status}, cannot join`
    //             );
    //             throw new Error(
    //                 `Game is in state ${state.status}, cannot join`
    //             );
    //         }

    //         // Check if the game is full (more than 9 players)
    //         const playerCount = Object.keys(state.players).length;
    //         const isGameFull = playerCount >= 9;

    //         if (isGameFull) {
    //             elizaLogger.info(`Game is full with ${playerCount} players`);
    //             throw new Error(`Game is full with ${playerCount} players`);
    //         }

    //         elizaLogger.info(`Game is available with ${playerCount} players`);
    //         return "default";
    //     } catch (error) {
    //         elizaLogger.error("Error creating game:", error);
    //         throw error;
    //     }
    // }

    async getAllGames(): Promise<GameState[]> {
        const state = await this.getCurrentState();
        return [this.convertPokerStateToGameState(state)];
    }

    async submitAction({
        gameId,
        playerId,
        decision,
    }: {
        gameId?: string;
        playerId: string;
        decision: PokerDecision;
    }): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket is not connected");
        }

        const move: Move = this.convertDecisionToMove(decision);

        const event: PlayerEvent = {
            type: "move",
            playerId,
            move,
        };

        await this.processEvent(event);
    }

    // Effect-specific methods
    async getCurrentState(): Promise<PokerState> {
        await this.connect();
        return this.sendWebSocketMessage("currentState", {});
    }

    async processEvent(event: GameEvent): Promise<PokerState> {
        await this.connect();
        return this.sendWebSocketMessage("processEvent", { event });
    }

    onStateUpdate(callback: (state: PokerState) => void): void {
        this.stateUpdateCallbacks.push(callback);

        // If this is the first callback, start listening for state updates
        if (this.stateUpdateCallbacks.length === 1) {
            this.startListeningToStateUpdates();
        }
    }

    onPlayerView(callback: (view: PlayerView) => void): void {
        this.playerViewCallbacks.push(callback);

        // If this is the first callback, start listening for player view updates
        if (this.playerViewCallbacks.length === 1) {
            this.startListeningToPlayerView();
        }
    }

    private async startListeningToStateUpdates(): Promise<void> {
        try {
            await this.connect();

            // Send a message to subscribe to state updates
            this.sendWebSocketMessage("stateUpdates", {})
                .then((response) => {
                    // This is a stream, so we'll receive updates over time
                    elizaLogger.log("Subscribed to state updates");
                })
                .catch((error) => {
                    elizaLogger.error(
                        "Error subscribing to state updates:",
                        error
                    );
                });
        } catch (error) {
            elizaLogger.error("Error starting state updates listener:", error);
        }
    }

    private async startListeningToPlayerView(): Promise<void> {
        try {
            await this.connect();

            if (!this.playerId) {
                elizaLogger.error(
                    "Cannot subscribe to player view without a player ID"
                );
                return;
            }

            // Send a message to subscribe to player view updates
            this.sendWebSocketMessage("playerView", { playerId: this.playerId })
                .then((response) => {
                    // This is a stream, so we'll receive updates over time
                    elizaLogger.log("Subscribed to player view updates");
                })
                .catch((error) => {
                    elizaLogger.error(
                        "Error subscribing to player view updates:",
                        error
                    );
                });
        } catch (error) {
            elizaLogger.error("Error starting player view listener:", error);
        }
    }

    // Conversion methods
    convertPokerStateToGameState(state: PokerState): GameState {
        const players: PlayerState[] = Object.values(state.players).map((player) => ({
            id: player.id,
            name: player.id, // We don't have names in the new model
            chips: player.chips,
            isReady: state.status !== "PLAYING",
            currentBet: player.bet.round,
            isFolded: player.status === "FOLDED",
            hand: player.hand.map((card) => ({
                rank: card.rank.toString(),
                suit: card.suit,
            })),
            status: player.status,
        }));

        // const currentPlayer = players[state.currentPlayerIndex];

        // Handle the Option type for winningPlayerId
        let winner: WinnerInfo | undefined = undefined;
        // if (state.winningPlayerId) {
        //     // If it's an Option type, extract the value
        //     const winningId =
        //         typeof state.winningPlayerId === "object" &&
        //         "value" in state.winningPlayerId
        //             ? state.winningPlayerId.value
        //             : state.winningPlayerId;

        //     if (winningId && typeof winningId === "string") {
        //         winner = {
        //             id: winningId,
        //             name: winningId,
        //             winningHand: [], // We don't have this information in the new model
        //             handDescription: "", // We don't have this information in the new model
        //         };
        //     }
        // }

        return {
            players,
            tableStatus: state.status,
            // : state.winningPlayerId
            //     ? "showdown"
            //     : "preflop", // When playing, start with preflop
            pot: state.pot,
            isGameOver: winner !== undefined,
            lastUpdateTime: new Date().toISOString(),
            currentBet: state.bet,
            currentPlayerIndex: state.currentPlayerIndex,
            communityCards: state.community.map((card) => ({
                rank: card.rank.toString(),
                suit: card.suit,
            })),
            winner,
        };
    }

    private convertDecisionToMove(decision: PokerDecision): Move {
        switch (decision.action) {
            case PlayerAction.FOLD:
                return { type: "fold" };
            case PlayerAction.CHECK:
                return { type: "call" }; // same as call in the backend
            case PlayerAction.CALL:
                return { type: "call" };
            case PlayerAction.ALL_IN:
                return { type: "all_in" };
            case PlayerAction.RAISE:
                return {
                    type: "raise",
                    amount: decision.amount || 0,
                };
            default:
                throw new Error(`Unknown decision action: ${decision.action}`);
        }
    }
  
    async getPlayerView(playerId: string): Promise<PlayerView | null> {
        try {
            await this.connect();

            // Send a message to request player view
            elizaLogger.debug(`Requesting player view for player ${playerId}`);
            const response = await this.sendWebSocketMessage("playerView", { playerId });
            elizaLogger.debug(`Response player view ${JSON.stringify(response)}`);
            return response;
        } catch (error) {
            elizaLogger.error("Error requesting player view:", error);
            throw error;
        }
    }
}
