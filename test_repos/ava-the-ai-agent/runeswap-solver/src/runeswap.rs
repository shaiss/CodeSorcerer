// RuneSwap API client implementation

use crate::types::{SwapIntent, SwapQuote, Token};
use reqwest::{Client, header};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};

/// Client for interacting with the RuneSwap API
#[derive(Clone)]
pub struct RuneSwapClient {
    /// HTTP client for API calls
    client: Client,
    
    /// API key for authentication
    api_key: String,
    
    /// Base URL for the RuneSwap API
    base_url: String,
}

/// Response from the RuneSwap API for a quote
#[derive(Debug, Deserialize)]
pub struct RuneSwapQuoteResponse {
    pub quote_id: String,
    pub from_amount: String,
    pub to_amount: String,
    pub price: String,
    pub gas_estimate: u64,
    pub expires_at: u64,
}

/// Request to the RuneSwap API for a quote
#[derive(Debug, Serialize)]
struct RuneSwapQuoteRequest {
    from_token: String,
    to_token: String,
    amount: String,
    side: String, // "buy" or "sell"
}

impl RuneSwapClient {
    /// Create a new RuneSwap client
    pub fn new(api_key: &str) -> Self {
        // Create a client with default headers including the API key
        let mut headers = header::HeaderMap::new();
        headers.insert(
            "x-api-key",
            header::HeaderValue::from_str(api_key).unwrap(),
        );
        
        let client = Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();
            
        Self {
            client,
            api_key: api_key.to_string(),
            base_url: "https://api.runeswap.io/v1".to_string(),
        }
    }
    
    /// Get a quote for a swap
    pub async fn get_quote(&self, intent: &SwapIntent) -> Result<SwapQuote, Box<dyn Error>> {
        let url = format!("{}/quote", self.base_url);
        
        // Determine if this is a buy or sell
        let side = "sell"; // Default to sell
        
        // Create the request body
        let request = RuneSwapQuoteRequest {
            from_token: intent.from_token.address.clone(),
            to_token: intent.to_token.address.clone(),
            amount: intent.amount.clone(),
            side: side.to_string(),
        };
        
        // Send the request to the API
        let response = self.client.post(&url)
            .json(&request)
            .send()
            .await?
            .json::<RuneSwapQuoteResponse>()
            .await?;
            
        // Convert the API response to our internal SwapQuote type
        let quote = SwapQuote {
            intent_id: intent.id.clone(),
            amount_out: response.to_amount,
            price: response.price,
            gas_estimate: response.gas_estimate,
        };
        
        Ok(quote)
    }
    
    /// Execute a swap based on a quote
    pub async fn execute_swap(&self, quote: &SwapQuote) -> Result<String, Box<dyn Error>> {
        let url = format!("{}/execute", self.base_url);
        
        // In a real implementation, this would send the execution request to the API
        // For now, just log and return a placeholder transaction ID
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
            
        let tx_id = format!("tx-{}", timestamp);
        
        log::info!("Executed swap with quote ID: {}", quote.intent_id);
        log::info!("Transaction ID: {}", tx_id);
        
        Ok(tx_id)
    }
    
    /// Get supported tokens from the API
    pub async fn get_supported_tokens(&self) -> Result<Vec<Token>, Box<dyn Error>> {
        let url = format!("{}/tokens", self.base_url);
        
        // In a real implementation, this would fetch tokens from the API
        // For now, return some placeholder tokens
        let tokens = vec![
            Token {
                symbol: "ETH".to_string(),
                address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".to_string(),
                decimals: 18,
            },
            Token {
                symbol: "USDC".to_string(),
                address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".to_string(),
                decimals: 6,
            },
            Token {
                symbol: "NEAR".to_string(),
                address: "near".to_string(),
                decimals: 24,
            },
        ];
        
        Ok(tokens)
    }
} 