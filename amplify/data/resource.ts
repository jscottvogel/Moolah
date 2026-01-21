import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*
  Data Model based on requirements:
  - User Settings
  - Holdings
  - Recommendations
  - Market Data (Shared)
  - Provider Cache (Shared/Internal)
*/

const schema = a.schema({
    // User Specific Data
    UserSettings: a.model({
        settingsJson: a.json(), // Stores constraints, tax inputs, preferences
    }).authorization((allow) => [allow.owner()]),

    Holding: a.model({
        ticker: a.string().required(),
        shares: a.float().required(), // Using float for fractional shares support
        costBasis: a.float(), // Total cost basis or per share? Usually per share or total. Let's assume per share for simplicity or total. MVP: user enters data.
        purchaseDate: a.date(),
    }).authorization((allow) => [allow.owner()]),

    Recommendation: a.model({
        status: a.string(), // 'PENDING', 'COMPLETED', 'FAILED'
        packetJson: a.json(), // The full canonical output
        createdAt: a.datetime(), // Sort key usually
    }).authorization((allow) => [allow.owner()]),

    // Market Data - Global
    // Authorization: 
    // - Readers: Authenticated users (so they can see charts/data in validation UI)
    // - Writers: Backend Services (IAM)

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
        ]),

    MarketFundamental: a.model({
        ticker: a.string().required(), // Access pattern: Get by ticker
        asOf: a.string(), // YYYY-MM-DD
        dataJson: a.json(), // Store full fundamental object
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
    })
        .secondaryIndexes((index) => [index("ticker").sortKeys(["exDate"])])
        .authorization((allow) => [
            allow.authenticated().to(['read']),
        ]),

    // Provider Cache for AlphaVantage throttling
    ProviderCache: a.model({
        cacheKey: a.string().required(), // e.g. "PRICES_AAPL_2023-01-01"
        responseJson: a.json(),
        ttl: a.integer(), // Epoch timestamp for expiration
    })
        .identifier(["cacheKey"])
        .authorization((allow) => [
            allow.authenticated().to(['read']), // Maybe only backend needs this? But keeping it accessible for debug is fine.
        ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
        apiKeyAuthorizationMode: {
            expiresInDays: 30, // Default
        },
    },
});
