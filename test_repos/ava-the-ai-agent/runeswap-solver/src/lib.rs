// Basic module structure for RuneSwap Solver

// Module declarations
pub mod types;
pub mod config;
pub mod runeswap;
pub mod solver;

use std::error::Error;
use crate::config::Config;
use crate::runeswap::RuneSwapClient;
use crate::solver::{NearIntentsSolver, Solver};

/// Main entry point for the RuneSwap NEAR Intents integration
pub struct RuneSwapSolver {
    /// Configuration for the solver
    pub config: Config,
    
    /// Client for interacting with RuneSwap API
    pub runeswap_client: RuneSwapClient,
}

impl RuneSwapSolver {
    /// Create a new RuneSwap solver instance
    pub fn new(config: Config) -> Self {
        let runeswap_client = RuneSwapClient::new(&config.runeswap_api_key);
        Self {
            config,
            runeswap_client,
        }
    }
    
    /// Initialize the solver with default configuration from environment variables
    pub fn init_default() -> Result<Self, Box<dyn Error>> {
        let config = Config::from_env()?;
        Ok(Self::new(config))
    }
    
    /// Start the solver service
    pub async fn start(&self) -> Result<(), Box<dyn Error>> {
        log::info!("Starting RuneSwap solver for NEAR Intents");
        
        // Create the NEAR Intents solver
        let solver = NearIntentsSolver::new(
            self.config.near_account_id.clone(),
            self.config.near_private_key.clone(),
            self.config.solver_bus_url.clone(),
            self.runeswap_client.clone(),
        );
        
        // Start the solver
        solver.start().await?;
        
        Ok(())
    }
}

/// Solver trait that will be implemented by different solver strategies
pub trait Solver {
    fn process_intent(&self) -> Result<(), Box<dyn std::error::Error>>;
    fn execute_swap(&self) -> Result<(), Box<dyn std::error::Error>>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Token, SwapIntent};
    
    #[test]
    fn test_create_solver() {
        let config = Config::new(
            "test_api_key".to_string(),
            "test.near".to_string(),
            "test_private_key".to_string(),
            "wss://test.runeswap.io".to_string(),
        );
        
        let solver = RuneSwapSolver::new(config);
        
        assert_eq!(solver.config.runeswap_api_key, "test_api_key");
        assert_eq!(solver.config.near_account_id, "test.near");
    }
    
    #[test]
    fn test_create_swap_intent() {
        let from_token = Token {
            symbol: "ETH".to_string(),
            address: "0xETH".to_string(),
            decimals: 18,
        };
        
        let to_token = Token {
            symbol: "USDC".to_string(),
            address: "0xUSDC".to_string(),
            decimals: 6,
        };
        
        let intent = SwapIntent {
            id: "test_intent_1".to_string(),
            from_token,
            to_token,
            amount: "1000000000000000000".to_string(), // 1 ETH
            min_amount_out: "1900000000".to_string(),  // 1900 USDC
            deadline: 1682661234,
        };
        
        assert_eq!(intent.from_token.symbol, "ETH");
        assert_eq!(intent.to_token.symbol, "USDC");
        assert_eq!(intent.amount, "1000000000000000000");
    }
}

// Export modules (to be added in future commits) 