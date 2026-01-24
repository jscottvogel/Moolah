import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { z } from 'zod';

/**
 * Moolah Orchestrator - "NUCLEAR OPTION" NO-LIBRARY EDITION
 */

const getEnv = (key: string) => process.env[key];

// 1. Core Config Getters
const getCfg = () => ({
    endpoint: getEnv('AMPLIFY_DATA_GRAPHQL_ENDPOINT') || getEnv('AWS_APPSYNC_GRAPHQL_ENDPOINT'),
    region: getEnv('GRAPHQL_REGION') || getEnv('AWS_REGION') || 'us-east-1'
});

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

async function signedRequest(query: string, variables: any = {}) {
    const { endpoint, region } = getCfg();
    if (!endpoint) throw new Error("AppSync Endpoint missing");

    const url = new URL(endpoint);
    const body = JSON.stringify({ query, variables });
    const signer = new SignatureV4({
        credentials: defaultProvider(),
        region: region,
        service: 'appsync',
        sha256: Sha256
    });
    const request = new HttpRequest({
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname,
        body: body,
        headers: { 'Content-Type': 'application/json', host: url.hostname }
    });
    const signed = await signer.sign(request);
    const response = await fetch(endpoint, {
        method: signed.method,
        headers: signed.headers as any,
        body: signed.body
    });
    const result: any = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
}

async function logToAudit(action: string, details: string, metadata: any = {}) {
    try {
        const mutation = `mutation L($i: CreateAuditLogInput!) { createAuditLog(input: $i) { id } }`;
        await signedRequest(mutation, { i: { action, details, metadata: JSON.stringify(metadata) } });
    } catch (e) { console.error('[ORC] Audit Fail:', e); }
}

export const handler = async (event: any) => {
    console.log('[ORC] Pulse');
    const correlationId = event.arguments?.correlationKey;
    const bedrock = new BedrockRuntimeClient({ region: getEnv('AWS_REGION') || 'us-east-1' });

    try {
        // Step 1: Context
        const qHoldings = `query List { listHoldings { items { ticker shares } } }`;
        const resH = await signedRequest(qHoldings);
        const holdings = resH.listHoldings.items;

        const qMarket = `query List { listMarketFundamentals(limit: 60) { items { ticker dividendYield payoutRatio debtToEquity } } }`;
        const resM = await signedRequest(qMarket);
        const fundamentals = resM.listMarketFundamentals.items;

        // Step 2: Reasoning
        const prompt = `You are the Moolah Optimizer. 
Context: 
Holdings: ${JSON.stringify(holdings)}
Market Fundamentals: ${JSON.stringify(fundamentals)}

Task: Suggest a rebalanced portfolio to optimize for dividends and risk.
Output must be ONLY a valid JSON object matching this schema:
{
  "targetPortfolio": [{"ticker": "string", "weight": number, "reason": "string"}],
  "explanation": {"summary": "string", "bullets": ["string"], "risksToWatch": ["string"]}
}

Return ONLY raw JSON. No conversational text or markdown blocks.`;

        const bResp = await bedrock.send(new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 2000,
                messages: [{ role: "user", content: prompt }]
            })
        }));

        const resultBody = JSON.parse(new TextDecoder().decode(bResp.body));
        const aiText = resultBody.content[0].text.trim();
        console.log('[ORC] Raw AI Response snippet:', aiText.substring(0, 100));

        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : aiText;

        let val;
        try {
            val = AIRecommendationSchema.parse(JSON.parse(jsonStr));
        } catch (parseErr: any) {
            console.error('[ORC] JSON Parse Fail. Content:', jsonStr);
            throw new Error(`AI returned invalid JSON: ${parseErr.message}`);
        }

        // Step 3: Persist
        const mutation = `mutation C($i: CreateRecommendationInput!) { createRecommendation(input: $i) { id } }`;
        const resC = await signedRequest(mutation, {
            i: {
                status: 'COMPLETED',
                packetJson: JSON.stringify({
                    asOf: new Date().toISOString().split('T')[0],
                    targetPortfolio: val.targetPortfolio
                }),
                explanationJson: JSON.stringify(val.explanation)
            }
        });

        await logToAudit('AI_OPTIM_SUCCESS', `Ready: ${val.targetPortfolio.length} tickers.`, { correlationId });

        return JSON.stringify({
            status: 'SUCCESS',
            id: resC.createRecommendation.id,
            explanation: val.explanation
        });

    } catch (err: any) {
        console.error("[ORC] Fatal:", err);
        const correlationId = event?.arguments?.correlationKey; // Re-fetch in catch block to be safe
        await logToAudit('AI_OPTIM_FAILED', err.message, { correlationId });
        return JSON.stringify({ status: 'FAILED', error: err.message });
    }
};
