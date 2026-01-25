import { defineFunction } from '@aws-amplify/backend';

export const alphaVantageHealth = defineFunction({
    name: 'alpha-vantage-health',
    entry: './handler.ts'
});
