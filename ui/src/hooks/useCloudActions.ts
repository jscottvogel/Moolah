import { useState } from 'react';
import { client } from '../client';

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
            console.log("[CLOUD] Syncing tickers:", tickers);
            const syncMutation = `
                mutation SyncMarketData($tickers: [String]) {
                    syncMarketData(tickers: $tickers)
                }
            `;
            const response: any = await client.graphql({
                query: syncMutation,
                variables: { tickers }
            });

            if (response.errors) {
                console.error("[CLOUD] GraphQL Errors:", response.errors);
                // Extracting as much detail as possible from GraphQL errors
                const detailedError = response.errors.map((e: any) => e.message).join(", ");
                throw new Error(detailedError || "Cloud sync mutation failed.");
            }

            if (!response.data?.syncMarketData) {
                throw new Error("Cloud did not return a valid sync status.");
            }

            return response.data.syncMarketData;
        } catch (err: any) {
            console.error("[CLOUD] Sync Exception:", err);
            const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            throw new Error(msg);
        } finally {
            setIsSyncing(false);
        }
    };

    const runOptimization = async (targetYield: number = 0.04) => {
        setIsOptimizing(true);
        try {
            console.log("[CLOUD] Running optimization with target yield:", targetYield);
            const optimMutation = `
                mutation RunOptimization($constraints: AWSJSON) {
                    runOptimization(constraintsJson: $constraints)
                }
            `;
            // Note: AWSJSON expects a stringified JSON
            const response: any = await client.graphql({
                query: optimMutation,
                variables: { constraints: JSON.stringify({ targetYield }) }
            });

            if (response.errors) {
                console.error("[CLOUD] GraphQL Errors:", response.errors);
                const detailedError = response.errors.map((e: any) => e.message).join(", ");
                throw new Error(detailedError || "AI Optimization mutation failed.");
            }

            const rawResult = response.data?.runOptimization;
            if (!rawResult) throw new Error("AI agent did not return a result.");

            const result = JSON.parse(rawResult || "{}");
            if (result.status === 'FAILED') throw new Error(result.error || "AI Reasoning failed.");
            return result;
        } catch (err: any) {
            console.error("[CLOUD] Optimization Exception:", err);
            const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            throw new Error(msg);
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
