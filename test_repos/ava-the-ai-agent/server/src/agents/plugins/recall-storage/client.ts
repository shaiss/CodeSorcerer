export class RecallClient {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  private async makeRequest(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.endpoint}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Recall API error: ${response.statusText}`);
    }

    return response.json();
  }

  async store(key: string, value: any): Promise<void> {
    await this.makeRequest('/store', {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
      }),
    });
  }

  async retrieve(key: string): Promise<any> {
    return this.makeRequest(`/retrieve/${encodeURIComponent(key)}`);
  }

  async search(
    query: string,
    options?: {
      namespace?: string;
      limit?: number;
      filter?: Record<string, any>;
    }
  ): Promise<Array<{ key: string; score: number; data: any }>> {
    return this.makeRequest('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        ...options,
      }),
    });
  }

  async delete(key: string): Promise<void> {
    await this.makeRequest(`/delete/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  async listNamespace(
    namespace: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<{ key: string; data: any }>> {
    return this.makeRequest('/list', {
      method: 'POST',
      body: JSON.stringify({
        namespace,
        ...options,
      }),
    });
  }
} 