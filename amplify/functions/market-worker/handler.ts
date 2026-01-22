import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Initialize the data client with IAM auth for backend access
const client = generateClient<Schema>({
    authMode: 'iam',
});

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
                await new Promise(r => setTimeout(r, 12000)); // Respect rate limits
            } catch (error) {
                console.error(`Error processing SQS record:`, error);
            }
        }
        return;
    }

    // Case 2: Triggered via AppSync Mutation (Direct call)
    // The event will contain arguments if called via a.mutation()
    if (event.arguments && event.arguments.tickers) {
        const { tickers } = event.arguments;
        console.log('Processing AppSync request for tickers:', tickers);

        for (const ticker of tickers) {
            try {
                // For direct sync, we fetch both Price and Fundamentals
                await processTicker(ticker, 'PRICE');
                await processTicker(ticker, 'FUNDAMENTAL');
                // Note: We might hit rate limits here if too many tickers are requested at once.
                // In a production app, we'd send these to SQS instead of processing inline.
                await new Promise(r => setTimeout(r, 2000));
            } catch (error) {
                console.error(`Error syncing ticker ${ticker}:`, error);
            }
        }
        return JSON.stringify({ status: 'SUCCESS', count: tickers.length });
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
    }
}

function calculateQualityScore(payout: number, debt: number) {
    let score = 100;
    if (payout > 0.8) score -= 40;
    if (debt > 2.0) score -= 30;
    return Math.max(0, score);
}
