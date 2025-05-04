use runeswap_solver::RuneSwapSolver;
use std::error::Error;
use tokio::signal;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logger
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    
    log::info!("RuneSwap Solver - NEAR Intents Integration");
    
    // Initialize the solver with configuration from environment variables
    let solver = match RuneSwapSolver::init_default() {
        Ok(solver) => {
            log::info!("Solver initialized successfully");
            solver
        },
        Err(e) => {
            log::error!("Failed to initialize solver: {}", e);
            log::error!("Make sure all required environment variables are set");
            return Err(e);
        }
    };
    
    // Log configuration details (with sensitive data masked)
    log::info!("Using RuneSwap API key: {}", mask_api_key(&solver.config.runeswap_api_key));
    log::info!("Using NEAR account ID: {}", solver.config.near_account_id);
    log::info!("Connecting to solver bus: {}", solver.config.solver_bus_url);
    
    // Start the solver service in a separate task
    let solver_task = tokio::spawn(async move {
        if let Err(e) = solver.start().await {
            log::error!("Fatal error: {}", e);
            log::error!("RuneSwap solver terminated unexpectedly");
        }
    });
    
    // Wait for shutdown signal
    log::info!("Press Ctrl+C to shut down");
    match signal::ctrl_c().await {
        Ok(()) => {
            log::info!("Shutdown signal received, closing solver...");
            let _ = shutdown_tx.send(true); // Signal the solver to shut down
        },
        Err(e) => {
            log::error!("Failed to listen for shutdown signal: {}", e);
        }
    }
    
    // Wait for the solver task to finish
    if let Err(e) = solver_task.await {
        log::error!("Solver task encountered an error: {:?}", e);
    }
    
    log::info!("RuneSwap solver shutdown complete");
    Ok(())
}

// Utility function to mask API key for logging
fn mask_api_key(api_key: &str) -> String {
    if api_key.len() <= 8 {
        return "****".to_string();
    }
    
    let visible_chars = 4;
    format!("{}****{}", 
        &api_key[0..visible_chars], 
        &api_key[api_key.len() - visible_chars..])
} 