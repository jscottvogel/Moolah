import { describe, it, expect, vi } from 'vitest';
import { handler } from './handler';

// Mocks
const mockGraphqlClient = {
    graphql: vi.fn()
};

const mockBedrockClient = {
    send: vi.fn().mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: JSON.stringify({ summary: 'Optimization complete' }) }]
        }))
    })
};

vi.mock('aws-amplify/data', () => ({
    generateClient: () => mockGraphqlClient
}));

vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
    BedrockRuntimeClient: vi.fn(() => mockBedrockClient),
    InvokeModelCommand: vi.fn()
}));

vi.mock('process', () => ({
    env: {
        AMPLIFY_DATA_GRAPHQL_ENDPOINT: 'https://api.appsync.aws'
    }
}));

describe('Orchestrator Handler', () => {
    it('runs optimization and logs with correlationKey', async () => {
        const event = {
            arguments: {
                constraintsJson: JSON.stringify({ targetYield: 0.05 }),
                correlationId: 'test-opt-456'
            }
        };

        mockGraphqlClient.graphql.mockResolvedValue({ data: {}, errors: null });

        const result = await handler(event);
        const parsed = JSON.parse(result);

        expect(parsed.status).toBe('SUCCESS');

        // Verify AuditLog creation included correlationKey in metadata
        expect(mockGraphqlClient.graphql).toHaveBeenCalledWith(expect.objectContaining({
            variables: expect.objectContaining({
                metadata: expect.stringContaining('test-opt-456')
            })
        }));
    });

    it('handles Bedrock failures gracefully', async () => {
        mockBedrockClient.send.mockRejectedValueOnce(new Error('ThrottlingException'));

        const event = {
            arguments: {
                constraintsJson: '{}',
                correlationId: 'test-fail-999'
            }
        };

        const result = await handler(event);
        const parsed = JSON.parse(result);

        expect(parsed.status).toBe('FAILED');
        expect(parsed.error).toContain('ThrottlingException');

        // Verify failure was logged to AuditLog
        expect(mockGraphqlClient.graphql).toHaveBeenCalledWith(expect.objectContaining({
            variables: expect.objectContaining({
                action: 'AI_OPTIM_FAILED',
                metadata: expect.stringContaining('test-fail-999')
            })
        }));
    });
});
