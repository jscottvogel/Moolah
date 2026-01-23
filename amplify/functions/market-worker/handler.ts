import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

/**
 * Moolah Market Worker - "PROVEN & NO-FAIL" EDITION
 */

// 1. Core Config Discovery
const getEnv = (key: string) => process.env[key];

// 2. SQS Client
let cachedSqs: SQSClient | null = null;
function getSqs() {
    if (!cachedSqs) {
        cachedSqs = new SQSClient({ region: getEnv('AWS_REGION') || 'us-east-1' });
    }
    return cachedSqs;
}

// 3. Data Client Engine
let cachedClient: any = null;

function getClient() {
    if (!cachedClient) {
        const endpoint = getEnv('AMPLIFY_DATA_GRAPHQL_ENDPOINT') || getEnv('AWS_APPSYNC_GRAPHQL_ENDPOINT');
        const region = getEnv('GRAPHQL_REGION') || getEnv('AWS_REGION') || 'us-east-1';

        console.log(`[WORKER] CFG: Endpoint: ${endpoint ? 'OK' : 'MISSING'}`);

        if (!endpoint) {
            throw new Error("AMPLIFY_DATA_GRAPHQL_ENDPOINT is missing from environment. Cannot proceed.");
        }

        try {
            // v6 Standard Legacy Configuration fallback
            // This is the MOST RELIABLE way to initialize the API provider in v6
            Amplify.configure({
                API: {
                    GraphQL: {
                        endpoint: endpoint,
                        region: region,
                        defaultAuthMode: 'iam'
                    }
                }
            });

            cachedClient = generateClient<Schema>({
                authMode: 'iam',
            });
            console.log('[WORKER] Client generated successfully.');
        } catch (e) {
            console.error('[WORKER] Client initialization failed:', e);
            throw e;
        }
    }
    return cachedClient;
}

/**
 * Robust Audit Logging helper using direct GraphQL strings.
 * This bypasses the fragile "models" proxy in case introspection is missing.
 */
async function logToAudit(action: string, details: string) {
    try {
        const client = getClient();
        const mutation = `
            mutation CreateAuditLog($input: CreateAuditLogInput!) {
                createAuditLog(input: $input) { id }
            }
        `;
        await client.graphql({
            query: mutation,
            variables: { input: { action, details } }
        });
    } catch (e) {
        console.error(`[WORKER] Audit Log Failed (${action}):`, e);
    }
}

export const handler = async (event: any) => {
    console.log('[WORKER] Heartbeat:', JSON.stringify(event));
    const client = getClient();
    const sqs = getSqs();
    const queueUrl = getEnv('MARKET_QUEUE_URL');

    // A. Direct Mutation Call
    if (event.arguments || (event.info && event.info.fieldName === 'syncMarketData')) {
        const tickers = event.arguments?.tickers || [];
        try {
            if (!queueUrl) throw new Error("MARKET_QUEUE_URL missing");
            for (const ticker of tickers) {
                await sqs.send(new SendMessageCommand({
                    QueueUrl: queueUrl,
                    MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
                }));
                await sqs.send(new SendMessageCommand({
                    QueueUrl: queueUrl,
                    MessageBody: JSON.stringify({ ticker, type: 'FUNDAMENTAL' })
                }));
            }
            await logToAudit('SYNC_ACCEPTED', `Queued ${tickers.length} tickers.`);
            return JSON.stringify({ status: 'ACCEPTED', count: tickers.length });
        } catch (err: any) {
            console.error('[WORKER] Mutation Handler Error:', err);
            return JSON.stringify({ status: 'FAILED', error: err.message });
        }
    }

    // B. SQS Processor
    if (event.Records) {
        for (const record of event.Records) {
            try {
                const { ticker, type } = JSON.parse(record.body);
                console.log(`[WORKER] Processing ${type} for ${ticker}`);
                if (type === 'PRICE') await fetchAndStorePrice(ticker);
                else if (type === 'FUNDAMENTAL') await fetchAndStoreFundamentals(ticker);
                await new Promise(r => setTimeout(r, 12000));
            } catch (e) { console.error('[WORKER] SQS Record Failed:', e); }
        }
        return;
    }

    return JSON.stringify({ status: 'IGNORED' });
};

async function fetchAndStorePrice(ticker: string) {
    const apiKey = getEnv('ALPHA_VANTAGE_API_KEY');
    const client = getClient();
    try {
        const resp = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${apiKey}`);
        const data: any = await resp.json();
        const latestDate = data["Time Series (Daily)"] ? Object.keys(data["Time Series (Daily)"])[0] : null;
        if (latestDate) {
            const m = data["Time Series (Daily)"][latestDate];
            const mutation = `
                mutation CreatePrice($input: CreateMarketPriceInput!) {
                    createMarketPrice(input: $input) { id }
                }
            `;
            await client.graphql({
                query: mutation,
                variables: {
                    input: {
                        ticker,
                        date: latestDate,
                        close: parseFloat(m["4. close"]),
                        adjustedClose: parseFloat(m["5. adjusted close"]),
                        volume: parseFloat(m["6. volume"])
                    }
                }
            });
            await logToAudit('MARKET_SYNC_SUCCESS', `Price ${ticker}: ${m["4. close"]}`);
        }
    } catch (e) { console.error(`[WORKER] Price sync fail: ${ticker}`, e); }
}

async function fetchAndStoreFundamentals(ticker: string) {
    const apiKey = getEnv('ALPHA_VANTAGE_API_KEY');
    const client = getClient();
    try {
        const resp = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`);
        const data: any = await resp.json();
        if (data && data.Symbol) {
            const mutation = `
                mutation CreateFund($input: CreateMarketFundamentalInput!) {
                    createMarketFundamental(input: $input) { id }
                }
            `;
            const payout = parseFloat(data["PayoutRatio"] || "0");
            const debt = parseFloat(data["DebtToEquityRatioTTM"] || "0");
            await client.graphql({
                query: mutation,
                variables: {
                    input: {
                        ticker,
                        asOf: new Date().toISOString().split('T')[0],
                        dividendYield: parseFloat(data["DividendYield"] || "0"),
                        payoutRatio: payout,
                        debtToEquity: debt,
                        dataJson: JSON.stringify(data),
                        qualityScore: Math.max(0, 100 - (payout > 0.8 ? 40 : 0) - (debt > 2.0 ? 30 : 0))
                    }
                }
            });
            await logToAudit('FUND_SYNC_SUCCESS', `Fundamentals ${ticker}`);
        }
    } catch (e) { console.error(`[WORKER] Fund sync fail: ${ticker}`, e); }
}
