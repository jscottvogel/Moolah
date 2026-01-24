import { defineFunction, secret } from '@aws-amplify/backend';

export const marketWorker = defineFunction({
    name: 'market-worker',
    entry: './handler.ts',
    timeoutSeconds: 60, // SQS usually 30-60s batches, but single item processing is fast.
    memoryMB: 512,
    resourceGroupName: 'data',
    environment: {
        ALPHA_VANTAGE_API_KEY: secret('ALPHA_VANTAGE_API_KEY')
    }
});
