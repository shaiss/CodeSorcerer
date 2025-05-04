// Basic type definitions for the RuneSwap solver

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a token with its details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    pub symbol: String,
    pub address: String,
    pub decimals: u8,
}

/// Represents a swap intent from the NEAR protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapIntent {
    pub id: String,
    pub from_token: Token,
    pub to_token: Token,
    pub amount: String,
    pub min_amount_out: String,
    pub deadline: u64,
}

/// Represents a swap quote from RuneSwap
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapQuote {
    pub intent_id: String,
    pub amount_out: String,
    pub price: String,
    pub gas_estimate: u64,
}

/// Status of a swap execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SwapStatus {
    Pending,
    Executed,
    Failed,
}

/// Message received from the solver bus
#[derive(Debug, Deserialize)]
pub struct SolverBusMessage {
    pub jsonrpc: String,
    pub method: String,
    pub params: SolverBusParams,
}

/// Parameters for a solver bus message
#[derive(Debug, Deserialize)]
pub struct SolverBusParams {
    pub subscription: String,
    #[serde(flatten)]
    pub intent: Option<SwapIntent>,
}

/// JSON-RPC request for the solver bus
#[derive(Debug, Serialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<Vec<String>>,
}

/// JSON-RPC response from the solver bus
#[derive(Debug, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: u64,
    pub result: String,
}

/// Token diff intent message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentMessage {
    /// ID of the signer account
    pub signer_id: String,
    
    /// Deadline for the intent
    pub deadline: IntentDeadline,
    
    /// Vector of intents to execute
    pub intents: Vec<Intent>,
}

/// Deadline for an intent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentDeadline {
    /// Unix timestamp in seconds
    pub timestamp: u64,
}

/// Intent data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent {
    /// Type of intent (usually "token_diff")
    pub intent: String,
    
    /// Token differences
    pub diff: HashMap<String, String>,
} 