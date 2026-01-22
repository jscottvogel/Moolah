import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
    // User Specific Data
    UserSettings: a.model({
        settingsJson: a.json(), // Stores constraints, tax inputs, preferences
    }).authorization((allow) => [allow.owner()]),

    Holding: a.model({
        ticker: a.string().required(),
        shares: a.float().required(),
        costBasis: a.float(),
        purchaseDate: a.date(),
    }).authorization((allow) => [allow.owner()]),

    Recommendation: a.model({
        status: a.string().required(), // 'PENDING', 'COMPLETED', 'FAILED'
        packetJson: a.json(), // The full canonical output
        explanationJson: a.json(), // AI generated explanation
    }).authorization((allow) => [allow.owner()]),

    AuditLog: a.model({
        action: a.string().required(),
        details: a.string(),
        metadata: a.json(),
    }).authorization((allow) => [allow.owner(), allow.group('Admin')]),

    // Market Data - Global
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
            allow.guest().to(['read']), // Allow public read for landing page demo if needed
        ]),

    MarketFundamental: a.model({
        ticker: a.string().required(),
        asOf: a.string().required(),
        dataJson: a.json(),
        dividendYield: a.float(),
        payoutRatio: a.float(),
        debtToEquity: a.float(),
        qualityScore: a.float(), // Pre-calculated
    })
        .secondaryIndexes((index) => [index("ticker").sortKeys(["asOf"])])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
        ]),

    MarketDividend: a.model({
        ticker: a.string().required(),
        exDate: a.string().required(),
        amount: a.float(),
        paymentDate: a.string(),
        isCut: a.boolean(), // Flag for safety gate
    })
        .secondaryIndexes((index) => [index("ticker").sortKeys(["exDate"])])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
        ]),

    ProviderCache: a.model({
        cacheKey: a.string().required(),
        responseJson: a.json(),
        ttl: a.integer(),
    })
        .identifier(["cacheKey"])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
        ]),
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
