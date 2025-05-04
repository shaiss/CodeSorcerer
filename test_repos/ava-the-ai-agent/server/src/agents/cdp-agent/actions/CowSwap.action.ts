import { z } from "zod";
import {
    ActionProvider,
    WalletProvider,
    Network,
    CreateAction,
} from "@coinbase/agentkit";
import {
    EcdsaSigningScheme,
    OrderBookApi,
    OrderKind,
    OrderQuoteSideKindSell,
    OrderSigningUtils,
    SigningScheme,
    SupportedChainId,
    TradeParameters,
    TradingSdk,
    UnsignedOrder,
} from "@cowprotocol/cow-sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";
import { TOKEN_DETAILS } from "../helpers/utils";
import env from "../../../env";

dotenv.config();

export const SwapSchema = z.object({
    sellToken: z.string().describe("Sell Token is required"),
    buyToken: z.string().describe("Buy Token is required"),
    amount: z.number().describe("Amount is required"),
});


export const SIGN_SCHEME_MAP = {
    [EcdsaSigningScheme.EIP712]: SigningScheme.EIP712,
    [EcdsaSigningScheme.ETHSIGN]: SigningScheme.ETHSIGN,
}

// Define an action provider that uses a wallet provider.
export class CowSwapActionProvider extends ActionProvider<WalletProvider> {
    constructor() {
        super("cow-swap-action", []);
    }

    // Define if the action provider supports the given network
    supportsNetwork = (network: Network) => true;

    @CreateAction({
        name: "swap",
        description: `Helps in swapping by selling the sell Token and buying the buy Token. 
      - You show the Quote Request to the user and ask for confirmation of the quote. Display Quote in a proper JSON format.
      - After you fetch the buy Amount display that amount to the user and then proceed with the transaction
      `,
        schema: SwapSchema,
    })
    async swapActivity(
        walletProvider: WalletProvider,
        params: z.infer<typeof SwapSchema>
    ): Promise<string> {
        //TODO: Fetch the token contract address by the token name


        try {

            const sellTokenAddress =
                TOKEN_DETAILS[params.sellToken as keyof typeof TOKEN_DETAILS];
            const buyTokenAddress =
                TOKEN_DETAILS[params.buyToken as keyof typeof TOKEN_DETAILS];

            const sdk = new TradingSdk({
                chainId: SupportedChainId.BASE,
                signer: env.PRIVATE_KEY,
                appCode: 'AVA-the-ai-agent',
            }, {
                enableLogging: true
            })

            const parameters: TradeParameters = {
                sellToken: sellTokenAddress.address,
                sellTokenDecimals: sellTokenAddress.decimals,
                buyToken: buyTokenAddress.address,
                buyTokenDecimals: buyTokenAddress.decimals,
                amount: (params.amount * 10 ** (sellTokenAddress.decimals)).toString(),
                kind: OrderKind.SELL
            }

            console.log("Trade parameters", parameters);

            const { quoteResults, postSwapOrderFromQuote } = await sdk.getQuote(parameters)
            console.log("Quote  results >>", quoteResults);

            const buyAmount = quoteResults.amountsAndCosts.afterSlippage.buyAmount
            console.log("buy Amount", buyAmount);

            const orderId = await postSwapOrderFromQuote();
            console.log("orderId", orderId);

            const orderExplorer = `https://explorer.cow.fi/base/orders/${orderId}`

            return `Order Created successfully, Here are the order details: 
         {
            orderId:${orderId},
            orderExplorer: ${orderExplorer}
         }
         
         `
        } catch (error) {
            console.log("Error in creating order", error);
            return `Error executing order ${(error as any).message}`
        }
    }
}

export const cowSwapActionProvider = () => new CowSwapActionProvider();
