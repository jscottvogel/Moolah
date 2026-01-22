import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { z } from 'zod';

const client = generateClient<Schema>({
    authMode: 'iam',
});

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Interfaces
interface PortfolioItem {
    ticker: string;
    weight: number;
    score: number;
}

interface ComplianceIssue {
    type: string;
    message: string;
}

interface RecommendationPacket {
    asOf: string;
    benchmark: string;
    targetPortfolio: PortfolioItem[];
    compliance: ComplianceIssue[];
    metrics: {
        yield: number;
        beta: number;
    };
}

// Zod Schema for AI Output
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
    console.log('Orchestrator Brain Triggered', JSON.stringify(event));

    try {
        // 1. Fetch User Data
        // Since we are called via GraphQL, context contains identity
        const owner = event.identity?.username || 'system';

        // Fetch holdings for this user
        // Note: In custom mutation, we might need to handle owner filtering manually or via AppSync identity
        const { data: holdings } = await client.models.Holding.list();

        // 2. Fetch Market Context (Global)
        const { data: fundamentals } = await client.models.MarketFundamental.list({ limit: 50 });

        // 3. Construct AI Prompt
        const prompt = `
            You are the Moolah Agentic Portfolio Optimizer. 
            User Portfolio: ${JSON.stringify(holdings)}
            Market Intelligence: ${JSON.stringify(fundamentals)}
            
            Goal: Suggest a rebalanced portfolio (max 40 holdings) optimized for:
            1. Dividend Safety (Payout < 80%)
            2. Low Leverage (Debt/Equity < 2.0)
            3. Yield vs Benchmark (VIG)
            
            Return ONLY a JSON object matching this schema:
            {
              "targetPortfolio": [{"ticker": "STRING", "weight": NUMBER, "reason": "STRING"}],
              "explanation": {
                "summary": "STRING",
                "bullets": ["STRING"],
                "risksToWatch": ["STRING"]
              }
            }
        `;

        // 4. Invoke Bedrock (Claude 3 Haiku for speed/cost)
        const bedrockResponse = await bedrock.send(new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }]
            })
        }));

        const resultBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        const aiOutputText = resultBody.content[0].text;

        // Simple extraction in case AI adds preamble
        const jsonMatch = aiOutputText.match(/\{[\s\S]*\}/);
        const validatedOutput = AIRecommendationSchema.parse(JSON.parse(jsonMatch ? jsonMatch[0] : aiOutputText));

        // 5. Store Recommendation (Phase 4 Logic)
        const packet: RecommendationPacket = {
            asOf: new Date().toISOString().split('T')[0],
            benchmark: "VIG",
            targetPortfolio: validatedOutput.targetPortfolio.map(p => ({
                ticker: p.ticker,
                weight: p.weight,
                score: 85 // Mock score for now
            })),
            compliance: [],
            metrics: { yield: 0.032, beta: 0.9 }
        };

        const rec = await client.models.Recommendation.create({
            status: 'COMPLETED',
            packetJson: JSON.stringify(packet),
            explanationJson: JSON.stringify(validatedOutput.explanation)
        });

        return JSON.stringify({
            status: 'SUCCESS',
            id: rec.data?.id,
            packet,
            explanation: validatedOutput.explanation
        });

    } catch (err) {
        console.error("Agentic Optimization Failed:", err);
        return JSON.stringify({
            status: 'FAILED',
            error: err instanceof Error ? err.message : 'Unknown error'
        });
    }
};
