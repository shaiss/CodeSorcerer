interface SmartAccountParams {
    owner: string;
    recoveryMechanism: string[];
    paymaster: string;
}

interface SessionKeyParams {
    walletAddress: string;
    permissions: {
        contractAbi: string;
        allowedMethods: string[];
    }[];
    expiry: number;
    metadata: {
        label: string;
        restricted: boolean;
    };
}

export class FunctorService {
    private static readonly RPC_URL = 'http://54.163.51.119:3007';
    private static readonly API_KEY = process.env.NEXT_PUBLIC_FUNCTOR_API_KEY;

    static async createSmartAccount({ owner, recoveryMechanism, paymaster }: SmartAccountParams) {
        try {
            const response = await fetch(this.RPC_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.API_KEY!
                },
                body: JSON.stringify({
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'functor_createSmartAccount',
                    params: [owner, recoveryMechanism, paymaster]
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Error creating smart account:', error);
            throw error;
        }
    }

    static async createSessionKey(params: SessionKeyParams) {
        try {
            const response = await fetch(this.RPC_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.API_KEY!
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'functor_createSessionKey',
                    params: [
                        params.walletAddress,
                        params.permissions,
                        params.expiry,
                        params.metadata
                    ],
                    id: 1
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Error creating session key:', error);
            throw error;
        }
    }
}