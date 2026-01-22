import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { Handler } from 'aws-lambda';

const sqs = new SQSClient({});
const QUEUE_URL = process.env.MARKET_QUEUE_URL;

// In a real app, we'd query the list of tickers we care about from DynamoDB.
// For the MVP sync, we define a core list of 'watch' tickers.
const WATCHLIST = ["MSFT", "AAPL", "JNJ", "XOM", "CVX", "KO", "PEP", "V", "MA", "PG"];

export const handler: Handler = async (event) => {
    console.log('Market Scheduler triggered by cron event');

    for (const ticker of WATCHLIST) {
        try {
            console.log(`[SQS] Dispatching refresh message for ${ticker}`);
            await sqs.send(new SendMessageCommand({
                QueueUrl: QUEUE_URL,
                MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
            }));
            await sqs.send(new SendMessageCommand({
                QueueUrl: QUEUE_URL,
                MessageBody: JSON.stringify({ ticker, type: 'FUNDAMENTAL' })
            }));
        } catch (error) {
            console.error(`[SQS] Failed to dispatch ${ticker}:`, error);
        }
    }

    return {
        statusCode: 200,
        body: `Dispatched ${WATCHLIST.length} ticker updates.`,
    };
};
