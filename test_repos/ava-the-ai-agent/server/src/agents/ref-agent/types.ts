/**
 * Types for RefAgent interactions with Ref Finance
 */

/**
 * Token metadata as returned by the NEAR token standard
 */
export interface TokenMetadata {
  id: string;
  decimals: number;
  symbol: string;
  name: string;
  icon?: string;
  spec?: string;
  reference?: string;
  reference_hash?: string;
  price?: number;
}

/**
 * Balance information for a token
 */
export interface TokenBalance {
  token_id: string;
  balance: string;
  formatted_balance?: string;
  metadata?: TokenMetadata;
}

/**
 * Liquidity pool information
 */
export interface Pool {
  id: number;
  token_account_ids: string[];
  amounts: string[];
  total_fee: number;
  shares_total_supply: string;
  tvl?: number;
  token1_price?: number;
  token2_price?: number;
  pool_kind?: string;
}

/**
 * Detailed pool information with token metadata
 */
export interface PoolWithTokens extends Pool {
  tokens: TokenMetadata[];
}

/**
 * Response for pool query
 */
export interface PoolsResponse {
  success: boolean;
  error?: string;
  pools?: PoolWithTokens[];
}

/**
 * Parameters for token price query
 */
export interface TokenPriceParams {
  token_id: string;
  quote_id?: string;
}

/**
 * Response for token price query
 */
export interface TokenPriceResponse {
  success: boolean;
  error?: string;
  price?: number;
  quote_token?: string;
  timestamp?: string;
}

/**
 * Parameters for swap transaction
 */
export interface SwapParams {
  account_id: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  min_amount_out?: string;
  pool_id?: number;
  slippage_tolerance?: number;
  referral_id?: string;
}

/**
 * Information about a successful swap
 */
export interface SwapResult {
  transaction_hash: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  fee_amount: string;
  slippage: number;
}

/**
 * Response for swap transaction
 */
export interface SwapResponse {
  success: boolean;
  error?: string;
  result?: SwapResult;
}

/**
 * Parameters for token balances query
 */
export interface TokenBalancesParams {
  account_id: string;
  token_ids?: string[];
}

/**
 * Response for token balances query
 */
export interface TokenBalancesResponse {
  success: boolean;
  error?: string;
  balances?: TokenBalance[];
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

/**
 * Information about a transaction
 */
export interface Transaction {
  hash: string;
  status: TransactionStatus;
  timestamp: string;
  signer_id: string;
  receiver_id: string;
  actions: any[];
}

/**
 * Info about swap route
 */
export interface RouteInfo {
  pool_id: number;
  token_in: string;
  token_out: string;
  pool_fee: number;
  amount_in: string;
  expected_amount_out: string;
}

/**
 * Smart routing parameters
 */
export interface SmartRoutingParams extends SwapParams {
  max_hops?: number;
  use_smart_routing?: boolean;
}

/**
 * Smart routing result
 */
export interface SmartRoutingResult extends SwapResult {
  routes: RouteInfo[];
}
