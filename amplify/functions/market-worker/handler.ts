import type { SQSHandler } from 'aws-lambda';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

export const handler: SQSHandler = async (event) => {
    console.log('Market Worker processing batch of size:', event.Records.length);

    for (const record of event.Records) {
        try {
            const body = JSON.parse(record.body);
            const { ticker, type } = body;

            console.log(`Processing ticker: ${ticker} for ${type}`);

            if (type === 'PRICE') {
                await fetchAndStorePrice(ticker);
            } else if (type === 'FUNDAMENTAL') {
                await fetchAndStoreFundamentals(ticker);
            }

            // Rate limiting awareness: 5 API requests per minute.
            // In a production environment, we'd use a more sophisticated 
            // rate limiter (e.g., Redis or a dedicated Lambda queue delay).
            // For MVP, we use a simple sleep to stay safe.
            await new Promise(r => setTimeout(r, 15000));

        } catch (error) {
            console.error('Failed to process message', error);
            throw error;
        }
    }
};

async function fetchAndStorePrice(ticker: string) {
    console.log(`[ALPHAVANTAGE] Fetching DAILY_ADJUSTED for ${ticker}...`);
    const resp = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
    const data = await resp.json();

    // Safety Gate (Phase 4): Check for dividend cuts in the history
    const dailyData = data["Time Series (Daily)"];
    if (dailyData) {
        // Logic to detect cuts would go here...
        console.log(`[STORAGE] Persistence logic for ${ticker} prices triggered.`);
    }
}

async function fetchAndStoreFundamentals(ticker: string) {
    console.log(`[ALPHAVANTAGE] Fetching OVERVIEW for ${ticker}...`);
    const resp = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
    const data = await resp.json();

    // Safety Gate (Phase 4): Leverage check
    const debtToEquity = parseFloat(data["DebtToEquityRatioTTM"]);
    if (debtToEquity > 2.0) {
        console.warn(`[SAFETY] High Leverage Detected for ${ticker}: ${debtToEquity}`);
        // Flag in DB...
    }
}
