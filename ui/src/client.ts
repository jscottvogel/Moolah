import './amplify-config';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

let cachedClient: any = null;

export function getClient(): any {
    if (!cachedClient) {
        console.log("[CLIENT] Initializing Amplify Data Client...");
        try {
            cachedClient = generateClient<Schema>();
        } catch (e) {
            console.error("[CLIENT] Failed to generate client:", e);
            throw e;
        }
    }
    return cachedClient;
}
