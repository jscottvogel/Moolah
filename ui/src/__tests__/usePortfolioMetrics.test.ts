import { renderHook, waitFor } from '@testing-library/react';
import { usePortfolioMetrics } from '../hooks/usePortfolioMetrics';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getClient } from '../client';

// Mock the client singleton
vi.mock('../client', () => ({
    getClient: vi.fn()
}));

describe('usePortfolioMetrics Hook', () => {
    let mockClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockClient = {
            models: {
                Holding: {
                    observeQuery: vi.fn()
                },
                MarketPrice: {
                    listMarketPriceByTickerAndDate: vi.fn()
                },
                MarketFundamental: {
                    listMarketFundamentalByTickerAndAsOf: vi.fn()
                }
            }
        };
        (getClient as any).mockReturnValue(mockClient);
    });

    it('initializes with default values', () => {
        // Setup initial subscription mock to do nothing
        mockClient.models.Holding.observeQuery.mockReturnValue({
            subscribe: () => ({ unsubscribe: vi.fn() })
        });

        const { result } = renderHook(() => usePortfolioMetrics());

        expect(result.current.isLoading).toBe(true);
        expect(result.current.totalInvested).toBe(0);
        expect(result.current.marketValue).toBe(0);
        expect(result.current.annualIncome).toBe(0);
    });

    it('calculates metrics correctly when holdings are provided', async () => {
        // Setup mocks for a single holding
        const mockHoldings = [
            { id: '1', ticker: 'MSFT', shares: 10, costBasis: 300 }
        ];

        // Mock the observeQuery to return our holding
        mockClient.models.Holding.observeQuery.mockReturnValue({
            subscribe: (callbacks: any) => {
                callbacks.next({ items: mockHoldings });
                return { unsubscribe: vi.fn() };
            }
        });

        // Mock Price: $350
        mockClient.models.MarketPrice.listMarketPriceByTickerAndDate.mockResolvedValue({
            data: [{ close: 350 }]
        });

        // Mock Yield: 2% (0.02)
        mockClient.models.MarketFundamental.listMarketFundamentalByTickerAndAsOf.mockResolvedValue({
            data: [{ dividendYield: 0.02 }]
        });

        const { result } = renderHook(() => usePortfolioMetrics());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Calculations:
        // Cost: 10 * 300 = 3000
        // Market Value: 10 * 350 = 3500
        // Income: 3500 * 0.02 = 70
        // ROI: (3500-3000)/3000 = 16.67%

        expect(result.current.totalInvested).toBe(3000);
        expect(result.current.marketValue).toBe(3500);
        expect(result.current.annualIncome).toBe(70);
        expect(result.current.roiPercentage).toBeCloseTo(16.666, 1);
        expect(result.current.isPositive).toBe(true);
    });
});
