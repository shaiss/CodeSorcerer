import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";


// DeFiLlama Tools Definition
export const defiLlamaToolkit = {
    getTVLTool: new DynamicStructuredTool({
        name: "get_protocol_tvl",
        description: "Get current and historical TVL data for a protocol",
        schema: z.object({
            protocol: z.string().describe("Protocol name/slug"),
        }),
        func: async ({ protocol }) => {
            const response = await fetch(`https://api.llama.fi/protocol/${protocol}`);

            console.log(response, "response from the api");
            const data = await response.json();
            return JSON.stringify({
                name: data.name,
                tvl: data.tvl,
                chainTvls: data.chainTvls,
                currentChainTvls: data.currentChainTvls,
            });
        },
    }),

    getYieldsTool: new DynamicStructuredTool({
        name: "get_yield_pools",
        description: "Get yield/APY data for DeFi pools",
        schema: z.object({
            chain: z.string().optional().describe("Optional chain filter"),
        }),
        func: async ({ chain }) => {
            const response = await fetch("https://yields.llama.fi/pools");
            const data = await response.json();
            const pools = data.data
                .filter((pool: any) => !chain || pool.chain === chain)
                .slice(0, 10)
                .map((pool: any) => ({
                    chain: pool.chain,
                    project: pool.project,
                    symbol: pool.symbol,
                    tvlUsd: pool.tvlUsd,
                    apy: pool.apy,
                }));
            return JSON.stringify(pools);
        },
    }),

    getDexVolumesTool: new DynamicStructuredTool({
        name: "get_dex_volumes",
        description: "Get DEX trading volume data",
        schema: z.object({
            chain: z.string().optional().describe("Optional chain filter"),
        }),
        func: async ({ chain }) => {
            const endpoint = chain ?
                `https://api.llama.fi/overview/dexs/${chain}` :
                'https://api.llama.fi/overview/dexs';
            const response = await fetch(endpoint);
            const data = await response.json();
            const volumes = data.protocols
                .slice(0, 10)
                .map((dex: any) => ({
                    name: dex.name,
                    chain: dex.chain,
                    dailyVolume: dex.dailyVolume,
                    totalVolume: dex.totalVolume,
                }));
            return JSON.stringify(volumes);
        },
    }),
};

// Tools Definition
export const coingeckoTool = new DynamicStructuredTool({
    name: "get_token_price",
    description: "Get the current price of any cryptocurrency token",
    schema: z.object({
        tokenId: z.string().describe("The token ID from CoinGecko"),
    }),
    func: async ({ tokenId }) => {
        try {
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${tokenId}`,
                {
                    headers: {
                        "x-cg-demo-api-key": process.env["NEXT_PUBLIC_COINGECKO_API_KEY"]!,
                    },
                }
            );
            const data = await response.json();
            return `${tokenId.toUpperCase()} price: $${data.market_data.current_price.usd}`;
        } catch (error) {
            return `Error fetching ${tokenId} price`;
        }
    },
});

