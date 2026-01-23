import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BackendTestPage from '../pages/BackendTestPage';
import { BrowserRouter } from 'react-router-dom';

// Stable mock client to prevent infinite re-render loops in tests
const mockClient = {
    models: {
        Holding: {
            list: vi.fn().mockResolvedValue({ data: [] }),
            observeQuery: vi.fn().mockReturnValue({
                subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
            })
        },
        MarketPrice: {
            list: vi.fn().mockResolvedValue({ data: [] })
        },
        AuditLog: {
            observeQuery: vi.fn().mockReturnValue({
                subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
            })
        }
    }
};

vi.mock('../client', () => ({
    getClient: () => mockClient
}));

vi.mock('../hooks/useCloudActions', () => ({
    useCloudActions: () => ({
        syncMarketData: vi.fn(),
        runOptimization: vi.fn(),
        isSyncing: false,
        isOptimizing: false
    })
}));

describe('BackendTestPage', () => {
    it('renders without crashing (smoke test)', () => {
        render(
            <BrowserRouter>
                <BackendTestPage />
            </BrowserRouter>
        );
        expect(screen.getByText(/System Diagnostics/i)).toBeDefined();
    });

    it('displays the console header', () => {
        render(
            <BrowserRouter>
                <BackendTestPage />
            </BrowserRouter>
        );
        expect(screen.getByText(/Amplify Diagnostic Stream/i)).toBeDefined();
    });
});
