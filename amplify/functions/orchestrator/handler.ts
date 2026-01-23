import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { z } from 'zod';

/**
 * Moolah Orchestrator - Agentic Reasoning Engine
 * 
 * DESIGN RATIONALE:
 * We use a "Model-as-ORC" pattern where the LLM (Claude 3 Haiku) acts as the logic layer
 * for portfolio optimization. This reduces complex heuristic code in the backend.
 * 
 * FLOW:
 * 1. Gather context (User Holdings + Global Market Intelligence).
 * 2. Generate optimized rebalancing plan via Bedrock.
 * 3. Validate output against rigid Zod schemas to prevent "hallucinations".
 * 4. Persist recommendation for user review.
 */

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Validation Schema for AI Output
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

export const handler = async (event: any) => {
    console.log('[ORC] Brain Triggered');

    // Lazy initialization of the Data Client inside the handler
    // to ensure environment variables are present.
    console.log('[ORC] Relevant Env Keys:', Object.keys(process.env).filter(k => k.startsWith('AMPLIFY_')));
    const client = generateClient<Schema>({
        authMode: 'iam',
    });

    try {

        // Step 1: Context Gathering
        // We fetch the user's specific positions and the global quality metrics (Safety Gates)
        const { data: holdings } = await client.models.Holding.list();
        const { data: fundamentals } = await client.models.MarketFundamental.list({ limit: 60 });

        // Step 2: Reasoning Prompt Construction
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

        // Step 3: Bedrock Invocation
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

        // Step 5: Persistence
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
            details: `Generated recommendation with ${validatedOutput.targetPortfolio.length} tickers. Summary: ${validatedOutput.explanation.summary.substring(0, 100)}...`
        });

        return JSON.stringify({
            status: 'SUCCESS',
            id: rec.data?.id,
            explanation: validatedOutput.explanation
        });

    } catch (err) {
        console.error("[ORC] Optimization Failed:", err);

        await client.models.AuditLog.create({
            action: 'AI_OPTIMIZATION_FAILED',
            details: err instanceof Error ? err.message : 'Unknown orchestrator error'
        });

        return JSON.stringify({
            status: 'FAILED',
            error: err instanceof Error ? err.message : 'Unknown orchestrator error'
        });
    }
};
