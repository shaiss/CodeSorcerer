import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownUp, ArrowRight, Loader2 } from 'lucide-react';
import { zeroXSwapService, PriceResponse, QuoteResponse } from '@/app/services/0x-swap-service';
import { EventBus } from '@/app/types/event-bus';
import { ethers } from 'ethers';

// @kamal Placeholder token list, I will replace this with a more comprehensive list later
const commonTokens = [
  { symbol: 'ETH', name: 'Ethereum', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'WETH', name: 'Wrapped Ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  { symbol: 'MNT', name: 'Mantle', address: '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000', decimals: 18, chainId: 5000 },
];

interface SwapInterfaceProps {
  eventBus?: EventBus;
  walletAddress?: string;
  chainId?: number;
}

export function SwapInterface({ eventBus, walletAddress, chainId = 1 }: SwapInterfaceProps) {
  // State for the swap form
  const [sellToken, setSellToken] = useState<typeof commonTokens[0]>(commonTokens[0]);
  const [buyToken, setBuyToken] = useState<typeof commonTokens[0]>(commonTokens[1]);
  const [sellAmount, setSellAmount] = useState('1.0');
  const [buyAmount, setBuyAmount] = useState('');
  const [isExactSell, setIsExactSell] = useState(true);
  const [slippage, setSlippage] = useState('1.0'); // 1% default slippage
  
  // State for price/quote management
  const [priceResponse, setPriceResponse] = useState<PriceResponse | null>(null);
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapStatus, setSwapStatus] = useState<'idle' | 'approving' | 'swapping' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Calculate price when inputs change
  useEffect(() => {
    if (!sellToken || !buyToken || (!sellAmount && !buyAmount)) return;
    if (sellToken.address === buyToken.address) return;
    
    const getPrice = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let price;
        if (isExactSell) {
          const parsedAmount = zeroXSwapService.parseAmount(sellAmount, sellToken.decimals);
          price = await zeroXSwapService.getPrice({
            sellToken: sellToken.address,
            buyToken: buyToken.address,
            sellAmount: parsedAmount,
            takerAddress: walletAddress || undefined,
            chainId,
          });
          
          // Update the buy amount based on the price
          setBuyAmount(zeroXSwapService.formatAmount(price.buyAmount, buyToken.decimals));
        } else {
          const parsedAmount = zeroXSwapService.parseAmount(buyAmount, buyToken.decimals);
          price = await zeroXSwapService.getPrice({
            sellToken: sellToken.address,
            buyToken: buyToken.address,
            buyAmount: parsedAmount,
            takerAddress: walletAddress || undefined,
            chainId,
          });
          
          // Update the sell amount based on the price
          setSellAmount(zeroXSwapService.formatAmount(price.sellAmount, sellToken.decimals));
        }
        
        setPriceResponse(price);
      } catch (err) {
        const error = err as Error;
        console.error('Error getting price:', error);
        setError(error.message || 'Failed to get price');
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the price fetch to avoid too many requests
    const timeoutId = setTimeout(getPrice, 500);
    return () => clearTimeout(timeoutId);
  }, [sellToken, buyToken, sellAmount, buyAmount, isExactSell, walletAddress, chainId]);
  
  // Handle swapping the tokens
  const handleSwapTokens = () => {
    const temp = sellToken;
    setSellToken(buyToken);
    setBuyToken(temp);
    
    // Also swap the amounts and recalculate
    setIsExactSell(!isExactSell);
    
    if (isExactSell) {
      // Previously was exact sell, now it's exact buy
      const tempAmount = sellAmount;
      setSellAmount(buyAmount);
      setBuyAmount(tempAmount);
    } else {
      // Previously was exact buy, now it's exact sell
      const tempAmount = buyAmount;
      setBuyAmount(sellAmount);
      setSellAmount(tempAmount);
    }
  };
  
  // Handle getting a quote and executing the swap
  const handleGetQuote = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet to swap');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let quote;
      if (isExactSell) {
        const parsedAmount = zeroXSwapService.parseAmount(sellAmount, sellToken.decimals);
        quote = await zeroXSwapService.getQuote({
          sellToken: sellToken.address,
          buyToken: buyToken.address,
          sellAmount: parsedAmount,
          takerAddress: walletAddress,
          chainId,
          slippagePercentage: (parseFloat(slippage) / 100).toString(),
        });
      } else {
        const parsedAmount = zeroXSwapService.parseAmount(buyAmount, buyToken.decimals);
        quote = await zeroXSwapService.getQuote({
          sellToken: sellToken.address,
          buyToken: buyToken.address,
          buyAmount: parsedAmount,
          takerAddress: walletAddress,
          chainId,
          slippagePercentage: (parseFloat(slippage) / 100).toString(),
        });
      }
      
      setQuoteResponse(quote);
      
      // Notify the parent component or eventBus about the quote
      if (eventBus) {
        eventBus.emit('swap-quote-ready', { quote });
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error getting quote:', error);
      setError(error.message || 'Failed to get quote');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle the actual swap execution
  const handleSwap = async () => {
    if (!quoteResponse || !walletAddress) return;
    
    // This would normally be handled by a wallet integration
    // For now, we'll just emit an event that can be handled by the parent
    if (eventBus) {
      setSwapStatus('swapping');
      
      eventBus.emit('execute-swap', {
        quote: quoteResponse,
        sellToken,
        buyToken,
        walletAddress,
      });
      
      // Listen for the response
      const handleSwapResult = (result: any) => {
        if (result.success) {
          setSwapStatus('success');
        } else {
          setSwapStatus('error');
          setError(result.error || 'Swap failed');
        }
      };
      
      // Clean up the listener when component unmounts
      eventBus.subscribe('swap-result', handleSwapResult);
      return () => {
        eventBus.unsubscribe('swap-result', handleSwapResult);
      };
    } else {
      setError('Wallet integration not available');
    }
  };
  
  // Handle sell amount change
  const handleSellAmountChange = (value: string) => {
    setIsExactSell(true);
    setSellAmount(value);
  };
  
  // Handle buy amount change
  const handleBuyAmountChange = (value: string) => {
    setIsExactSell(false);
    setBuyAmount(value);
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">0x Swap</CardTitle>
        <CardDescription className="text-center">Powered by 0x Protocol API</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Sell Token Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">You Pay</label>
            {walletAddress && (
              <button 
                className="text-xs text-blue-500 hover:text-blue-700"
                onClick={() => {
                  // This would normally get the max balance
                  // For demo purposes, we'll just set a value
                  setSellAmount('10.0');
                  setIsExactSell(true);
                }}
              >
                Max
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Select 
              value={sellToken.address} 
              onValueChange={(value) => {
                const token = commonTokens.find(t => t.address === value);
                if (token) setSellToken(token);
              }}
            >
              <SelectTrigger className="w-1/3">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {commonTokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              value={sellAmount}
              onChange={(e) => handleSellAmountChange(e.target.value)}
              placeholder="0.0"
              className="w-2/3"
              step="0.000001"
              min="0"
            />
          </div>
        </div>
        
        {/* Swap Button */}
        <div className="flex justify-center my-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full h-8 w-8"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Buy Token Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">You Receive</label>
          
          <div className="flex gap-2">
            <Select 
              value={buyToken.address} 
              onValueChange={(value) => {
                const token = commonTokens.find(t => t.address === value);
                if (token) setBuyToken(token);
              }}
            >
              <SelectTrigger className="w-1/3">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {commonTokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              value={buyAmount}
              onChange={(e) => handleBuyAmountChange(e.target.value)}
              placeholder="0.0"
              className="w-2/3"
              step="0.000001"
              min="0"
            />
          </div>
        </div>
        
        {/* Price Info */}
        {priceResponse && !loading && (
          <div className="text-sm p-3 rounded bg-gray-100 dark:bg-gray-800 mb-4">
            <div className="flex justify-between">
              <span>Rate</span>
              <span>1 {sellToken.symbol} = {parseFloat(priceResponse.price).toFixed(6)} {buyToken.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact</span>
              <span>{parseFloat(priceResponse.estimatedPriceImpact).toFixed(2)}%</span>
            </div>
            {priceResponse.estimatedGas && (
              <div className="flex justify-between">
                <span>Estimated Gas</span>
                <span>{ethers.utils.formatUnits(priceResponse.estimatedGas, 'gwei')} Gwei</span>
              </div>
            )}
          </div>
        )}
        
        {/* Slippage Setting */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Slippage Tolerance</label>
          <div className="flex gap-2">
            <Button
              variant={slippage === '0.5' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSlippage('0.5')}
              className="flex-1"
            >
              0.5%
            </Button>
            <Button
              variant={slippage === '1.0' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSlippage('1.0')}
              className="flex-1"
            >
              1.0%
            </Button>
            <Button
              variant={slippage === '3.0' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSlippage('3.0')}
              className="flex-1"
            >
              3.0%
            </Button>
            <Input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              placeholder="Custom"
              className="flex-1"
              step="0.1"
              min="0.1"
              max="50"
            />
            <span className="flex items-center">%</span>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="text-red-500 text-sm p-2 mb-4 bg-red-50 dark:bg-red-900/20 rounded">
            {error}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={walletAddress ? (quoteResponse ? handleSwap : handleGetQuote) : undefined}
          disabled={loading || !sellAmount || !buyAmount || sellToken.address === buyToken.address || !walletAddress}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : !walletAddress ? (
            'Connect Wallet to Swap'
          ) : quoteResponse ? (
            'Swap Tokens'
          ) : (
            'Get Quote'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 