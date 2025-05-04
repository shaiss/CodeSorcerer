import { PokerClient } from "./poker-client";
import { elizaLogger } from "@elizaos/core";

export function createPokerClient(runtime: any) {
    // const apiKey = runtime.character.settings?.secrets?.POKER_API_KEY;
    // if (!apiKey) {
    //     elizaLogger.error("API key not found in character configuration");
    //     throw new Error(
    //         "POKER_API_KEY is required in character settings.secrets"
    //     );
    // }

    return new PokerClient({
        apiKey: "", // TODO: add api key logic, do it on backend
        apiBaseUrl: process.env.POKER_API_URL,
    });
}
