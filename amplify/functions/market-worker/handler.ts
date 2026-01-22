import type { SQSHandler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Initialize the data client with IAM auth for backend access
const client = generateClient<Schema>({
    authMode: 'iam',
});

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export const handler: SQSHandler = async (event) => {
    console.log('Market Worker processing batch of size:', event.Records.length);

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            const { ticker, type } = body;

            if (type === 'PRICE') {
                await fetchAndStorePrice(ticker);
            } else if (type === 'FUNDAMENTAL') {
                await fetchAndStoreFundamentals(ticker);
            }

            // Simple rate limit protection for MVP
            await new Promise(r => setTimeout(r, 15000));

        } catch (error) {
            console.error(`[FATAL] Error processing ticker ${record.body}:`, error);
            throw error;
        }
    }
};

async function fetchAndStorePrice(ticker: string) {
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
        console.log(`[DB] Saved latest price for ${ticker} as of ${latestDate}`);
    }
}

async function fetchAndStoreFundamentals(ticker: string) {
    const resp = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
    const data: any = await resp.json();

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
    console.log(`[DB] Saved fundamentals for ${ticker}`);
}

function calculateQualityScore(payout: number, debt: number) {
    // Simple MVP scoring: lower is generally safer for these metrics
    let score = 100;
    if (payout > 0.8) score -= 40;
    if (debt > 2.0) score -= 30;
    return Math.max(0, score);
}
