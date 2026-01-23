import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../handler';
import { Amplify } from 'aws-amplify';

// Mock Amplify
vi.mock('aws-amplify', () => ({
    Amplify: {
        configure: vi.fn(),
        getConfig: vi.fn(() => ({ API: {} })),
    }
}));

// Mock generateClient
vi.mock('aws-amplify/data', () => ({
    generateClient: vi.fn(() => ({
        models: {
            AuditLog: {
                create: vi.fn().mockResolvedValue({ data: { id: 'test-log-id' } }),
            }
        }
    })),
}));

// Mock SQS
vi.mock('@aws-sdk/client-sqs', () => ({
    SQSClient: class {
        send = vi.fn().mockResolvedValue({});
    },
    SendMessageCommand: vi.fn(),
}));



describe('Market Worker Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.MARKET_QUEUE_URL = 'https://sqs.test.url';
        process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = 'https://appsync.test.url';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('should configure Amplify manually if GraphQL endpoint is missing in config', async () => {
        const event = {
            arguments: { tickers: ['AAPL'] },
            info: { fieldName: 'syncMarketData' }
        };

        const resultRaw = await handler(event);
        const result = JSON.parse(resultRaw);

        expect(Amplify.configure).toHaveBeenCalledWith(expect.objectContaining({
            API: expect.objectContaining({
                GraphQL: expect.objectContaining({
                    endpoint: 'https://appsync.test.url'
                })
            })
        }));
        expect(result.status).toBe('ACCEPTED');
    });

    it('should return FAILED if QUEUE_URL is missing', async () => {
        delete process.env.MARKET_QUEUE_URL;
        const event = {
            arguments: { tickers: ['AAPL'] }
        };

        const resultRaw = await handler(event);
        const result = JSON.parse(resultRaw);

        expect(result.status).toBe('FAILED');
        expect(result.error).toContain('MARKET_QUEUE_URL');
    });
});
