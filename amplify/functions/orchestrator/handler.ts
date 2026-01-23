import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { z } from 'zod';

/**
 * Moolah Orchestrator - ULTIMATE RELIABILITY EDITION
 */

// Core Config Discovery
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
    const graphqlEndpoint = getEnv('AMPLIFY_DATA_GRAPHQL_ENDPOINT');
    const awsRegion = getEnv('AWS_REGION') || 'us-east-1';

    if (!cachedClient) {
        console.log(`[ORC] DISCOVERY: GraphQL Endpoint: ${graphqlEndpoint ? 'PRESENT' : 'MISSING'}`);
        try {
            const currentConfig = Amplify.getConfig();
            if (!currentConfig.API?.GraphQL?.endpoint && graphqlEndpoint) {
                console.log('[ORC] Manually configuring Amplify with v6 Outputs structure...');
                Amplify.configure({
                    version: "1",
                    data: {
                        url: graphqlEndpoint,
                        aws_region: awsRegion,
                        default_authorization_type: "AWS_IAM",
                        authorization_types: ["AWS_IAM"]
                    }
                } as any);
            }
            cachedClient = generateClient<Schema>({
                authMode: 'iam',
            });
            console.log('[ORC] Data Client initialized successfully.');
        } catch (e) {
            console.error('[ORC] CRITICAL: Client Generation Failed:', e);
            throw e;
        }
    }
    return cachedClient;
}


export const handler = async (event: any) => {
    console.log('[ORC] Brain Triggered');
    const client = getClient();
    const awsRegion = getEnv('AWS_REGION') || 'us-east-1';
    const bedrock = new BedrockRuntimeClient({ region: awsRegion });

    try {
        // Step 1: Context Gathering (Holdings + Global Fundamentals)
        const { data: holdings } = await client.models.Holding.list();
        const { data: fundamentals } = await client.models.MarketFundamental.list({ limit: 60 });

        // Step 2: Prompting
        const prompt = `
            You are the Moolah Agentic Portfolio Optimizer. 
            CONTEXT:
            - User Portfolio: ${JSON.stringify(holdings)}
            - Market Intelligence: ${JSON.stringify(fundamentals)}
            
            GOAL: Suggest a rebalanced portfolio (max 30 holdings) optimized for:
            1. Payout Safety (< 75%)
            2. Financial Strength (Debt/Equity < 1.5)
            3. Alpha vs VIG Benchmark
            
            OUTPUT RULES:
            - Return ONLY valid JSON.
            - Follow schema: {"targetPortfolio": [...], "explanation": {...}}
        `;

        // Step 3: Bedrock
        const bedrockResponse = await bedrock.send(new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1500,
                messages: [{ role: "user", content: prompt }]
            })
        }));

        const resultBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        const aiOutputText = resultBody.content[0].text;

        // Step 4: Extraction & Validation
        const jsonMatch = aiOutputText.match(/\{[\s\S]*\}/);
        const validatedOutput = AIRecommendationSchema.parse(JSON.parse(jsonMatch ? jsonMatch[0] : aiOutputText));

        // Step 5: Save Results
        const rec = await client.models.Recommendation.create({
            status: 'COMPLETED',
            packetJson: JSON.stringify({
                asOf: new Date().toISOString().split('T')[0],
                benchmark: "VIG",
                targetPortfolio: validatedOutput.targetPortfolio,
                metrics: { yield: 0.035, beta: 0.85 }
            }),
            explanationJson: JSON.stringify(validatedOutput.explanation)
        });

        await client.models.AuditLog.create({
            action: 'AI_OPTIMIZATION_SUCCESS',
            details: `Plan ready: ${validatedOutput.targetPortfolio.length} tickers.`
        });

        return JSON.stringify({
            status: 'SUCCESS',
            id: rec.data?.id,
            explanation: validatedOutput.explanation
        });

    } catch (err: any) {
        console.error("[ORC] Failure:", err);

        // Fail-safe audit log
        try {
            await client.models.AuditLog.create({
                action: 'AI_OPTIMIZATION_FAILED',
                details: err.message || 'Unknown Error'
            });
        } catch (e) {
            console.error("[ORC] Audit fail-safe also failed.");
        }

        return JSON.stringify({
            status: 'FAILED',
            error: err.message || 'Internal Orchestrator Error'
        });
    }
};
