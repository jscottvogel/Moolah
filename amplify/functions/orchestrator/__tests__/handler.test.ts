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
            },
            Recommendation: {
                create: vi.fn().mockResolvedValue({ data: { id: 'test-rec-id' } }),
            },
            Holding: {
                list: vi.fn().mockResolvedValue({ data: [] }),
            },
            MarketFundamental: {
                list: vi.fn().mockResolvedValue({ data: [] }),
            }
        }
    })),
}));

// Mock Bedrock
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: class {
        send = vi.fn().mockResolvedValue({
            body: new TextEncoder().encode(JSON.stringify({
                content: [{
                    text: JSON.stringify({
                        targetPortfolio: [],
                        explanation: { summary: 'test', bullets: [], risksToWatch: [] }
                    })
                }]
            }))
        });
    },
    InvokeModelCommand: vi.fn(),
}));


describe('Orchestrator Handler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT = 'https://appsync.test.url';
        process.env.AWS_REGION = 'us-east-1';
    });

    it('should configure Amplify using v6 Outputs format', async () => {
        const event = {};
        const resultRaw = await handler(event);
        const result = JSON.parse(resultRaw);

        expect(Amplify.configure).toHaveBeenCalledWith(expect.objectContaining({
            version: "1",
            data: expect.objectContaining({
                url: 'https://appsync.test.url',
                default_authorization_type: "AWS_IAM"
            })
        }));
        expect(result.status).toBe('SUCCESS');
    });
});
