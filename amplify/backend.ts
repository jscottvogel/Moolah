import 'dotenv/config';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.ts';
import { data } from './data/resource.ts';
import { orchestrator } from './functions/orchestrator/resource.ts';
import { marketWorker } from './functions/market-worker/resource.ts';
import { marketScheduler } from './functions/market-scheduler/resource.ts';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Duration, Stack } from 'aws-cdk-lib';

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
const dlq = new sqs.Queue(customStack, 'MarketDLQ', {});

const marketQueue = new sqs.Queue(customStack, 'MarketDataQueue', {
    visibilityTimeout: Duration.seconds(90), // Must be > worker lambda timeout
    deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
    },
});

// 2. Grant Permissions
// Worker consumes queue
marketQueue.grantConsumeMessages(backend.marketWorker.resources.lambda);

// Worker also needs to send to queue when triggered via AppSync mutation
marketQueue.grantSendMessages(backend.marketWorker.resources.lambda);
(backend.marketWorker.resources.lambda as any).addEnvironment('MARKET_QUEUE_URL', marketQueue.queueUrl);

// Scheduler sends to queue
marketQueue.grantSendMessages(backend.marketScheduler.resources.lambda);
(backend.marketScheduler.resources.lambda as any).addEnvironment('MARKET_QUEUE_URL', marketQueue.queueUrl);

// 2.5 Pass API Keys
(backend.marketWorker.resources.lambda as any).addEnvironment('ALPHA_VANTAGE_API_KEY', process.env.ALPHA_VANTAGE_API_KEY || '');

// 3. EventBridge Schedule (Daily)
const marketSchedulerStack = Stack.of(backend.marketScheduler.resources.lambda);
const dailyRule = new events.Rule(marketSchedulerStack, 'DailyMarketRefreshRule', {
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
