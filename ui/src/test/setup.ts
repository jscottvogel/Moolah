import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Create a stable singleton mock object
const mockClient = {
    models: {
        Holding: {
            observeQuery: vi.fn(() => ({
                subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
            })),
            list: vi.fn(() => Promise.resolve({ data: [] })),
            create: vi.fn(() => Promise.resolve({ data: {} })),
            update: vi.fn(() => Promise.resolve({ data: {} })),
            delete: vi.fn(() => Promise.resolve({ data: {} })),
        },
        MarketPrice: {
            listMarketPriceByTickerAndDate: vi.fn(() => Promise.resolve({ data: [] })),
        },
        MarketFundamental: {
            listMarketFundamentalByTickerAndAsOf: vi.fn(() => Promise.resolve({ data: [] })),
        }
    },
    graphql: vi.fn(() => Promise.resolve({ data: {} }))
};

// Mock Amplify data client to always return the same stable object
vi.mock('aws-amplify/data', () => ({
    generateClient: vi.fn(() => mockClient)
}));

// Mock Authenticator
vi.mock('@aws-amplify/ui-react', () => ({
    useAuthenticator: vi.fn(() => ({
        user: { username: 'testuser' },
        authStatus: 'authenticated',
        signOut: vi.fn()
    })),
    Authenticator: {
        Provider: ({ children }: any) => children
    }
}));
