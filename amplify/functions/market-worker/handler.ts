import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Initialize the data client
const client = generateClient<Schema>({
    authMode: 'iam',
});

const sqs = new SQSClient({});
const QUEUE_URL = process.env.MARKET_QUEUE_URL;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export const handler = async (event: any) => {
    console.log('Market Worker Triggered', JSON.stringify(event));

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
    if (event.arguments && event.arguments.tickers) {
        const { tickers } = event.arguments;
        console.log('Offloading tickers to SQS:', tickers);

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
        return JSON.stringify({ status: 'ACCEPTED', count: tickers.length });
    }

    console.warn('Unknown event type received by Market Worker');
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
        console.log(`[ALPHAVANTAGE] Stored price for ${ticker}`);
    } else {
        console.error(`[ALPHAVANTAGE] No price data for ${ticker}. Response:`, JSON.stringify(data));
    }
}

async function fetchAndStoreFundamentals(ticker: string) {
    console.log(`[ALPHAVANTAGE] Fetching fundamentals for ${ticker}`);
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
        console.log(`[ALPHAVANTAGE] Stored fundamentals for ${ticker}`);
    } else {
        console.error(`[ALPHAVANTAGE] No fundamentals for ${ticker}. Response:`, JSON.stringify(data));
    }
}

function calculateQualityScore(payout: number, debt: number) {
    let score = 100;
    if (payout > 0.8) score -= 40;
    if (debt > 2.0) score -= 30;
    return Math.max(0, score);
}
