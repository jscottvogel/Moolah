import { useState } from 'react';
import { getClient } from '../client';

/**
 * Hook for managing cloud-side orchestration actions (Sync, Optimize).
 * Uses direct GraphQL calls to ensure reliability across schema updates.
 */
export function useCloudActions() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    const getActiveClient = () => {
        const client = getClient();
        if (!client) throw new Error("Amplify Data Client could not be initialized. Check your configuration.");
        return client;
    };

    const syncMarketData = async (tickers: string[], correlationId?: string) => {
        if (!tickers.length) return;
        setIsSyncing(true);
        try {
            const client = getActiveClient();
            console.log("[CLOUD] Syncing tickers:", tickers);
            const syncMutation = `
                mutation RequestMarketSync($tickers: [String], $correlationId: String) {
                    requestMarketSync(tickers: $tickers, correlationId: $correlationId)
                }
            `;
            const response: any = await client.graphql({
                query: syncMutation,
                variables: { tickers, correlationId }
            });

            if (response.errors) {
                console.error("[CLOUD] GraphQL Errors:", response.errors);
                const detailedError = response.errors.map((e: any) => e.message).join(", ");
                throw new Error(detailedError || "Cloud sync mutation failed.");
            }

            if (!response.data?.requestMarketSync) {
                throw new Error("Cloud did not return a valid sync status.");
            }

            return response.data.requestMarketSync;
        } catch (err: any) {
            console.error("[CLOUD] Sync Exception:", err);
            const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            throw new Error(msg);
        } finally {
            setIsSyncing(false);
        }
    };

    const runOptimization = async (targetYield: number = 0.04, correlationId?: string) => {
        setIsOptimizing(true);
        try {
            const client = getActiveClient();
            console.log("[CLOUD] Running optimization with target yield:", targetYield);
            const optimMutation = `
                mutation RequestOptimization($constraints: AWSJSON, $correlationId: String) {
                    requestOptimization(constraintsJson: $constraints, correlationId: $correlationId)
                }
            `;
            const response: any = await client.graphql({
                query: optimMutation,
                variables: { constraints: JSON.stringify({ targetYield }), correlationId }
            });

            if (response.errors) {
                console.error("[CLOUD] GraphQL Errors:", response.errors);
                const detailedError = response.errors.map((e: any) => e.message).join(", ");
                throw new Error(detailedError || "AI Optimization mutation failed.");
            }

            const rawResult = response.data?.requestOptimization;
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

    const checkHealth = async () => {
        setIsCheckingHealth(true);
        try {
            const client = getActiveClient();
            const healthQuery = `
                query CheckAlphaVantageHealth {
                    checkAlphaVantageHealth
                }
            `;
            const response: any = await client.graphql({
                query: healthQuery
            });

            if (response.errors) {
                console.error("[CLOUD] Health Check Errors:", response.errors);
                const detailedError = response.errors.map((e: any) => e.message).join(", ");
                throw new Error(detailedError || "Health check query failed.");
            }

            const rawResult = response.data?.checkAlphaVantageHealth;
            if (!rawResult) throw new Error("Health check did not return a result.");

            return JSON.parse(rawResult);
        } catch (err: any) {
            console.error("[CLOUD] Health Check Exception:", err);
            const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
            throw new Error(msg);
        } finally {
            setIsCheckingHealth(false);
        }
    };

    return {
        isSyncing,
        isOptimizing,
        isCheckingHealth,
        syncMarketData,
        runOptimization,
        checkHealth
    };
}
