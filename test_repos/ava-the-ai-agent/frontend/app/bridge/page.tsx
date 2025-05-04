"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast"
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Supported Superchain networks
const SUPPORTED_NETWORKS = {
  10: 'OP Mainnet',
  420: 'OP Goerli',
  8453: 'Base',
  84531: 'Base Goerli',
  // Add more Superchain networks as needed
};

// Supported tokens (these should be SuperchainERC20 tokens)
const SUPPORTED_TOKENS = {
  'USDC': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      10: '0x0000...', // OP Mainnet USDC
      420: '0x0000...', // OP Goerli USDC
      8453: '0x0000...', // Base USDC
      84531: '0x0000...', // Base Goerli USDC
    }
  },
  // Add more tokens as needed
};

const bridgeFormSchema = z.object({
  fromChainId: z.string(),
  toChainId: z.string(),
  token: z.string(),
  amount: z.string().min(1, 'Amount is required'),
  recipient: z.string().min(42, 'Invalid address').max(42, 'Invalid address'),
});

type BridgeFormValues = z.infer<typeof bridgeFormSchema>;

export default function BridgePage() {
  const { toast } = useToast();
  const form = useForm<BridgeFormValues>({
    resolver: zodResolver(bridgeFormSchema),
    defaultValues: {
      fromChainId: '',
      toChainId: '',
      token: '',
      amount: '',
      recipient: '',
    },
  });

  const onSubmit = async (data: BridgeFormValues) => {
    try {
      // Send bridge request to backend
      const response = await fetch('/api/bridge/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromChainId: parseInt(data.fromChainId),
          toChainId: parseInt(data.toChainId),
          token: data.token,
          amount: data.amount,
          recipient: data.recipient,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate bridge');
      }

      const result = await response.json();

      toast({
        title: 'Bridge Initiated',
        description: `Transaction Hash: ${result.txHash}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate bridge. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Superchain Bridge</CardTitle>
          <CardDescription>
            Bridge tokens securely across Superchain networks using SuperchainERC20
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromChainId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Chain</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source chain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SUPPORTED_NETWORKS).map(([id, name]) => (
                            <SelectItem key={id} value={id}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toChainId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Chain</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination chain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SUPPORTED_NETWORKS).map(([id, name]) => (
                            <SelectItem key={id} value={id}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SUPPORTED_TOKENS).map(([symbol, token]) => (
                          <SelectItem key={symbol} value={symbol}>
                            {token.name} ({token.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Only SuperchainERC20 compatible tokens are supported
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter amount"
                        {...field}
                        type="number"
                        step="any"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0x..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The address that will receive the tokens on the destination chain
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">Bridge Tokens</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 