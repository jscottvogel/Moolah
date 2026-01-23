import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

/**
 * Moolah Market Worker - ULTIMATE RELIABILITY EDITION
 */

// 1. Core Config Discovery
const QUEUE_URL = process.env.MARKET_QUEUE_URL;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const GRAPHQL_ENDPOINT = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// 2. SQS Client (Stateless)
const sqs = new SQSClient({ region: AWS_REGION });

// 3. Robust Client Discovery
let cachedClient: any = null;

function getClient() {
    if (!cachedClient) {
        console.log('[WORKER] DISCOVERY: GraphQL Endpoint present?', !!GRAPHQL_ENDPOINT);

        // MANUALLY CONFIGURE AMPLIFY if automatic discovery fails in this execution context
        try {
            // Check if already configured
            const currentConfig = Amplify.getConfig();
            if (!currentConfig.API?.GraphQL?.endpoint && GRAPHQL_ENDPOINT) {
                console.log('[WORKER] Manual Amplify configuration triggered.');
                Amplify.configure({
                    API: {
                        GraphQL: {
                            endpoint: GRAPHQL_ENDPOINT,
                            region: AWS_REGION,
                            defaultAuthMode: 'iam'
                        }
                    }
                });
            }

            cachedClient = generateClient<Schema>({
                authMode: 'iam',
            });
            console.log('[WORKER] Data Client Generated.');
        } catch (e) {
            console.error('[WORKER] CRITICAL: Data Client Generation Failed:', e);
            throw e;
        }
    }
    return cachedClient;
}

export const handler = async (event: any) => {
    console.log('[WORKER] Incoming Event');

    // A. AppSync Mutation Handler (On-demand)
    if (event.arguments || (event.info && event.info.fieldName === 'syncMarketData')) {
        const tickers = event.arguments?.tickers || [];
        console.log(`[WORKER] Mutation: syncMarketData for ${tickers.length} tickers`);

        try {
            if (!QUEUE_URL) throw new Error("MARKET_QUEUE_URL env var missing");

            for (const ticker of tickers) {
                await sqs.send(new SendMessageCommand({
                    QueueUrl: QUEUE_URL,
                    MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
                }));
                await sqs.send(new SendMessageCommand({
                    QueueUrl: QUEUE_URL,
                    MessageBody: JSON.stringify({ ticker, type: 'FUNDAMENTAL' })
                }));
            }

            const client = getClient();
            await client.models.AuditLog.create({
                action: 'SYNC_OFFLOAD_ACCEPTED',
                details: `Queued SQS refresh for: ${tickers.join(', ')}`
            });

            return JSON.stringify({ status: 'ACCEPTED', count: tickers.length });
        } catch (err: any) {
            console.error('[WORKER] Mutation Error:', err);
            return JSON.stringify({
                status: 'FAILED',
                error: err.message || 'Internal Lambda Error'
            });
        }
    }

    // B. SQS Processor
    if (event.Records) {
        console.log(`[WORKER] SQS: Processing ${event.Records.length} records`);
        for (const record of event.Records) {
            try {
                const body = JSON.parse(record.body);
                const { ticker, type } = body;
                await processTicker(ticker, type);
                await new Promise(r => setTimeout(r, 12000)); // Rate limiting check
            } catch (e) {
                console.error('[WORKER] SQS Processor Error:', e);
            }
        }
        return;
    }

    console.warn('[WORKER] Event not recognized');
    return JSON.stringify({ status: 'IGNORED' });
};

async function processTicker(ticker: string, type: string) {
    if (type === 'PRICE') {
        await fetchAndStorePrice(ticker);
    } else if (type === 'FUNDAMENTAL') {
        await fetchAndStoreFundamentals(ticker);
    }
}

async function fetchAndStorePrice(ticker: string) {
    console.log(`[SYNC] Fetching Price: ${ticker}`);
    const client = getClient();

    try {
        const resp = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
        const data: any = await resp.json();
        const latestDate = data["Time Series (Daily)"] ? Object.keys(data["Time Series (Daily)"])[0] : null;

        if (latestDate) {
            const metrics = data["Time Series (Daily)"][latestDate];
            await client.models.MarketPrice.create({
                ticker,
                date: latestDate,
                close: parseFloat(metrics["4. close"]),
                adjustedClose: parseFloat(metrics["5. adjusted close"]),
                volume: parseFloat(metrics["6. volume"]),
            });
            await client.models.AuditLog.create({
                action: 'MARKET_SYNC_SUCCESS',
                details: `${ticker} @ $${metrics["4. close"]}`
            });
        } else {
            console.error(`[SYNC] Price Missing for ${ticker}:`, JSON.stringify(data).substring(0, 200));
        }
    } catch (e: any) {
        console.error(`[SYNC] Price Exception [${ticker}]:`, e);
    }
}

async function fetchAndStoreFundamentals(ticker: string) {
    console.log(`[SYNC] Fetching Fundamentals: ${ticker}`);
    const client = getClient();

    try {
        const resp = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
        const data: any = await resp.json();

        if (data && data.Symbol) {
            const dte = parseFloat(data["DebtToEquityRatioTTM"] || "0");
            const payout = parseFloat(data["PayoutRatio"] || "0");
            const yld = parseFloat(data["DividendYield"] || "0");

            await client.models.MarketFundamental.create({
                ticker,
                asOf: new Date().toISOString().split('T')[0],
                dividendYield: yld,
                payoutRatio: payout,
                debtToEquity: dte,
                dataJson: JSON.stringify(data),
                qualityScore: calculateQualityScore(payout, dte),
            });
            await client.models.AuditLog.create({
                action: 'FUNDAMENTAL_SYNC_SUCCESS',
                details: `${ticker} Yield: ${yld}`
            });
        } else {
            console.error(`[SYNC] Fundamentals Missing for ${ticker}:`, JSON.stringify(data).substring(0, 200));
        }
    } catch (e: any) {
        console.error(`[SYNC] Fundamental Exception [${ticker}]:`, e);
    }
}

function calculateQualityScore(payout: number, debt: number) {
    let score = 100;
    if (payout > 0.8) score -= 40;
    if (debt > 2.0) score -= 30;
    return Math.max(0, score);
}
