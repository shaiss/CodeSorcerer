import { z } from "zod";
import {
    ActionProvider,
    WalletProvider,
    Network,
    CreateAction,
} from "@coinbase/agentkit";
import env from "../../../env";

export const DefiActionSchema = z.object({
    address: z.string().optional().describe("Wallet Address is required"),
});

export class DefiActionProvider extends ActionProvider<WalletProvider> {
    constructor() {
        super("defi-action", []);
    }

    @CreateAction({
        name: "get_Activity",
        description: "Get Activity of the address across all Chains",
        schema: DefiActionSchema,
    })
    async getActivity(params: z.infer<typeof DefiActionSchema>): Promise<string> {
        const { address } = params;
        console.log("Address", address);

        try {
            const res = await fetch(
                `https://api.covalenthq.com/v1/address/${address}/activity/`,
                {
                    headers: {
                        Authorization: `Bearer ${env.GOLDRUSH_API}`,
                    },
                }
            );
            const response = await res.json();
            console.log("Response >>>", response);

            return `Here is the Defi activities of the user:
        activity: ${JSON.parse(response.items)}
        `;
        } catch (error) {
            console.log("Error", error);

            throw new Error(`Defi Actions Invalid: ${(error as any).message}`);
        }
    }

    supportsNetwork = (network: Network) => network.protocolFamily === "evm";
}

export const defiActionProvider = () => new DefiActionProvider();
