import type { Handler } from 'aws-lambda';

// In a real app, we'd query the list of tickers we care about from DynamoDB.
// For the MVP sync, we define a core list of 'watch' tickers.
const WATCHLIST = ["MSFT", "AAPL", "JNJ", "XOM", "CVX", "KO", "PEP", "V", "MA", "PG"];

export const handler: Handler = async (event) => {
    console.log('Market Scheduler triggered by cron event');

    // For each ticker, we'd send a message to SQS
    // In actual impl: const sqs = new SQSClient();
    for (const ticker of WATCHLIST) {
        console.log(`[SQS] Dispatching refresh message for ${ticker}`);

        // This would go to the SQS queue that triggers market-worker
        // await sqs.send(new SendMessageCommand({ 
        //    QueueUrl: process.env.MARKET_QUEUE_URL,
        //    MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
        // }));
    }

    return {
        statusCode: 200,
        body: `Dispatched ${WATCHLIST.length} ticker updates.`,
    };
};
