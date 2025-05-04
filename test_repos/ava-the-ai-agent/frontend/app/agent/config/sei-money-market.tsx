import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from "@hooks/useForm";
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const seiMoneyMarketSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  baseURL: z.string().url('Must be a valid URL'),
  supportedTokens: z.array(z.object({
    address: z.string().min(1, 'Token address is required'),
    symbol: z.string().min(1, 'Token symbol is required'),
    decimals: z.number().min(0).max(18)
  })).min(1, 'At least one token must be configured')
});

type SeiMoneyMarketConfig = z.infer<typeof seiMoneyMarketSchema>;

export function SeiMoneyMarketConfig() {
  const { toast } = useToast();
  const form = useForm<SeiMoneyMarketConfig>({
    resolver: zodResolver(seiMoneyMarketSchema),
    defaultValues: {
      apiKey: '',
      baseURL: 'https://api.brahma.fi',
      supportedTokens: [
        {
          address: '',
          symbol: '',
          decimals: 18
        }
      ]
    }
  });

  const onSubmit = async (data: SeiMoneyMarketConfig) => {
    try {
      // Send configuration to backend
      const response = await fetch('/api/agent/config/sei-money-market', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast({
        title: 'Success',
        description: 'Sei Money Market agent configuration saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sei Money Market Agent Configuration</CardTitle>
        <CardDescription>
          Configure the Sei Money Market agent with Brahma ConsoleKit integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brahma API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your Brahma API key" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your Brahma API key for ConsoleKit integration
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Base URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.brahma.fi" {...field} />
                  </FormControl>
                  <FormDescription>
                    The base URL for Brahma's API
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('supportedTokens').map((_, index) => (
              <div key={index} className="space-y-4">
                <FormField
                  control={form.control}
                  name={`supportedTokens.${index}.address`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token {index + 1} Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter token address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`supportedTokens.${index}.symbol`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token {index + 1} Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter token symbol" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`supportedTokens.${index}.decimals`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token {index + 1} Decimals</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter token decimals"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.setValue('supportedTokens', [
                  ...form.watch('supportedTokens'),
                  { address: '', symbol: '', decimals: 18 }
                ])
              }
            >
              Add Token
            </Button>

            <Button type="submit">Save Configuration</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 