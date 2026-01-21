import { defineFunction } from '@aws-amplify/backend';

export const orchestrator = defineFunction({
    name: 'orchestrator',
    entry: './handler.ts',
    timeoutSeconds: 300,
    memoryMB: 1024,
});
