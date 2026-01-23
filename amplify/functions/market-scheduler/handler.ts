import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import type { Handler } from 'aws-lambda';

/**
 * Moolah Market Scheduler - ULTIMATE RELIABILITY EDITION
 */

const getEnv = (key: string) => process.env[key];

let cachedClient: any = null;
function getClient() {
    const graphqlEndpoint = getEnv('AMPLIFY_DATA_GRAPHQL_ENDPOINT');
    const awsRegion = getEnv('AWS_REGION') || 'us-east-1';

    if (!cachedClient) {
        try {
            const currentConfig = Amplify.getConfig();
            if (!currentConfig.API?.GraphQL?.endpoint && graphqlEndpoint) {
                Amplify.configure({
                    version: "1",
                    data: {
                        url: graphqlEndpoint,
                        aws_region: awsRegion,
                        default_authorization_type: "AWS_IAM",
                        authorization_types: ["AWS_IAM"]
                    }
                } as any);
            }
            cachedClient = generateClient<Schema>({
                authMode: 'iam',
            });
        } catch (e) {
            console.error('[SCHEDULER] Failed to initialize data client:', e);
            throw e;
        }
    }
    return cachedClient;
}

const WATCHLIST = ["MSFT", "AAPL", "JNJ", "XOM", "CVX", "KO", "PEP", "V", "MA", "PG"];

export const handler: Handler = async (event) => {
    console.log('[SCHEDULER] Triggered by cron event');
    const queueUrl = getEnv('MARKET_QUEUE_URL');
    const awsRegion = getEnv('AWS_REGION') || 'us-east-1';
    const sqs = new SQSClient({ region: awsRegion });

    for (const ticker of WATCHLIST) {
        try {
            console.log(`[SQS] Dispatching: ${ticker}`);
            await sqs.send(new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
            }));
            await sqs.send(new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify({ ticker, type: 'FUNDAMENTAL' })
            }));
        } catch (error) {
            console.error(`[SQS] Dispatch Fail for ${ticker}:`, error);
        }
    }

    try {
        const client = getClient();
        await client.models.AuditLog.create({
            action: 'SCHEDULED_SYNC_DISPATCHED',
            details: `Dispatched SQS refresh for ${WATCHLIST.length} watchlist tickers.`
        });
    } catch (e) {
        console.error("[SCHEDULER] Audit logging failed:", e);
    }

    return {
        statusCode: 200,
        body: `Dispatched ${WATCHLIST.length} ticker updates.`,
    };
};
