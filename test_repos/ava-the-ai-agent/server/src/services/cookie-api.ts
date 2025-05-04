import env from '../env';

const COOKIE_API_BASE_URL = 'https://api.cookie.fun';
const API_KEY = env.COOKIE_API_KEY;

export class CookieApiService {
  private headers: HeadersInit;

  constructor() {
    this.headers = {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    };
  }

  async getAgentByTwitter(twitterUsername: string, interval: '_3Days' | '_7Days' = '_7Days') {
    const response = await fetch(
      `${COOKIE_API_BASE_URL}/v2/agents/twitterUsername/${twitterUsername}?interval=${interval}`,
      { headers: this.headers }
    );
    return response.json();
  }

  async getAgentByContract(contractAddress: string, interval: '_3Days' | '_7Days' = '_7Days') {
    const response = await fetch(
      `${COOKIE_API_BASE_URL}/v2/agents/contractAddress/${contractAddress}?interval=${interval}`,
      { headers: this.headers }
    );
    return response.json();
  }

  async getAgentsPaged(interval: '_3Days' | '_7Days' = '_7Days', page = 1, pageSize = 10) {
    const response = await fetch(
      `${COOKIE_API_BASE_URL}/v2/agents/agentsPaged?interval=${interval}&page=${page}&pageSize=${pageSize}`,
      { headers: this.headers }
    );
    return response.json();
  }

  async searchTweets(searchQuery: string, from: string, to: string) {
    const response = await fetch(
      `${COOKIE_API_BASE_URL}/v1/hackathon/search/${encodeURIComponent(searchQuery)}?from=${from}&to=${to}`,
      { headers: this.headers }
    );
    return response.json();
  }
}