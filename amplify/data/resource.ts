import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { orchestrator } from '../functions/orchestrator/resource';
import { marketWorker } from '../functions/market-worker/resource';
import { alphaVantageHealth } from '../functions/alpha-vantage-health/resource';

/**
 * Moolah Data Schema - Domain-Driven Design
 * 
 * We separate data into two primary domains:
 * 1. User Domain: Owned records (Holdings, Recommendations, Settings).
 * 2. Market Domain: Global read-only data (Prices, Fundamentals, Dividends).
 * 
 * Authorization:
 * - Owners can full-access their own data.
 * - Authenticated users can read shared market data.
 */
// PROBE MODEL - FORCE REFRESH v5
// 
// 
const schema = a.schema({
    // --- USER DOMAIN ---

    UserSettings: a.model({
        settingsJson: a.json(), // Constraints, tax inputs, preferences
    }).authorization((allow) => [
        allow.owner(),
        allow.guest().to(['read']), // Allow Lambda to read settings
    ]),

    Holding: a.model({
        ticker: a.string().required(),
        shares: a.float().required(),
        costBasis: a.float(),
        purchaseDate: a.date(),
    }).authorization((allow) => [
        allow.owner(),
        allow.guest().to(['read']), // Allow Orchestrator to read holdings
    ]),

    Recommendation: a.model({
        status: a.string().required(), // 'PENDING', 'COMPLETED', 'FAILED'
        packetJson: a.json(), // Recommended rebalance distribution
        explanationJson: a.json(), // Human-readable AI reasoning
    }).authorization((allow) => [
        allow.owner(),
        allow.guest().to(['create', 'read']), // Allow Orchestrator to create recommendations
    ]),

    AuditLog: a.model({
        action: a.string().required(),
        details: a.string(),
        metadata: a.json(),
        testField: a.string(),
    }).authorization((allow) => [
        allow.owner(),
        allow.guest().to(['read', 'create']), // Allow workers to create logs
    ]),

    // --- MARKET DOMAIN ---

    MarketPrice: a.model({
        ticker: a.string().required(),
        date: a.string().required(), // YYYY-MM-DD
        close: a.float(),
        adjustedClose: a.float(),
        volume: a.float(),
    })
        .secondaryIndexes((index) => [index("ticker").sortKeys(["date"])])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
            allow.guest().to(['read', 'create', 'update']),
        ]),

    MarketFundamental: a.model({
        ticker: a.string().required(),
        asOf: a.string().required(),
        dataJson: a.json(),
        dividendYield: a.float(),
        payoutRatio: a.float(),
        debtToEquity: a.float(),
        qualityScore: a.float(),
    })
        .secondaryIndexes((index) => [index("ticker").sortKeys(["asOf"])])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
            allow.guest().to(['read', 'create', 'update']),
        ]),

    MarketDividend: a.model({
        ticker: a.string().required(),
        exDate: a.string().required(),
        amount: a.float(),
        paymentDate: a.string(),
        isCut: a.boolean(),
    })
        .secondaryIndexes((index) => [index("ticker").sortKeys(["exDate"])])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
            allow.guest().to(['read', 'create', 'update']),
        ]),

    ProviderCache: a.model({
        cacheKey: a.string().required(),
        responseJson: a.json(),
        ttl: a.integer(),
    })
        .identifier(["cacheKey"])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
            allow.guest().to(['read', 'create', 'update']),
        ]),

    // --- ORCHESTRATION MUTATIONS ---

    /**
     * Trigger the AI reasoning engine to suggest portfolio optimizations.
     */
    requestOptimization: a.mutation()
        .arguments({
            constraintsJson: a.json(),
            correlationId: a.string(),
        })
        .returns(a.string())
        .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
        .handler(a.handler.function(orchestrator)),

    /**
     * On-demand synchronization of market data for specific tickers.
     */
    requestMarketSync: a.mutation()
        .arguments({
            tickers: a.string().array(),
            correlationId: a.string(),
        })
        .returns(a.string())
        .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
        .handler(a.handler.function(marketWorker)),

    checkAlphaVantageHealth: a.query()
        .returns(a.string())
        .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
        .handler(a.handler.function(alphaVantageHealth)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
        apiKeyAuthorizationMode: {
            expiresInDays: 30,
        },
    },
});

// Trigger schema update v10 - FORCE REFRESH


