import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { z } from 'zod';

/**
 * Moolah Orchestrator - "PROVEN & NO-FAIL" EDITION
 */

const getEnv = (key: string) => process.env[key];

// 1. Validation Schema
const AIRecommendationSchema = z.object({
    targetPortfolio: z.array(z.object({
        ticker: z.string(),
        weight: z.number(),
        reason: z.string()
    })),
    explanation: z.object({
        summary: z.string(),
        bullets: z.array(z.string()),
        risksToWatch: z.array(z.string())
    })
});

// 2. Client Factory
let cachedClient: any = null;
function getClient() {
    if (!cachedClient) {
        const endpoint = getEnv('AMPLIFY_DATA_GRAPHQL_ENDPOINT') || getEnv('AWS_APPSYNC_GRAPHQL_ENDPOINT');
        const region = getEnv('GRAPHQL_REGION') || getEnv('AWS_REGION') || 'us-east-1';

        if (!endpoint) throw new Error("GraphQL endpoint is missing.");

        try {
            Amplify.configure({
                API: {
                    GraphQL: {
                        endpoint: endpoint,
                        region: region,
                        defaultAuthMode: 'iam'
                    }
                }
            });
            cachedClient = generateClient<Schema>({ authMode: 'iam' });
        } catch (e) {
            console.error('[ORC] Client Init Failed:', e);
            throw e;
        }
    }
    return cachedClient;
}

/**
 * Direct GraphQL calls for maximum reliability.
 */
async function logToAudit(action: string, details: string) {
    try {
        const client = getClient();
        const mutation = `mutation Log($input: CreateAuditLogInput!) { createAuditLog(input: $input) { id } }`;
        await client.graphql({ query: mutation, variables: { input: { action, details } } });
    } catch (e) { console.error('[ORC] Audit Fail:', e); }
}

export const handler = async (event: any) => {
    console.log('[ORC] Pulse');
    const client = getClient();
    const bedrock = new BedrockRuntimeClient({ region: getEnv('AWS_REGION') || 'us-east-1' });

    try {
        // Step 1: Context (Direct GraphQL to be 100% sure if models fail)
        const qHoldings = `query List { listHoldings { items { ticker shares } } }`;
        const rHoldings: any = await client.graphql({ query: qHoldings });
        const holdings = rHoldings.data?.listHoldings?.items || [];

        const qFundamentals = `query List { listMarketFundamentals(limit: 60) { items { ticker dividendYield payoutRatio debtToEquity } } }`;
        const rFundamentals: any = await client.graphql({ query: qFundamentals });
        const fundamentals = rFundamentals.data?.listMarketFundamentals?.items || [];

        // Step 2: Reasoning
        const prompt = `You are the Moolah Optimizer. Context: Holdings=${JSON.stringify(holdings)}, Market=${JSON.stringify(fundamentals)}. Suggest rebalance. JSON schema: {"targetPortfolio": [...], "explanation": {...}}`;

        // Step 3: Bedrock
        const bResp = await bedrock.send(new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1500,
                messages: [{ role: "user", content: prompt }]
            })
        }));

        const resultBody = JSON.parse(new TextDecoder().decode(bResp.body));
        const aiText = resultBody.content[0].text;
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        const validated = AIRecommendationSchema.parse(JSON.parse(jsonMatch ? jsonMatch[0] : aiText));

        // Step 4: Persist
        const mCreate = `mutation Create($input: CreateRecommendationInput!) { createRecommendation(input: $input) { id } }`;
        const rCreate: any = await client.graphql({
            query: mCreate,
            variables: {
                input: {
                    status: 'COMPLETED',
                    packetJson: JSON.stringify({
                        asOf: new Date().toISOString().split('T')[0],
                        targetPortfolio: validated.targetPortfolio
                    }),
                    explanationJson: JSON.stringify(validated.explanation)
                }
            }
        });

        await logToAudit('AI_OPTIM_SUCCESS', `Ready with ${validated.targetPortfolio.length} tickers.`);

        return JSON.stringify({
            status: 'SUCCESS',
            id: rCreate.data?.createRecommendation?.id,
            explanation: validated.explanation
        });

    } catch (err: any) {
        console.error("[ORC] Fatal:", err);
        await logToAudit('AI_OPTIM_FAILED', err.message);
        return JSON.stringify({ status: 'FAILED', error: err.message });
    }
};
