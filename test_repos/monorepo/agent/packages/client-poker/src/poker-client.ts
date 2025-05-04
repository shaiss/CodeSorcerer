import {
    Client,
    IAgentRuntime,
    ModelClass,
    UUID,
    elizaLogger,
    generateText,
} from "@elizaos/core";
import { GameState, PlayerAction, PokerDecision, Card } from "./game-state";
import { ApiConnector } from "./api-connector";
import { PokerState, PlayerView, GameEvent } from "./schemas";

export interface PokerClientConfig {
    apiBaseUrl?: string;
    apiKey?: string; // Make API key required in config
}

// Extended character interface to include settings
interface ExtendedCharacter {
    name: string;
    id?: string;
    settings?: {
        secrets?: {
            POKER_API_KEY?: string;
        };
    };
}

export class PokerClient implements Client {
    name = "poker"; // Identifier for the Eliza system
    private runtime: IAgentRuntime | null = null;
    private apiConnector: ApiConnector;
    private gameState: GameState | null = null;
    private gameId: string | null = null;
    private playerId: string | null = null;
    private playerName: string | null = null; // Add player name storage
    private intervalId: NodeJS.Timeout | null = null;
    private resetFailedCount = 0;
    private lastJoinAttempt = 0;
    private joinBackoffMs = 5000; // Start with 5 second backoff
    private playerReadySet = false; // Flag to track if we've already set the player ready
    private isConnected = false;
    private playerViewPollingInterval: NodeJS.Timeout | null = null;
    private playerViewPollingIntervalMs = 10000; // Increase to 10 seconds
    private isSendingMessage = false;
    private lastPollTime = 0;
    private minPollInterval = 5000; // Minimum time between polls in milliseconds

    constructor(config: PokerClientConfig) {
        // if (!config.apiKey) {
        //     elizaLogger.error("API key is required to create PokerClient");
        //     throw new Error(
        //         "POKER_API_KEY is required in PokerClient configuration"
        //     );
        // }

        // Check for environment variable first, then config, then default
        const apiBaseUrl =
            process.env.POKER_API_URL ||
            config.apiBaseUrl ||
            "http://localhost:3001";

        // Initialize API connector with both URL and API key
        this.apiConnector = new ApiConnector(apiBaseUrl, config.apiKey);
        elizaLogger.info("Poker client created with API endpoint:", apiBaseUrl);
        // elizaLogger.debug("API key configured:", {
        //     apiKeyLength: config.apiKey.length,
        // });
    }

    async start(runtime?: IAgentRuntime): Promise<any> {
        if (!runtime) {
            throw new Error("Runtime is required for PokerClient");
        }

        // Cast the runtime to our extended type
        this.runtime = runtime;
        this.playerName = this.runtime.character.name || "ElizaPokerBot"; // Store player name

        // Log configuration for debugging
        elizaLogger.debug("PokerClient configuration:", {
            apiUrl: this.apiConnector.getBaseUrl(),
            agentName: this.playerName,
        });

        // Connect to WebSocket
        try {
            await this.apiConnector.connect();
            this.isConnected = true;
            elizaLogger.info("Connected to poker server WebSocket");

            // Set up state update listeners
            this.apiConnector.onStateUpdate((state: PokerState) => {
                this.handlePokerStateUpdate(state);
            });

            // Removed player view listener setup from here
            // It will be set up after a successful game join
        } catch (error) {
            elizaLogger.error("Failed to connect to poker server:", error);
        }

        // I think that we will not need because of the websocket listener
        // Start polling to check game state or find available games
        this.intervalId = setInterval(async () => {
            try {
                // If not in a game, try to find and join one
                // if (!this.gameId) {
                //     const now = Date.now();
                //     // Only attempt to join if enough time has passed since last attempt
                //     if (now - this.lastJoinAttempt >= this.joinBackoffMs) {
                //         this.lastJoinAttempt = now;

                //         // Check if already in a game or try to enter a new one
                //         await this.checkAndConnectToExistingGame();
                //     }
                // }

                // I think that we will not need because of the websocket listener
                // If in a game, check for game state updates
                if (this.isConnected) {
                    try {
                        const gameState =
                            await this.apiConnector.getGameState();
                        await this.handleGameUpdate(gameState);
                    } catch (error) {
                        elizaLogger.error("Error getting game state:", error);
                        // On error, reset the game connection after a few tries
                        this.resetFailedCount =
                            (this.resetFailedCount || 0) + 1;
                        if (this.resetFailedCount > 5) {
                            elizaLogger.info(
                                "Too many failures, resetting connection"
                            );
                            this.resetGame();
                        }
                    }
                }
            } catch (error) {
                elizaLogger.error("Error in poker client polling:", error);
            }
        }, 5000);

        return this;
    }

    private handlePokerStateUpdate(state: PokerState): void {
        try {
            elizaLogger.info("Received poker state update");
            const gameState = this.apiConnector.convertPokerStateToGameState(state);
            this.handleGameUpdate(gameState);
        } catch (error) {
            elizaLogger.error("Error handling poker state update:", error);
        }
    }

    private async handlePlayerViewUpdate(view: PlayerView): Promise<void> {
        try {
            // Skip processing if we're currently sending a message
            if (this.isSendingMessage) {
                elizaLogger.debug("Skipping player view update processing while sending message", {
                    isSendingMessage: this.isSendingMessage
                });
                return;
            }

            elizaLogger.info("Received player view update");
            // Update our player ID if needed
            if (view.player && view.player.id && this.playerId !== view.player.id) {
                this.playerId = view.player.id;
                elizaLogger.info(`Updated player ID to ${this.playerId}`);
            }

            // If we have a game state, update it with the player view information
            if (this.gameState) {
                // Update our player's hand
                const ourPlayer = this.gameState.players.find(p => p.id === this.playerId);
                if (ourPlayer) {
                    ourPlayer.hand = view.hand.map(card => ({
                        rank: card.rank.toString(),
                        suit: card.suit
                    }));
                }

                // Update community cards
                this.gameState.communityCards = view.community.map(card => ({
                    rank: card.rank.toString(),
                    suit: card.suit
                }));

                // Update pot and bet
                this.gameState.pot = view.pot;
                this.gameState.currentBet = view.bet;

                // Update opponents
                if (view.opponents) {
                    Object.entries(view.opponents).forEach(([id, opponent]) => {
                        const player = this.gameState!.players.find(p => p.id === id);
                        if (player) {
                            player.chips = opponent.chips;
                            player.currentBet = opponent.bet.round;
                            player.isFolded = opponent.status === "FOLDED";
                        }
                    });
                }

                // Check if it's our turn
                const isOurTurn = view.currentPlayerId &&
                    (typeof view.currentPlayerId === 'object' && 'value' in view.currentPlayerId
                        ? view.currentPlayerId.value === this.playerId
                        : typeof view.currentPlayerId === 'string' && view.currentPlayerId === this.playerId);

                if (isOurTurn) {
                    // Set flag before sending
                    this.isSendingMessage = true;

                    elizaLogger.info("It's our turn, making a decision");
                    let decision = await this.makeDecision(this.gameState);
                    elizaLogger.info(
                        `Decision made: ${decision.action}`,
                        decision
                    );

                    // Submit the action to the server
                    if (this.playerId) {
                        // gameid is not set in the game state yet
                        elizaLogger.debug("Submitting action:", {
                            playerId: this.playerId,
                            decision,
                        });

                        elizaLogger.debug("Setting isSendingMessage to true");

                        try {
                            elizaLogger.debug("Sending action to server");
                            await this.apiConnector.submitAction({
                                playerId: this.playerId,
                                decision,
                            });
                            elizaLogger.debug("Action sent successfully");
                        } catch (error) {
                            elizaLogger.error(
                                "Error submitting action:",
                                error
                            );
                        } finally {
                            this.isSendingMessage = false;
                            elizaLogger.debug(
                                "Setting isSendingMessage to false"
                            );
                        }
                    } else {
                        elizaLogger.error(
                            "Cannot submit action: gameId or playerId is missing"
                        );
                    }
                } else {
                    elizaLogger.info("Not our turn, waiting for next update");
                }
            }
        } catch (error) {
            elizaLogger.error("Error handling player view update:", error);
        } finally {
            this.isSendingMessage = false;
        }
    }

    private resetGame(): void {
        this.playerId = null;
        this.gameId = null;
        this.gameState = null;
        this.playerReadySet = false; // Reset ready flag when resetting game
        // playerName is retained as it's based on the agent's identity
        this.resetFailedCount = 0;
        // Increase backoff time when resetting due to failures
        this.joinBackoffMs = Math.min(this.joinBackoffMs * 2, 30000); // Max 30 second backoff
        // Stop player view polling
        this.stopPlayerViewPolling();
    }

    async stop(): Promise<void> {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Stop player view polling
        this.stopPlayerViewPolling();
      
        if (this.gameId && this.playerId) {
            try {
                await this.apiConnector.leaveGame(this.gameId, this.playerId);
            } catch (error) {
                elizaLogger.error("Error leaving game:", error);
            }
        }

        elizaLogger.info("PokerClient stopped");
    }

    async joinGame(gameId?: string): Promise<void> {
        try {
            this.playerName = this.runtime?.character.name || "ElizaPokerBot";
            elizaLogger.info(
                "Attempting to join game",
                gameId,
                "as",
                this.playerName
            );
            this.playerId = await this.apiConnector.joinGame({
                gameId,
                playerName: this.playerName,
            });
            this.gameId = gameId || null; // TODO implement logic of more tables
            elizaLogger.info(
                `Agent joined game ${gameId} as player ${this.playerName} (ID: ${this.playerId})`
            );

            // Set up player view listener after successful join
            this.apiConnector.onPlayerView((view: PlayerView) => {
                this.handlePlayerViewUpdate(view);
            });

            // Start polling for player view updates
            this.startPlayerViewPolling();
            // The apiConnector.joinGame method calls setPlayerReady internally
            this.playerReadySet = true;
            // Reset backoff on successful join
            this.joinBackoffMs = 5000;
        } catch (error: any) {
            elizaLogger.error("Failed to join game:", error)
            // Reset state since join failed and we couldn't recover
            // this.resetGame();
        }
    }

    private startPlayerViewPolling(): void {
        // Clear any existing polling interval
        if (this.playerViewPollingInterval) {
            clearInterval(this.playerViewPollingInterval);
            this.playerViewPollingInterval = null;
        }

        // Start a new polling interval
        elizaLogger.info(`Starting player view polling every ${this.playerViewPollingIntervalMs}ms`);
        this.playerViewPollingInterval = setInterval(() => {
            this.pollPlayerView();
        }, this.playerViewPollingIntervalMs);
    }

    private async pollPlayerView(): Promise<void> {
        try {
            if (!this.playerId) {
                elizaLogger.warn("Cannot poll player view: player ID is not set");
                return;
            }

            // Skip polling if we're currently sending a message
            if (this.isSendingMessage) {
                elizaLogger.debug("Skipping player view polling while sending message", {
                    isSendingMessage: this.isSendingMessage
                });
                return;
            }

            // Check if enough time has passed since last poll
            const now = Date.now();
            if (now - this.lastPollTime < this.minPollInterval) {
                elizaLogger.debug("Skipping poll - too soon since last poll", {
                    timeSinceLastPoll: now - this.lastPollTime,
                    minInterval: this.minPollInterval
                });
                return;
            }

            // Update last poll time
            this.lastPollTime = now;

            // Request player view update
            elizaLogger.debug("Polling for player view update", {
                isSendingMessage: this.isSendingMessage,
                timeSinceLastPoll: now - this.lastPollTime
            });
            const response = await this.apiConnector.getPlayerView(this.playerId);
            if (response) {
                this.handlePlayerViewUpdate(response);
            }
        } catch (error) {
            elizaLogger.error("Error polling for player view:", error);
        }
    }

    private stopPlayerViewPolling(): void {
        if (this.playerViewPollingInterval) {
            clearInterval(this.playerViewPollingInterval);
            this.playerViewPollingInterval = null;
            elizaLogger.info("Stopped player view polling");
        }
    }

    private async handleGameUpdate(gameState: GameState): Promise<void> {
        try {
            // Handle game over state
            if (gameState.isGameOver) {
                elizaLogger.info("Game is over:", {
                    winner: gameState.winner?.name,
                    finalPot: gameState.finalPot,
                    finalCommunityCards: gameState.finalCommunityCards,
                });

                // Reset game state to allow joining new games
                this.resetGame();
                return;
            }

            // Save the current game state
            this.gameState = gameState;

            // Find player by name in the game state (instead of by ID)
            const ourPlayer = gameState.players.find(
                (player) => player.id === this.playerId
            );

            if (!ourPlayer) {
                elizaLogger.error(
                    `Player ${this.playerName} not found in game, cannot make decisions`
                );
                this.resetGame();
                this.joinGame();
                return;
            }

            // Don't make decisions if game is in waiting state, but check if we need to set ready
            if (gameState.tableStatus === "WAITING") {
                elizaLogger.info("Game is in waiting state");

                // Check if we need to set ready status - only if we haven't already set it or if server says we're not ready
                // Use both the playerReadySet flag and the server-reported ready status
                if (!this.playerReadySet && !ourPlayer.isReady) {
                    elizaLogger.info(
                        "Player is not ready yet, setting ready status"
                    );
                    try {
                        await this.apiConnector.setPlayerReady();
                        elizaLogger.info(
                            "Successfully set player ready status"
                        );
                        // Mark that we've set the player ready, regardless of server state
                        this.playerReadySet = true;

                        // After setting ready, update the player state locally to avoid repeated calls
                        if (this.gameState && this.gameState.players) {
                            const playerIndex =
                                this.gameState.players.findIndex(
                                    (p) => p.id === ourPlayer.id
                                );
                            if (playerIndex >= 0) {
                                this.gameState.players[playerIndex].isReady =
                                    true;
                            }
                        }
                    } catch (error) {
                        elizaLogger.error(
                            "Error setting player ready status:",
                            error
                        );
                    }
                } else {
                    // If we've already set ready before OR if server says we're ready
                    if (this.playerReadySet) {
                        elizaLogger.info(
                            "Player ready status already set in this session"
                        );
                    } else if (ourPlayer.isReady) {
                        elizaLogger.info(
                            "Player is already ready according to server"
                        );
                        this.playerReadySet = true; // Update our flag to match server state
                    }
                    elizaLogger.info("Waiting for game to start");
                }

                return;
            }

            // Check if it's our turn
            const isOurTurn =
                gameState.currentPlayerIndex !== undefined &&
                gameState.players[gameState.currentPlayerIndex]?.name ===
                    this.playerName;

            if (isOurTurn) {
                elizaLogger.info("It's our turn, making a decision");
                const decision = await this.makeDecision(gameState);
                elizaLogger.info(`Decision made: ${decision.action}`, decision);

                // Submit the action to the server
                if (this.playerId) {
                    await this.apiConnector.submitAction({
                        playerId: this.playerId,
                        decision
                    });
                } else {
                    elizaLogger.error(
                        "Cannot submit action: gameId or playerId is missing"
                    );
                }
            }
        } catch (error) {
            elizaLogger.error("Error handling game update:", error);
        }
    }



    private async makeDecision(gameState: GameState): Promise<PokerDecision> {
        try {
            if (!this.runtime) return { action: PlayerAction.FOLD };
            elizaLogger.info("gameState:", gameState);
            // Prepare context for the model
            const context = this.prepareGameContext(gameState);

            // Consult the agent to make a decision
            elizaLogger.info("Asking agent for poker decision");

            const systemPrompt = `You are an experienced poker player named ${
                    this.runtime.character.name || "PokerBot"
                }.

                At the table we have ${gameState.players.length} players. At table ${
                    this.gameId
                }
                Your goal is to maximize your winnings using advanced poker strategy.
                Carefully analyze the current game situation and make a strategic decision.

                Consider the following elements for your decision:
                1. The strength of your current hand
                2. Your chances of improving with community cards
                3. The size of the pot and current bet
                4. Your position at the table and chip count
                5. The behavior of other players

                Avoid folding constantly - use check, call or raise when appropriate.
                A successful poker strategy involves a mix of conservative and aggressive plays.

                IMPORTANT: Respond ONLY with one of the following formats:
                - "FOLD" (when you want to give up)
                - "CHECK" (when you want to pass without betting)
                - "CALL" (when you want to match the current bet)
                - "RAISE X" (where X is the total bet amount, including the current bet)

                DO NOT include explanations or additional comments - just the action.`


            const response = await generateText({
                runtime: this.runtime,
                context: context,
                modelClass: ModelClass.MEDIUM,
                customSystemPrompt: systemPrompt,
            });
            elizaLogger.info(`Agent response: ${response}`);
            elizaLogger.info(`Agent context: ${context}`);
            // Analyze the response to extract the action
            const decision = this.parseAgentResponse(response);
            elizaLogger.info(`Agent decision: ${JSON.stringify(decision)}`);

            return decision;
        } catch (error) {
            elizaLogger.error("Error making decision:", error);
            return { action: PlayerAction.FOLD };
        }
    }

    private prepareGameContext(gameState: GameState): string {
        const playerInfo = gameState.players.find(
            (p) => p.id === this.playerId
        );

        if (!playerInfo) {
            return "Could not find your information in the game. Decision: FOLD";
        }

        // Format cards for display
        const formatCard = (card: Card) => `${card.rank}${card.suit}`;
        const formatCards = (cards: Card[]) => cards.map(formatCard).join(" ");

        const phase = gameState.communityCards.length === 0 ? "preflop"
                    : gameState.communityCards.length === 3 ? "flop"
                    : gameState.communityCards.length === 4 ? "turn"
                    : "river";

        const gamePhase =
            gameState.tableStatus === "WAITING" ||
            gameState.tableStatus === "ROUND_OVER"
                ? gameState.tableStatus
                : phase;

        const context = [
            `Game phase: ${gamePhase}`,
            `Current pot: ${gameState.pot}`,
            `Current bet: ${gameState.currentBet}`,
            `Your cards: ${
                playerInfo.hand ? formatCards(playerInfo.hand) : "Unknown"
            }`,
            // `Estimated hand strength: ${handStrength}`,
            `Community cards: ${formatCards(gameState.communityCards)}`,
            `Your chips: ${playerInfo.chips}`,
            // `Your chip position: ${myChipRank}th of ${totalPlayers}`,
            `Your current bet: ${playerInfo.currentBet}`,
            // `Pot odds: ${potOdds}`,
            `Last action: ${gameState.lastAction || "None"}`,
            `Last raise: ${gameState.lastRaiseAmount || 0}`,
            // `Active players: ${activePlayers} of ${totalPlayers}`,
            `\nPlayers:`,
            ...gameState.players.map(
                (p) =>
                    `${p.name}: ${p.chips} chips, bet ${p.currentBet}, ${
                        p.isFolded ? "folded" : "active"
                    }`
            ),
            `\nRound history:`,
            ...(gameState.roundHistory || []),
        ].join("\n");

        return context;
    }

    private parseAgentResponse(response: string): PokerDecision {
        try {
            const normalized = response.trim().toUpperCase();
            elizaLogger.info(`Parsing agent response: "${normalized}"`);

            // Regex patterns to detect different response formats
            const foldPattern = /\b(FOLD|GIVE UP|FOLDED)\b/;
            const checkPattern = /\b(CHECK|CHECKED)\b/;
            const callPattern = /\b(CALL|MATCH|PAY|COVER|EQUAL|EQUALS)\b/;
            const raisePattern =
                /\b(RAISE|RAISE TO|INCREASE|BET|R)[ :]+(\d+)\b/;
            const allInPattern = /\b(ALL[ -]IN|ALL|ALL-IN)\b/;

            // Check each pattern in order of priority
            if (allInPattern.test(normalized)) {
                // All-in is a form of RAISE with all chips
                return { action: PlayerAction.ALL_IN };
            }

            const raiseMatch = normalized.match(raisePattern);
            if (raiseMatch && raiseMatch[2]) {
                const amount = parseInt(raiseMatch[2]);
                if (!isNaN(amount) && amount > 0) {
                    return { action: PlayerAction.RAISE, amount };
                }
            }

            if (callPattern.test(normalized)) {
                return { action: PlayerAction.CALL };
            }

            if (checkPattern.test(normalized)) {
                return { action: PlayerAction.CHECK };
            }

            if (foldPattern.test(normalized)) {
                return { action: PlayerAction.FOLD };
            }

            // If no pattern matches, return FOLD as default
            return { action: PlayerAction.FOLD };
        } catch (error) {
            elizaLogger.error("Error parsing agent response:", error);
            // In case of error, we choose the safest option (CHECK if possible, FOLD as fallback)
            return { action: PlayerAction.FOLD };
        }
    }
}
