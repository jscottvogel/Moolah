import { renderHook } from '@testing-library/react';
import { useCloudActions } from '../hooks/useCloudActions';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getClient } from '../client';

// Mock the client singleton
vi.mock('../client', () => ({
    getClient: vi.fn()
}));

describe('useCloudActions Hook', () => {
    let mockClient: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient = {
            graphql: vi.fn()
        };
        (getClient as any).mockReturnValue(mockClient);
    });

    it('initializes with default loading states', () => {
        const { result } = renderHook(() => useCloudActions());
        expect(result.current.isSyncing).toBe(false);
        expect(result.current.isOptimizing).toBe(false);
    });

    it('handles successful syncMarketData call', async () => {
        const mockResponse = {
            data: { syncMarketData: JSON.stringify({ status: 'ACCEPTED', count: 2 }) },
            errors: null
        };
        mockClient.graphql.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useCloudActions());
        const syncResult = await result.current.syncMarketData(['AAPL', 'MSFT']);

        expect(mockClient.graphql).toHaveBeenCalledWith(expect.objectContaining({
            variables: { tickers: ['AAPL', 'MSFT'] }
        }));
        expect(syncResult).toBe(mockResponse.data.syncMarketData);
    });

    it('handles GraphQL errors in syncMarketData', async () => {
        const mockResponse = {
            data: null,
            errors: [{ message: 'Access Denied' }]
        };
        mockClient.graphql.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useCloudActions());

        await expect(result.current.syncMarketData(['AAPL']))
            .rejects.toThrow('Access Denied');
    });

    it('handles successful runOptimization call', async () => {
        const mockResult = { status: 'SUCCESS', explanation: { summary: 'Looks good' } };
        const mockResponse = {
            data: { runOptimization: JSON.stringify(mockResult) },
            errors: null
        };
        mockClient.graphql.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useCloudActions());
        const optimResult = await result.current.runOptimization(0.05);

        expect(mockClient.graphql).toHaveBeenCalledWith(expect.objectContaining({
            variables: { constraints: JSON.stringify({ targetYield: 0.05 }) }
        }));
        expect(optimResult).toEqual(mockResult);
    });

    it('handles failed optimization status from agent', async () => {
        const mockResult = { status: 'FAILED', error: 'Market data missing' };
        const mockResponse = {
            data: { runOptimization: JSON.stringify(mockResult) },
            errors: null
        };
        mockClient.graphql.mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useCloudActions());

        await expect(result.current.runOptimization())
            .rejects.toThrow('Market data missing');
    });

    it('throws error if client is not initialized', async () => {
        (getClient as any).mockReturnValue(null);
        const { result } = renderHook(() => useCloudActions());

        await expect(result.current.syncMarketData(['AAPL']))
            .rejects.toThrow('Amplify Data Client could not be initialized');
    });
});
