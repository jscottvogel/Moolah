import { defineFunction } from '@aws-amplify/backend';

export const marketScheduler = defineFunction({
    name: 'market-scheduler',
    entry: './handler.ts',
    timeoutSeconds: 300,
});
