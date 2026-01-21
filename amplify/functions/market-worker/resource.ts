import { defineFunction } from '@aws-amplify/backend';

export const marketWorker = defineFunction({
    name: 'market-worker',
    entry: './handler.ts',
    timeoutSeconds: 60, // SQS usually 30-60s batches, but single item processing is fast.
    memoryMB: 512,
});
