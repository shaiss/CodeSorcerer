# RuneSwap Solver for NEAR Intents

This module provides integration between RuneSwap and NEAR Intents, enabling seamless token swaps across these platforms.

## Features

- Token swap integration between RuneSwap and NEAR blockchain
- Efficient price discovery and execution via the NEAR Intents protocol
- Full support for RuneSwap API
- Implementation of the solver pattern for optimal execution

## Overview

This solver works by:

1. Monitoring for swap intents on the NEAR blockchain
2. Calculating optimal swap routes and prices using RuneSwap API
3. Executing the swaps and reporting back to the NEAR Intents protocol

## Implementation Status

The core functionality is complete, including:

- Configuration management with environment variables
- RuneSwap API client for fetching quotes and executing swaps
- NEAR Intents solver with WebSocket integration
- Structured message types for solver bus communication
- Signal handling for graceful shutdown
- Unit tests for basic functionality

Future enhancements will include:
- More comprehensive test coverage
- Better error handling and retries
- Support for additional token types
- Performance optimizations

## Usage

The solver can be deployed as a service that continuously monitors for new intents and provides swap solutions:

```sh
cargo run --release
```

## Configuration

Configuration is handled via environment variables:

- `RUNESWAP_API_KEY`: Your API key for RuneSwap
- `NEAR_ACCOUNT_ID`: The account ID to use for NEAR transactions
- `NEAR_PRIVATE_KEY`: The private key for signing transactions
- `SOLVER_BUS_URL`: URL of the solver bus to connect to

You can set these variables in your environment or use a `.env` file.

## Development

### Prerequisites

- Rust 1.70 or later
- Access to RuneSwap API
- NEAR account with sufficient funds

### Building

```sh
cargo build --release
```

### Testing

To run the test suite:

```sh
cargo test
```

### Local Development

For local development, you can use the following command to start the solver with debug logs:

```sh
RUST_LOG=debug cargo run
```

## Architecture

The solver is built with a modular architecture:

- `main.rs`: Entry point with signal handling
- `lib.rs`: Core solver implementation
- `config.rs`: Configuration management
- `runeswap.rs`: API client for RuneSwap
- `solver.rs`: NEAR Intents solver implementation
- `types.rs`: Type definitions for messages and data structures

## License

MIT 