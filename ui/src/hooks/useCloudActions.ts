import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

/**
 * Hook for managing cloud-side orchestration actions (Sync, Optimize).
 * Uses direct GraphQL calls to ensure reliability across schema updates.
 */
export function useCloudActions() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const syncMarketData = async (tickers: string[]) => {
        if (!tickers.length) return;
        setIsSyncing(true);
        try {
            const syncMutation = `
                mutation SyncMarketData($tickers: [String]) {
                    syncMarketData(tickers: $tickers)
                }
            `;
            const response: any = await client.graphql({
                query: syncMutation,
                variables: { tickers }
            });
            if (response.errors) throw new Error(response.errors[0].message);
            return response.data.syncMarketData;
        } finally {
            setIsSyncing(false);
        }
    };

    const runOptimization = async (targetYield: number = 0.04) => {
        setIsOptimizing(true);
        try {
            const optimMutation = `
                mutation RunOptimization($constraints: JSON) {
                    runOptimization(constraintsJson: $constraints)
                }
            `;
            const response: any = await client.graphql({
                query: optimMutation,
                variables: { constraints: JSON.stringify({ targetYield }) }
            });
            if (response.errors) throw new Error(response.errors[0].message);
            const result = JSON.parse(response.data.runOptimization || "{}");
            if (result.status === 'FAILED') throw new Error(result.error);
            return result;
        } finally {
            setIsOptimizing(false);
        }
    };

    return {
        isSyncing,
        isOptimizing,
        syncMarketData,
        runOptimization
    };
}
