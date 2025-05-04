// Implementation of the NEAR Intents solver

use crate::runeswap::RuneSwapClient;
use crate::types::{
    Intent, IntentDeadline, IntentMessage, JsonRpcRequest, JsonRpcResponse,
    SolverBusMessage, SwapIntent, SwapQuote, SwapStatus,
};
use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::error::Error;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};

/// Solver trait for implementing different solver strategies
#[async_trait]
pub trait Solver {
    async fn process_intent(&self, intent: &SwapIntent) -> Result<SwapQuote, Box<dyn Error>>;
    async fn execute_swap(&self, quote: &SwapQuote) -> Result<String, Box<dyn Error>>;
}

/// Solver for NEAR Intents protocol
pub struct NearIntentsSolver {
    account_id: String,
    private_key: String,
    solver_bus_url: String,
    runeswap_client: RuneSwapClient,
}

impl NearIntentsSolver {
    /// Create a new NEAR Intents solver
    pub fn new(
        account_id: String,
        private_key: String,
        solver_bus_url: String,
        runeswap_client: RuneSwapClient,
    ) -> Self {
        Self {
            account_id,
            private_key,
            solver_bus_url,
            runeswap_client,
        }
    }
    
    /// Start the solver and connect to the NEAR Intents bus
    pub async fn start(&self) -> Result<(), Box<dyn Error>> {
        log::info!("Connecting to solver bus at: {}", self.solver_bus_url);
        
        // Connect to the solver bus
        let (ws_stream, _) = match connect_async(&self.solver_bus_url).await {
            Ok(conn) => {
                log::info!("Connected to solver bus");
                conn
            },
            Err(e) => {
                log::error!("Failed to connect to solver bus: {}", e);
                return Err(Box::new(e));
            }
        };
        
        // Process messages from the bus
        self.process_messages(ws_stream).await?;
        
        Ok(())
    }
    
    /// Process messages from the WebSocket stream
    async fn process_messages(
        &self,
        mut ws_stream: WebSocketStream<MaybeTlsStream<TcpStream>>,
    ) -> Result<(), Box<dyn Error>> {
        log::info!("Starting to process messages from solver bus");
        
        // Subscribe to intent messages using the JsonRpcRequest type
        let subscribe_request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: 1,
            method: "subscribe".to_string(),
            params: Some(vec!["intents".to_string()]),
        };
        
        // Convert the request to JSON and send it
        let subscribe_json = serde_json::to_string(&subscribe_request)?;
        ws_stream.send(Message::Text(subscribe_json)).await?;
        
        // Set up a simple ping/pong interval to keep the connection alive
        let mut interval = tokio::time::interval(Duration::from_secs(30));
        
        loop {
            tokio::select! {
                // Handle WebSocket messages
                msg = ws_stream.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            log::debug!("Received message: {}", text);
                            
                            // Try to parse the message as a SolverBusMessage
                            match serde_json::from_str::<SolverBusMessage>(&text) {
                                Ok(solver_msg) => {
                                    if solver_msg.method == "subscription" {
                                        if let Some(intent) = solver_msg.params.intent {
                                            log::info!("Received swap intent: {} ({} -> {})", 
                                                intent.id, 
                                                intent.from_token.symbol, 
                                                intent.to_token.symbol);
                                                
                                            // Process the intent and get a quote
                                            match self.process_intent(&intent).await {
                                                Ok(quote) => {
                                                    log::info!("Generated quote for intent: {}", intent.id);
                                                    
                                                    // Send the quote response
                                                    // In a real implementation, this would send the quote back to the bus
                                                },
                                                Err(e) => {
                                                    log::error!("Failed to process intent: {}", e);
                                                }
                                            }
                                        }
                                    } else if solver_msg.method == "response" {
                                        log::info!("Received response: {}", text);
                                    }
                                },
                                Err(e) => {
                                    // Try to parse as a JsonRpcResponse for subscription confirmation
                                    match serde_json::from_str::<JsonRpcResponse>(&text) {
                                        Ok(response) => {
                                            log::info!("Subscription confirmed with ID: {}", response.result);
                                        },
                                        Err(_) => {
                                            log::error!("Failed to parse message: {}", e);
                                        }
                                    }
                                }
                            }
                        },
                        Some(Ok(Message::Ping(data))) => {
                            // Respond to ping with pong
                            if let Err(e) = ws_stream.send(Message::Pong(data)).await {
                                log::error!("Failed to send pong: {}", e);
                                break;
                            }
                        },
                        Some(Ok(Message::Close(_))) => {
                            log::info!("WebSocket connection closed by server");
                            break;
                        },
                        Some(Err(e)) => {
                            log::error!("WebSocket error: {}", e);
                            break;
                        },
                        None => {
                            log::error!("WebSocket stream ended unexpectedly");
                            break;
                        },
                        _ => { /* Ignore other message types */ }
                    }
                },
                
                // Send ping periodically to keep connection alive
                _ = interval.tick() => {
                    log::trace!("Sending ping");
                    if let Err(e) = ws_stream.send(Message::Ping(vec![])).await {
                        log::error!("Failed to send ping: {}", e);
                        break;
                    }
                }
            }
        }
        
        log::info!("Stopped processing messages from solver bus");
        Ok(())
    }
    
    /// Process an intent from the NEAR Intents protocol
    pub async fn process_intent(&self, intent: &SwapIntent) -> Result<SwapQuote, Box<dyn Error>> {
        log::info!("Processing intent: {} ({} -> {})", 
            intent.id, 
            intent.from_token.symbol, 
            intent.to_token.symbol);
            
        // Get a quote from RuneSwap
        let quote = self.runeswap_client.get_quote(intent).await?;
        
        log::info!("Quote received: amount_out={}, price={}", 
            quote.amount_out, 
            quote.price);
            
        // Create a token diff intent message
        let deadline = IntentDeadline {
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() + 300, // 5 minutes in the future
        };
        
        // Create token diff for the swap (this would be used in a real implementation)
        let mut diff = HashMap::new();
        diff.insert(intent.from_token.address.clone(), format!("-{}", intent.amount));
        diff.insert(intent.to_token.address.clone(), quote.amount_out.clone());
        
        let _intent_message = IntentMessage {
            signer_id: self.account_id.clone(),
            deadline,
            intents: vec![Intent {
                intent: "token_diff".to_string(),
                diff,
            }],
        };
        
        // In a real implementation, this message would be signed and included in the quote response
            
        Ok(quote)
    }
    
    /// Execute a swap based on a quote
    pub async fn execute_swap(&self, quote: &SwapQuote) -> Result<String, Box<dyn Error>> {
        log::info!("Executing swap for intent: {}", quote.intent_id);
        
        // Execute the swap through RuneSwap
        let tx_id = self.runeswap_client.execute_swap(quote).await?;
        
        log::info!("Swap executed successfully: {}", tx_id);
        
        Ok(tx_id)
    }
} 