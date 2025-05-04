import axios from 'axios';

export class KestraService {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.baseUrl = process.env['NEXT_PUBLIC_KESTRA_API_URL']!;
        this.apiKey = process.env['NEXT_PUBLIC_KESTRA_API_KEY']!;
    }

    // Create and trigger workflow execution
    async executeWorkflow(namespace: string, flowId: string, inputs?: any) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/v1/executions/trigger/${namespace}/${flowId}`,
                { inputs },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error executing Kestra workflow:', error);
            throw error;
        }
    }

    // Monitor workflow execution status
    async getExecutionStatus(executionId: string) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/api/v1/executions/${executionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error getting execution status:', error);
            throw error;
        }
    }
}