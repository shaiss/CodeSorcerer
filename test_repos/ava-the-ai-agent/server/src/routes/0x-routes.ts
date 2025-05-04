import { Hono } from 'hono';
import type { Environment } from '../env';
import { zeroXSwapService, NATIVE_TOKEN_ADDRESS, WETH_ADDRESS } from '../services/0x/swap-service';

const router = new Hono<Environment>();

// Get price quote for a token swap
router.get('/price', async (c) => {
  const { sellToken, buyToken, sellAmount, buyAmount, chainId, takerAddress } = c.req.query();

  // Validate required parameters
  if ((!sellToken || !buyToken) || (!sellAmount && !buyAmount)) {
    return c.json({
      error: 'Missing required parameters. Need sellToken, buyToken, and either sellAmount or buyAmount'
    }, 400);
  }

  try {
    const price = await zeroXSwapService.getPrice({
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      chainId: chainId ? parseInt(chainId, 10) : undefined,
      takerAddress,
    });

    return c.json(price);
  } catch (error) {
    console.error('Error in getPrice endpoint:', error);
    return c.json({
      error: 'Failed to get price quote',
      message: error.message
    }, 500);
  }
});

// Get a firm quote for a token swap
router.get('/quote', async (c) => {
  const { 
    sellToken, 
    buyToken, 
    sellAmount, 
    buyAmount, 
    takerAddress, 
    chainId, 
    slippagePercentage 
  } = c.req.query();

  // Validate required parameters
  if ((!sellToken || !buyToken || !takerAddress) || (!sellAmount && !buyAmount)) {
    return c.json({
      error: 'Missing required parameters. Need sellToken, buyToken, takerAddress, and either sellAmount or buyAmount'
    }, 400);
  }

  try {
    const quote = await zeroXSwapService.getQuote({
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      takerAddress,
      chainId: chainId ? parseInt(chainId, 10) : undefined,
      slippagePercentage,
    });

    return c.json(quote);
  } catch (error) {
    console.error('Error in getQuote endpoint:', error);
    return c.json({
      error: 'Failed to get swap quote',
      message: error.message
    }, 500);
  }
});

// Get token info
router.get('/token/:tokenAddress', async (c) => {
  const { tokenAddress } = c.req.param();

  if (!tokenAddress) {
    return c.json({
      error: 'Missing required parameter: tokenAddress'
    }, 400);
  }

  try {
    const isNative = zeroXSwapService.isNativeToken(tokenAddress);
    const isWrappedEth = zeroXSwapService.isWrappedEth(tokenAddress);

    return c.json({
      address: tokenAddress,
      isNative,
      isWrappedEth,
      nativeTokenAddress: NATIVE_TOKEN_ADDRESS,
      wrappedEthAddress: WETH_ADDRESS,
    });
  } catch (error) {
    console.error('Error in getTokenInfo endpoint:', error);
    return c.json({
      error: 'Failed to get token info',
      message: error.message
    }, 500);
  }
});

export default router; 