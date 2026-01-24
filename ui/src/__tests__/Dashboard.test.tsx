import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardHome } from '../pages/DashboardPage';
import { BrowserRouter } from 'react-router-dom';

// Mock the client
vi.mock('../client', () => ({
    getClient: () => ({
        models: {
            Holding: {
                observeQuery: vi.fn().mockReturnValue({
                    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
                }),
                list: vi.fn().mockResolvedValue({ data: [] })
            },
            MarketPrice: {
                listMarketPriceByTickerAndDate: vi.fn().mockResolvedValue({ data: [] })
            },
            MarketDividend: {
                listMarketDividendByTickerAndExDate: vi.fn().mockResolvedValue({ data: [] })
            }
        }
    })
}));

// Mock hooks
vi.mock('../hooks/useCloudActions', () => ({
    useCloudActions: () => ({
        syncMarketData: vi.fn(),
        runOptimization: vi.fn(),
        isSyncing: false,
        isOptimizing: false
    })
}));

vi.mock('../hooks/usePortfolioMetrics', () => ({
    usePortfolioMetrics: () => ({
        totalInvested: 8000,
        marketValue: 10000,
        annualIncome: 320,
        isLoading: false,
        holdingsTickers: ['AAPL', 'MSFT'],
        currentHoldings: [],
        roiPercentage: 25.0,
        isPositive: true,
        refresh: vi.fn()
    })
}));

describe('DashboardHome Regression', () => {
    it('renders the dashboard widgets correctly', async () => {
        render(
            <BrowserRouter>
                <DashboardHome />
            </BrowserRouter>
        );

        expect(screen.getByText('Dashboard')).toBeDefined();
        expect(screen.getByText('Portfolio Value')).toBeDefined(); // Stats Card
        expect(screen.getByText('Growth Analysis')).toBeDefined(); // Chart Title
        expect(screen.getByText('Action Center')).toBeDefined(); // Side panel
    });
});
