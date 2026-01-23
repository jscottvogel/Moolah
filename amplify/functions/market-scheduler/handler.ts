import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Handler } from 'aws-lambda';

/**
 * Moolah Market Scheduler - "NUCLEAR OPTION" NO-LIBRARY EDITION
 */

const getEnv = (key: string) => process.env[key];

// 1. Core Config Getters
const getCfg = () => ({
    endpoint: getEnv('AMPLIFY_DATA_GRAPHQL_ENDPOINT') || getEnv('AWS_APPSYNC_GRAPHQL_ENDPOINT'),
    region: getEnv('GRAPHQL_REGION') || getEnv('AWS_REGION') || 'us-east-1'
});

const WATCHLIST = ["MSFT", "AAPL", "JNJ", "XOM", "CVX", "KO", "PEP", "V", "MA", "PG"];

async function signedRequest(query: string, variables: any = {}) {
    const { endpoint, region } = getCfg();
    if (!endpoint) throw new Error("AppSync Endpoint missing");

    const url = new URL(endpoint);
    const body = JSON.stringify({ query, variables });
    const signer = new SignatureV4({
        credentials: defaultProvider(),
        region: region,
        service: 'appsync',
        sha256: Sha256
    });
    const request = new HttpRequest({
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname,
        body: body,
        headers: { 'Content-Type': 'application/json', host: url.hostname }
    });
    const signed = await signer.sign(request);
    const response = await fetch(endpoint, {
        method: signed.method,
        headers: signed.headers as any,
        body: signed.body
    });
    const result: any = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);
    return result.data;
}


export const handler: Handler = async (event) => {
    console.log('[SCHEDULER] Pulse');
    const sqs = new SQSClient({ region: getEnv('AWS_REGION') || 'us-east-1' });
    const queueUrl = getEnv('MARKET_QUEUE_URL');

    for (const ticker of WATCHLIST) {
        try {
            await sqs.send(new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
            }));
            await sqs.send(new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify({ ticker, type: 'FUNDAMENTAL' })
            }));
        } catch (error) { console.error(`[SQS] Fail: ${ticker}`, error); }
    }

    try {
        const mutation = `mutation L($i: CreateAuditLogInput!) { createAuditLog(input: $i) { id } }`;
        await signedRequest(mutation, {
            i: {
                action: 'SCHEDULED_SYNC_DISPATCHED',
                details: `Dispatched ${WATCHLIST.length} tickers.`
            }
        });
    } catch (e) {
        console.error("[SCHEDULER] Audit Fail:", e);
    }

    return { statusCode: 200, body: "OK" };
};
