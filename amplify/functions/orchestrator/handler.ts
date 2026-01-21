import type { Handler } from 'aws-lambda';
import { z } from 'zod';

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

// Zod Schema for Explanation
const ExplanationSchema = z.object({
    summary: z.string().min(50),
    bullets: z.array(z.string()).min(3),
    whatWouldChangeThis: z.array(z.string()),
    risksToWatch: z.array(z.string()),
    disclaimers: z.array(z.string()),
});

export const handler: Handler = async (event, context) => {
    console.log('Orchestrator triggered', JSON.stringify(event));

    // 1. Context Loading (Simulated)
    const userSettings = { maxHoldings: 40 };

    // 2. Optimization Strategy (Simulated for MVP)
    const packet: RecommendationPacket = {
        asOf: new Date().toISOString().split('T')[0],
        benchmark: "VIG",
        targetPortfolio: [
            { ticker: "MSFT", weight: 0.05, score: 92 },
            { ticker: "JNJ", weight: 0.04, score: 88 },
        ],
        compliance: [],
        metrics: { yield: 0.028, beta: 0.85 }
    };

    // 3. Generate Explanation check
    let explanation = null;
    try {
        explanation = await generateSafeExplanation(packet);
    } catch (e) {
        console.error("LLM Generation Failed, using fallback", e);
        explanation = getFallbackExplanation(packet);
    }

    // 4. Return or Store
    // usually store to DynamoDB here

    return {
        statusCode: 200,
        body: JSON.stringify({ packet, explanation }),
    };
};

async function generateSafeExplanation(packet: RecommendationPacket) {
    // In real impl: Invoke Bedrock here with prompt
    // const bedrockResponse = await bedrock.invokeModel(...)

    // Clean & Parse JSON
    const rawJson = `
    {
      "summary": "The portfolio is positioned for quality growth with a defensive tilt.",
      "bullets": ["Overweight Healthcare", "Added MSFT for dividend growth"],
      "whatWouldChangeThis": ["Interest rate hikes"],
      "risksToWatch": ["Tech valuation compression"],
      "disclaimers": ["Not financial advice", "No guarantee of outperformance", "Human approval required"]
    }
  `;

    const parsed = JSON.parse(rawJson);

    // Zod Validation
    const validated = ExplanationSchema.parse(parsed);

    // Hallucination Guard: Validating Tickers
    const packetTickers = new Set(packet.targetPortfolio.map(p => p.ticker));
    const textContent = JSON.stringify(validated);

    // Heuristic: Extract all ALL_CAPS words that look like tickers (2-5 chars)
    const potentialTickers = textContent.match(/\b[A-Z]{2,5}\b/g) || [];
    const knownKeywords = ["VIG", "ETF", "USA", "USD", "GDP", "CPI", "CAGR", "EPS", "FCF", "ROIC", "LLC", "INC"];

    for (const t of potentialTickers) {
        if (knownKeywords.includes(t)) continue;
        // If it looks like a ticker but isn't in packet, flag it
        if (!packetTickers.has(t)) {
            console.warn(`Potential hallucinated ticker detected: ${t}`);
            // In strict mode, throw error.
            // throw new Error("Hallucination detected");
        }
    }

    return validated;
}

function getFallbackExplanation(packet: RecommendationPacket) {
    return {
        summary: "Standard recommendation packet generated based on configured constraints.",
        bullets: ["Review target weights in table."],
        disclaimers: ["Not financial advice", "No guarantee of outperformance", "Human approval required"]
    };
}
