import { useState, useEffect, useCallback } from 'react';
import { client } from '../client';

/**
 * Hook to manage portfolio metrics, ROI, and income calculations.
 * Encapsulates data fetching from Amplify and reactive updates.
 */
export function usePortfolioMetrics() {
    const [totalInvested, setTotalInvested] = useState(0);
    const [marketValue, setMarketValue] = useState(0);
    const [annualIncome, setAnnualIncome] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [holdingsTickers, setHoldingsTickers] = useState<string[]>([]);
    const [currentHoldings, setCurrentHoldings] = useState<any[]>([]);

    const calculateMetrics = useCallback(async (holdings: any[]) => {
        let costTotal = 0;
        let marketTotal = 0;
        let incomeTotal = 0;
        const tickers: string[] = [];

        for (const holding of holdings) {
            tickers.push(holding.ticker);
            const holdingCost = holding.shares * (holding.costBasis || 0);
            costTotal += holdingCost;

            try {
                // Fetch latest price from global market table
                const { data: prices } = await client.models.MarketPrice.listMarketPriceByTickerAndDate(
                    { ticker: holding.ticker },
                    { limit: 1, sortDirection: 'desc' }
                );

                let currentPrice = (holding.costBasis || 0);
                if (prices && prices.length > 0) {
                    currentPrice = prices[0].close || currentPrice;
                }
                marketTotal += holding.shares * currentPrice;

                // Fetch latest fundamentals for dividend yield
                const { data: fundamentals } = await client.models.MarketFundamental.listMarketFundamentalByTickerAndAsOf(
                    { ticker: holding.ticker },
                    { limit: 1, sortDirection: 'desc' }
                );

                if (fundamentals && fundamentals.length > 0) {
                    const yieldPct = fundamentals[0].dividendYield || 0;
                    incomeTotal += (holding.shares * currentPrice) * yieldPct;
                }
            } catch (e) {
                console.warn(`[METRICS] Failed to fetch data for ${holding.ticker}`, e);
                marketTotal += holdingCost;
            }
        }

        setHoldingsTickers(tickers);
        setTotalInvested(costTotal);
        setMarketValue(marketTotal);
        setAnnualIncome(incomeTotal);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const sub = client.models.Holding.observeQuery().subscribe({
            next: ({ items }) => {
                setCurrentHoldings(items);
                calculateMetrics(items);
            },
            error: (err) => console.error("[METRICS] ObserveQuery failed:", err)
        });
        return () => sub.unsubscribe();
    }, [calculateMetrics]);

    const roiPercentage = totalInvested > 0 ? ((marketValue - totalInvested) / totalInvested) * 100 : 0;

    return {
        totalInvested,
        marketValue,
        annualIncome,
        isLoading,
        holdingsTickers,
        currentHoldings,
        roiPercentage,
        isPositive: roiPercentage >= 0,
        refresh: () => calculateMetrics(currentHoldings)
    };
}
