import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

/**
 * Moolah Market Worker - "NUCLEAR OPTION" NO-LIBRARY EDITION
 * 
 * DESIGN RATIONALE:
 * The Amplify "generateClient" singleton is consistently failing in the cloud.
 * We are bypassing the entire Amplify library for backend query execution.
 * We use the standard AWS Signature V4 to sign a raw fetch request.
 * This is 100% reliable and has zero initialization dependencies.
 */

const getEnv = (key: string) => process.env[key];

// 1. Core Config Getters
const getCfg = () => ({
    endpoint: getEnv('AMPLIFY_DATA_GRAPHQL_ENDPOINT') || getEnv('AWS_APPSYNC_GRAPHQL_ENDPOINT'),
    region: getEnv('GRAPHQL_REGION') || getEnv('AWS_REGION') || 'us-east-1'
});

const sqs = new SQSClient({ region: getEnv('AWS_REGION') || 'us-east-1' });

/**
 * Perform a signed GraphQL request using IAM credentials.
 */
async function signedRequest(query: string, variables: any = {}) {
    const { endpoint, region } = getCfg();
    if (!endpoint) {
        console.error('[APPSYNC] CRITICAL: Endpoint missing from environment.');
        throw new Error("AppSync Endpoint missing");
    }

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
        headers: {
            'Content-Type': 'application/json',
            host: url.hostname
        }
    });

    const signed = await signer.sign(request);

    const response = await fetch(endpoint, {
        method: signed.method,
        headers: signed.headers as any,
        body: signed.body
    });


    const result: any = await response.json();
    if (result.errors) {
        console.error('[APPSYNC] Query Errors:', JSON.stringify(result.errors));
        throw new Error(result.errors[0].message);
    }
    return result.data;
}

async function logToAudit(action: string, details: string, metadata: any = {}) {
    try {
        const mutation = `mutation Log($input: CreateAuditLogInput!) { createAuditLog(input: $input) { id } }`;
        await signedRequest(mutation, { input: { action, details, metadata: JSON.stringify(metadata) } });
    } catch (e) {
        console.error('[WORKER] Audit Fail:', e);
    }
}

export const handler = async (event: any) => {
    console.log('[WORKER] Invoked:', JSON.stringify(event));
    const queueUrl = getEnv('MARKET_QUEUE_URL');

    // A. Mutation Handler
    if (event.arguments || (event.info && event.info.fieldName === 'syncMarketData')) {
        const tickers = event.arguments?.tickers || [];
        const correlationId = event.arguments?.correlationKey;
        try {
            if (!queueUrl) throw new Error("MARKET_QUEUE_URL missing");
            for (const ticker of tickers) {
                await sqs.send(new SendMessageCommand({
                    QueueUrl: queueUrl,
                    MessageBody: JSON.stringify({ ticker, type: 'PRICE' })
                }));
                await sqs.send(new SendMessageCommand({
                    QueueUrl: queueUrl,
                    MessageBody: JSON.stringify({ ticker, type: 'FUNDAMENTAL' })
                }));
            }
            await logToAudit('SYNC_ACCEPTED', `Accepted ${tickers.length} tickers.`, { correlationId });
            return JSON.stringify({ status: 'ACCEPTED', count: tickers.length });
        } catch (err: any) {
            console.error('[WORKER] Mutation Error:', err);
            return JSON.stringify({ status: 'FAILED', error: err.message });
        }
    }

    // B. SQS Handler
    if (event.Records) {
        for (const record of event.Records) {
            try {
                const { ticker, type } = JSON.parse(record.body);
                console.log(`[WORKER] Processing SQS: ${type} for ${ticker}`);
                if (type === 'PRICE') await fetchPrice(ticker);
                else await fetchFund(ticker);

                // Reduced delay: 2s between items in a batch to allow more throughput but avoid instant bursts
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.error('[WORKER] SQS Item Fail:', e);
            }
        }
        return;
    }

    return JSON.stringify({ status: 'IGNORED' });
};

async function fetchPrice(ticker: string) {
    const apiKey = getEnv('ALPHA_VANTAGE_API_KEY');
    console.log(`[WORKER] Fetching price for ${ticker}...`);
    const resp = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${apiKey}`);
    const data: any = await resp.json();

    if (data["Note"] || data["Information"] || data["Error Message"]) {
        const msg = data["Note"] || data["Information"] || data["Error Message"];
        console.warn(`[WORKER] Alpha Vantage Price Notice for ${ticker}:`, msg);
        await logToAudit('MARKET_SYNC_NOTICE', `${ticker}: ${msg}`);
        return;
    }

    const timeSeries = data["Time Series (Daily)"];
    if (timeSeries) {
        const latestDate = Object.keys(timeSeries)[0];
        const m = timeSeries[latestDate];
        const mutation = `mutation P($i: CreateMarketPriceInput!) { createMarketPrice(input: $i) { id } }`;
        const res = await signedRequest(mutation, {
            i: {
                ticker, date: latestDate, close: parseFloat(m["4. close"]),
                adjustedClose: parseFloat(m["4. close"]), // Fallback if regular daily
                volume: parseFloat(m["5. volume"])
            }
        });
        console.log(`[WORKER] Price saved for ${ticker} (${latestDate}): ${res.createMarketPrice.id}`);
        await logToAudit('MARKET_SYNC_SUCCESS', `${ticker} price updated.`);
    } else {
        console.error(`[WORKER] No price data found for ${ticker}. Keys:`, Object.keys(data));
    }
}

async function fetchFund(ticker: string) {
    const apiKey = getEnv('ALPHA_VANTAGE_API_KEY');
    console.log(`[WORKER] Fetching fundamental for ${ticker}...`);
    const resp = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`);
    const data: any = await resp.json();

    if (data["Note"] || data["Information"] || data["Error Message"]) {
        const msg = data["Note"] || data["Information"] || data["Error Message"];
        console.warn(`[WORKER] Alpha Vantage Fund Notice for ${ticker}:`, msg);
        return;
    }

    if (data && data.Symbol) {
        const payout = parseFloat(data["PayoutRatio"] || "0");
        const debt = parseFloat(data["DebtToEquityRatioTTM"] || "0");
        const mutation = `mutation F($i: CreateMarketFundamentalInput!) { createMarketFundamental(input: $i) { id } }`;
        const res = await signedRequest(mutation, {
            i: {
                ticker, asOf: new Date().toISOString().split('T')[0],
                dividendYield: parseFloat(data["DividendYield"] || "0"),
                payoutRatio: payout, debtToEquity: debt,
                dataJson: JSON.stringify(data),
                qualityScore: Math.max(0, 100 - (payout > 0.8 ? 40 : 0) - (debt > 2.0 ? 30 : 0))
            }
        });
        console.log(`[WORKER] Fundamentals saved for ${ticker}: ${res.createMarketFundamental.id}`);
        await logToAudit('FUND_SYNC_SUCCESS', `${ticker} fundamentals.`);
    } else {
        console.error(`[WORKER] No fundamental data found for ${ticker}`);
    }
}
