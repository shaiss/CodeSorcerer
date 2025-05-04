// Configuration management for the RuneSwap solver
use std::env;
use std::error::Error;

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Missing environment variable: {0}")]
    MissingEnv(String),
    
    #[error("Invalid NEAR account ID: {0}")]
    InvalidNearAccountId(String),
    
    #[error("Environment variable error: {0}")]
    EnvError(#[from] env::VarError),
}

/// Configuration struct for the RuneSwap solver
#[derive(Debug, Clone)]
pub struct Config {
    /// API key for the RuneSwap service
    pub runeswap_api_key: String,
    
    /// Account ID for the NEAR blockchain
    pub near_account_id: String,
    
    /// Private key for the NEAR account
    pub near_private_key: String,
    
    /// URL for the solver bus
    pub solver_bus_url: String,
}

impl Config {
    /// Create a new configuration with default values
    pub fn new(
        runeswap_api_key: String,
        near_account_id: String,
        near_private_key: String,
        solver_bus_url: String,
    ) -> Self {
        Self {
            runeswap_api_key,
            near_account_id,
            near_private_key,
            solver_bus_url,
        }
    }
    
    /// Create a configuration from environment variables
    pub fn from_env() -> Result<Self, Box<dyn Error>> {
        let runeswap_api_key = env::var("RUNESWAP_API_KEY")
            .map_err(|_| ConfigError::MissingEnv("RUNESWAP_API_KEY".to_string()))?;
            
        let near_account_id = env::var("NEAR_ACCOUNT_ID")
            .map_err(|_| ConfigError::MissingEnv("NEAR_ACCOUNT_ID".to_string()))?;
            
        let near_private_key = env::var("NEAR_PRIVATE_KEY")
            .map_err(|_| ConfigError::MissingEnv("NEAR_PRIVATE_KEY".to_string()))?;
            
        let solver_bus_url = env::var("SOLVER_BUS_URL")
            .unwrap_or_else(|_| "wss://solver-bus.runeswap.io".to_string());
        
        Ok(Self::new(
            runeswap_api_key,
            near_account_id,
            near_private_key,
            solver_bus_url,
        ))
    }
} 