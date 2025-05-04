import { Request, Response } from 'express';
import { zeroXSwapService, NATIVE_TOKEN_ADDRESS, WETH_ADDRESS } from '../services/0x/swap-service';

/**
 * Controller for 0x Swap API related endpoints
 */
export class ZeroXController {
  /**
   * Get price quote for a token swap
   */
  async getPrice(req: Request, res: Response) {
    try {
      const { sellToken, buyToken, sellAmount, buyAmount, chainId, takerAddress } = req.query;

      // Validate required parameters
      if ((!sellToken || !buyToken) || (!sellAmount && !buyAmount)) {
        return res.status(400).json({
          error: 'Missing required parameters. Need sellToken, buyToken, and either sellAmount or buyAmount'
        });
      }

      const price = await zeroXSwapService.getPrice({
        sellToken: sellToken as string,
        buyToken: buyToken as string,
        sellAmount: sellAmount as string | undefined,
        buyAmount: buyAmount as string | undefined,
        chainId: chainId ? parseInt(chainId as string, 10) : undefined,
        takerAddress: takerAddress as string | undefined,
      });

      return res.status(200).json(price);
    } catch (error) {
      console.error('Error in getPrice controller:', error);
      return res.status(500).json({
        error: 'Failed to get price quote',
        message: error.message
      });
    }
  }

  /**
   * Get a firm quote for a token swap
   */
  async getQuote(req: Request, res: Response) {
    try {
      const { 
        sellToken, 
        buyToken, 
        sellAmount, 
        buyAmount, 
        takerAddress, 
        chainId, 
        slippagePercentage 
      } = req.query;

      // Validate required parameters
      if ((!sellToken || !buyToken || !takerAddress) || (!sellAmount && !buyAmount)) {
        return res.status(400).json({
          error: 'Missing required parameters. Need sellToken, buyToken, takerAddress, and either sellAmount or buyAmount'
        });
      }

      const quote = await zeroXSwapService.getQuote({
        sellToken: sellToken as string,
        buyToken: buyToken as string,
        sellAmount: sellAmount as string | undefined,
        buyAmount: buyAmount as string | undefined,
        takerAddress: takerAddress as string,
        chainId: chainId ? parseInt(chainId as string, 10) : undefined,
        slippagePercentage: slippagePercentage as string | undefined,
      });

      return res.status(200).json(quote);
    } catch (error) {
      console.error('Error in getQuote controller:', error);
      return res.status(500).json({
        error: 'Failed to get swap quote',
        message: error.message
      });
    }
  }

  /**
   * Get information about whether a token is native or wrapped
   */
  async getTokenInfo(req: Request, res: Response) {
    try {
      const { tokenAddress } = req.params;

      if (!tokenAddress) {
        return res.status(400).json({
          error: 'Missing required parameter: tokenAddress'
        });
      }

      const isNative = zeroXSwapService.isNativeToken(tokenAddress);
      const isWrappedEth = zeroXSwapService.isWrappedEth(tokenAddress);

      return res.status(200).json({
        address: tokenAddress,
        isNative,
        isWrappedEth,
        nativeTokenAddress: NATIVE_TOKEN_ADDRESS,
        wrappedEthAddress: WETH_ADDRESS,
      });
    } catch (error) {
      console.error('Error in getTokenInfo controller:', error);
      return res.status(500).json({
        error: 'Failed to get token info',
        message: error.message
      });
    }
  }
}

// Export singleton instance
export const zeroXController = new ZeroXController(); 