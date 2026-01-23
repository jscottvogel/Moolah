import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Initialize the data client lazily to handle potential environment issues
let cachedClient: any = null;

function getInternalClient() {
    if (!cachedClient) {
        console.log('[WORKER] Initializing internal Data Client...');
        // Debug: Log relevant env vars (safely)
        const envKeys = Object.keys(process.env).filter(k => k.startsWith('AMPLIFY_') || k.includes('GRAPHQL'));
        console.log('[WORKER] Relevant Env Keys:', envKeys);

        try {
            cachedClient = generateClient<Schema>({
                authMode: 'iam',
            });
            console.log('[WORKER] Internal Data Client generated.');
        } catch (e: any) {
            console.error('[WORKER] Failed to generate internal client:', e);
            throw e;
        }
    }
    return cachedClient;
}

const sqs = new SQSClient({});
const QUEUE_URL = process.env.MARKET_QUEUE_URL;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export const handler = async (event: any) => {
    console.log('Market Worker Triggered');
    const client = getInternalClient();


    // Case 1: Triggered via SQS (Array of records)
    if (event.Records) {
        console.log('Processing SQS batch of size:', event.Records.length);
        for (const record of event.Records) {
            try {
                const body = JSON.parse(record.body);
                const { ticker, type } = body;
                await processTicker(ticker, type);
                await new Promise(r => setTimeout(r, 12000)); // Respect Alpha Vantage free tier limits
            } catch (error) {
                console.error(`Error processing SQS record:`, error);
            }
        }
        return;
    }

    // Case 2: Triggered via AppSync Mutation (Direct sync)
    // We offload to SQS to return "ACCEPTED" immediately to the UI
    if (event.arguments && (event.arguments.tickers || event.info?.fieldName === 'syncMarketData')) {
        const tickers = event.arguments?.tickers || [];
        console.log('Offloading tickers to SQS:', tickers);

        try {
            if (!QUEUE_URL) {
                throw new Error("MARKET_QUEUE_URL environment variable is missing.");
            }

            for (const ticker of tickers) {
                try {
                    await sqs.send(new SendMessageCommand({
                        QueueUrl: QUEUE_URL,
                        MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
                    }));
                    await sqs.send(new SendMessageCommand({
                        QueueUrl: QUEUE_URL,
                        MessageBody: JSON.stringify({ ticker, type: 'FUNDAMENTAL' })
                    }));
                } catch (error) {
                    console.error(`Error offloading ticker ${ticker}:`, error);
                }
            }

            await client.models.AuditLog.create({
                action: 'SYNC_OFFLOAD_ACCEPTED',
                details: `Dispatched SQS refresh for: ${tickers.join(', ')}`
            });

            return JSON.stringify({ status: 'ACCEPTED', count: tickers.length });
        } catch (err: any) {
            console.error('[WORKER] Mutation Handler Failed:', err);
            // We still want to return a string since the schema requires it
            return JSON.stringify({
                status: 'FAILED',
                error: err.message || 'Internal lambda error'
            });
        }
    }

    console.warn('Unknown event type received by Market Worker');
    return JSON.stringify({ status: 'IGNORED', detail: 'Unknown event type' });
};


async function processTicker(ticker: string, type: string) {
    if (type === 'PRICE') {
        await fetchAndStorePrice(ticker);
    } else if (type === 'FUNDAMENTAL') {
        await fetchAndStoreFundamentals(ticker);
    }
}

async function fetchAndStorePrice(ticker: string) {
    console.log(`[ALPHAVANTAGE] Fetching price for ${ticker}`);
    const client = getInternalClient();
    const resp = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
    const data: any = await resp.json();

    const dailyData = data["Time Series (Daily)"];
    if (dailyData) {
        const latestDate = Object.keys(dailyData)[0];
        const latestMetrics = dailyData[latestDate];

        await client.models.MarketPrice.create({
            ticker,
            date: latestDate,
            close: parseFloat(latestMetrics["4. close"]),
            adjustedClose: parseFloat(latestMetrics["5. adjusted close"]),
            volume: parseFloat(latestMetrics["6. volume"]),
        });

        await client.models.AuditLog.create({
            action: 'MARKET_SYNC_SUCCESS',
            details: `Updated price for ${ticker} (${latestDate}): $${latestMetrics["4. close"]}`
        });

        console.log(`[ALPHAVANTAGE] Stored price for ${ticker}`);
    } else {
        const errorMsg = data["Note"] || data["Error Message"] || "Unknown AlphaVantage error";
        await client.models.AuditLog.create({
            action: 'MARKET_SYNC_ERROR',
            details: `Failed to fetch price for ${ticker}: ${errorMsg}`
        });
        console.error(`[ALPHAVANTAGE] No price data for ${ticker}. Response:`, JSON.stringify(data));
    }
}

async function fetchAndStoreFundamentals(ticker: string) {
    console.log(`[ALPHAVANTAGE] Fetching fundamentals for ${ticker}`);
    const client = getInternalClient();
    const resp = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
    const data: any = await resp.json();

    if (data && data.Symbol) {
        const debtToEquity = parseFloat(data["DebtToEquityRatioTTM"] || "0");
        const payoutRatio = parseFloat(data["PayoutRatio"] || "0");
        const dividendYield = parseFloat(data["DividendYield"] || "0");

        await client.models.MarketFundamental.create({
            ticker,
            asOf: new Date().toISOString().split('T')[0],
            dividendYield,
            payoutRatio,
            debtToEquity,
            dataJson: JSON.stringify(data),
            qualityScore: calculateQualityScore(payoutRatio, debtToEquity),
        });

        await client.models.AuditLog.create({
            action: 'FUNDAMENTAL_SYNC_SUCCESS',
            details: `Updated fundamentals for ${ticker}. Yield: ${dividendYield}`
        });

        console.log(`[ALPHAVANTAGE] Stored fundamentals for ${ticker}`);
    } else {
        const errorMsg = data["Note"] || data["Error Message"] || "Unknown AlphaVantage error";
        await client.models.AuditLog.create({
            action: 'FUNDAMENTAL_SYNC_ERROR',
            details: `Failed to fetch fundamentals for ${ticker}: ${errorMsg}`
        });
        console.error(`[ALPHAVANTAGE] No fundamentals for ${ticker}. Response:`, JSON.stringify(data));
    }
}


function calculateQualityScore(payout: number, debt: number) {
    let score = 100;
    if (payout > 0.8) score -= 40;
    if (debt > 2.0) score -= 30;
    return Math.max(0, score);
}
