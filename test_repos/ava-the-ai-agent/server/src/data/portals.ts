import type { Hex } from "viem";
import env from "../env";

/**
 * @dev Gets the balances of an account
 * @param owner - The owner of the account
 * @returns The balances of the account
 */
export const getAccountBalances = async (owner: Hex) => {
  try {
    const url = `https://api.portals.fi/v2/account?owner=${owner}&networks=${env.CHAIN_NAME}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PORTALS_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Portals API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[Portals] Account balances:", data);
    return data;
  } catch (error) {
    console.error("[Portals] Error fetching balances:", error);
    return { balances: [] }; // Return empty balances on error
  }
};

/**
 * @dev Gets the market data
 * @returns The market data
 */
/**
 * @dev Gets the market data for both USDC and EURC
 * @returns The market data for both tokens
 */
async function fetchTokenData(url: string) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching token data:', error);
    return null;
  }
}

export async function getMarketData() {
  const urls = [
    'https://api.portals.fi/v2/tokens?networks=base&minLiquidity=10000000&minApy=3&maxApy=60&search=usdc',
    'https://api.portals.fi/v2/tokens?networks=base&minLiquidity=2000000&minApy=3&maxApy=60&search=eurc'
  ];

  try {
    const responses = await Promise.all(urls.map(url => fetchTokenData(url)));
    return responses.filter(response => response !== null);
  } catch (error) {
    console.error('Error in getMarketData:', error);
    throw error;
  }
}

/**
 * @dev Gets the market data for multiple protocol/token combinations
 * @param queries - Array of {protocol, token} pairs to check
 * @param minLiquidity - Minimum liquidity threshold
 * @param minApy - Minimum APY threshold
 * @param maxApy - Maximum APY threshold
 * @returns The market data for the specified positions
 */
export const getPositionData = async (
  queries: Array<{ protocol: string; token: string }>,
  minLiquidity: number = 10000000,
  minApy: number = 3,
  maxApy: number = 60
) => {
  const results = await Promise.all(
    queries.map(async ({ protocol, token }) => {
      const url = `https://api.portals.fi/v2/tokens?networks=${env.CHAIN_NAME}&platforms=${protocol}&minLiquidity=${minLiquidity}&minApy=${minApy}&maxApy=${maxApy}&search=${token}`;
      console.log("======== fetchPositionData =========");
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.PORTALS_API_KEY}`,
        },
      });
      const data = await response.json();
      return {
        protocol,
        token,
        data,
      };
    })
  );
  return results;
};
