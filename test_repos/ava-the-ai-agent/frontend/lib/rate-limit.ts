export function rateLimit({ interval }: { interval: number }) {
  const tokens = new Map();

  return {
    check: async (limit: number, token: string) => {
      const now = Date.now();
      const windowStart = now - interval;

      const tokenCount = tokens.get(token) || [];
      const validTokens = tokenCount.filter(
        (timestamp: number) => timestamp > windowStart
      );

      if (validTokens.length >= limit) {
        const error: any = new Error("Rate limit exceeded");
        error.status = 429;
        throw error;
      }

      validTokens.push(now);
      tokens.set(token, validTokens);

      return true;
    },
  };
}
