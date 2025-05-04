# 0x Swap API Integration

This project demonstrates the integration of the 0x Swap API into the AVA Portfolio Manager, providing users with the ability to swap tokens directly within the application. The integration showcases the power of the 0x Protocol for building DeFi applications.

## Features

- **Token Swapping**: Users can swap between various ERC20 tokens and native assets.
- **Price Quotes**: Get real-time price quotes and estimations before executing a swap.
- **Cross-Chain Support**: Integration works with multiple networks, including Ethereum and Monad.
- **Slippage Control**: Users can adjust slippage tolerance for their swaps.
- **Swap History**: Track and monitor past swaps within the application.
- **WebSocket Integration**: Real-time updates on swap status and events.

## Architecture

The integration is split between frontend and backend components:

### Frontend

- **Swap Interface Component**: A React component that provides the user interface for swapping tokens.
- **0x Swap Service**: A service that handles API calls to the backend for price quotes and swap execution.
- **WebSocket Event Bus**: Manages real-time communication with the server for swap status updates.

### Backend

- **0x Swap Service**: Handles communication with the 0x API for price quotes and swap building.
- **Swap Agent**: Manages swap execution and WebSocket connections for real-time updates.
- **API Routes**: RESTful endpoints for getting price quotes, firm quotes, and token information.

## Usage

To use the 0x Swap functionality:

1. Navigate to the Swap page from the main navigation bar.
2. Connect your wallet (if not already connected).
3. Select the token you want to sell and the token you want to buy.
4. Enter the amount you want to swap.
5. Adjust slippage tolerance if needed.
6. Click "Get Quote" to see the expected output.
7. Review the quote details (rate, price impact, gas estimation).
8. Click "Swap Tokens" to execute the swap.
9. Monitor the status of your swap in real-time.

## Implementation Details

### API Endpoints

The backend provides the following API endpoints:

- `GET /api/v1/0x/price`: Get a price quote for a token swap
- `GET /api/v1/0x/quote`: Get a firm quote for a token swap
- `GET /api/v1/0x/token/:tokenAddress`: Get information about a specific token

### WebSocket Events

The application uses WebSocket for real-time communication:

- `execute-swap`: Trigger a swap execution
- `swap-status`: Receive updates on swap status
- `price-result`: Receive price quote results
- `quote-result`: Receive firm quote results

### Token Support

The application supports various tokens, including:

- ETH (Native Ethereum)
- WETH (Wrapped Ethereum)
- USDC
- USDT
- DAI
- MNT (Monad native token)

## Configuration

The integration requires the following environment variables:

- `NEXT_PUBLIC_API_URL`: The URL for the backend API
- `NEXT_PUBLIC_WS_URL`: The WebSocket URL for real-time updates
- `RPC_URL`: The RPC URL for blockchain communication (server-side)

## Monad Chain Support

The 0x API integration has been specifically designed to support the Monad blockchain. Users can select Monad (chain ID 5000) from the network selector to swap tokens on the Monad network.

## Future Improvements

Potential future improvements for the 0x Swap integration:

1. **Token Lists**: Implement dynamic token lists from 0x API
2. **Gas Estimation**: More accurate gas estimations for swaps
3. **Advanced Routing**: Support for split routes and multiple hops
4. **Limit Orders**: Integration with 0x Limit Orders
5. **Swap Analytics**: Detailed analytics for swaps and pricing

## Submitting for Bounty

This integration has been developed for the "Best Use of 0x Swap API on Monad" bounty. It demonstrates a comprehensive integration of the 0x Swap API into a portfolio management application with specific support for the Monad blockchain.

## License

This project is licensed under the MIT License. 