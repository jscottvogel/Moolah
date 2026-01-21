import 'dotenv/config';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { orchestrator } from './functions/orchestrator/resource';
import { marketWorker } from './functions/market-worker/resource';
import { marketScheduler } from './functions/market-scheduler/resource';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/
 */
const backend = defineBackend({
    auth,
    data,
    orchestrator,
    marketWorker,
    marketScheduler,
});

// --- Custom Infrastructure (CDK) ---

const customStack = backend.createStack('CustomInfraStack');

// 1. SQS Queue for Market Data Fetching
const dlq = new sqs.Queue(customStack, 'MarketDLQ', {
    queueName: 'market-data-fetch-dlq',
});

const marketQueue = new sqs.Queue(customStack, 'MarketDataQueue', {
    queueName: 'market-data-fetch-queue',
    visibilityTimeout: Duration.seconds(90), // Must be > worker lambda timeout
    deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
    },
});

// 2. Grant Permissions
// Worker consumes queue
marketQueue.grantConsumeMessages(backend.marketWorker.resources.lambda);

// Scheduler sends to queue
marketQueue.grantSendMessages(backend.marketScheduler.resources.lambda);
backend.marketScheduler.resources.lambda.addEnvironment('MARKET_QUEUE_URL', marketQueue.queueUrl);

// 3. EventBridge Schedule (Daily)
const dailyRule = new events.Rule(customStack, 'DailyMarketRefreshRule', {
    schedule: events.Schedule.cron({ hour: '10', minute: '0' }), // Daily at 10:00 UTC
    targets: [new targets.LambdaFunction(backend.marketScheduler.resources.lambda)],
});

// 4. Permissions for Orchestrator (Bedrock + Data)
backend.orchestrator.resources.lambda.addToRolePolicy(
    new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'], // Restrict to specific model in production
    })
);

// Grant Data Access
// Loop through tables to grant permissions
const tables = backend.data.resources.tables;
for (const modelName of Object.keys(tables)) {
    const table = tables[modelName];

    // Orchestrator needs access to everything (Settings, Holdings, Recs)
    table.grantReadWriteData(backend.orchestrator.resources.lambda);

    // Market Worker needs access to Market Data and Cache
    if (['MarketPrice', 'MarketFundamental', 'MarketDividend', 'ProviderCache'].includes(modelName)) {
        table.grantReadWriteData(backend.marketWorker.resources.lambda);
    }
}
