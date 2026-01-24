import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

// Mocks
const mockGraphqlClient = {
    graphql: vi.fn()
};

vi.mock('aws-amplify/data', () => ({
    generateClient: () => mockGraphqlClient
}));

vi.mock('process', () => ({
    env: {
        MARKET_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123/market-queue',
        AMPLIFY_DATA_GRAPHQL_ENDPOINT: 'https://api.appsync.aws'
    }
}));

// Mock SQS
vi.mock('@aws-sdk/client-sqs', () => {
    return {
        SQSClient: vi.fn(() => ({
            send: vi.fn().mockResolvedValue({})
        })),
        SendMessageBatchCommand: vi.fn(),
        DeleteMessageBatchCommand: vi.fn()
    };
});

describe('Market Worker Handler', () => {
    it('processes syncMarketData mutation and logs with correlationKey', async () => {
        const event = {
            arguments: {
                tickers: ['AAPL'],
                correlationId: 'test-req-123'
            }
        };

        mockGraphqlClient.graphql.mockResolvedValue({ data: {}, errors: null });

        const result = await handler(event);

        expect(result).toBe('ACCEPTED');

        // Verify AuditLog creation included correlationKey in metadata
        expect(mockGraphqlClient.graphql).toHaveBeenCalledWith(expect.objectContaining({
            variables: expect.objectContaining({
                metadata: expect.stringContaining('test-req-123')
            })
        }));
    });

    it('throws error if MARKET_QUEUE_URL is missing', async () => {
        const originalUrl = process.env.MARKET_QUEUE_URL;
        delete process.env.MARKET_QUEUE_URL;

        const event = {
            arguments: { tickers: ['AAPL'] }
        };

        await expect(handler(event)).resolves.toEqual(expect.stringContaining('FAILED'));

        process.env.MARKET_QUEUE_URL = originalUrl;
    });

    it('handles empty ticker list gracefully', async () => {
        const event = {
            arguments: { tickers: [] }
        };

        const result = await handler(event);
        expect(result).toBe('ACCEPTED');
    });
});
