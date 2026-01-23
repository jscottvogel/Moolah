import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import config from '../amplify_outputs.json' with { type: 'json' };

// Ensure configuration happens immediately upon module load
if (!(Amplify.getConfig() as any).data) {
    console.log("[CLIENT] Global config missing data section, applying local config...");
    Amplify.configure(config);
}

let cachedClient: any = null;

/**
 * Singleton getter for the Amplify Data Client.
 * Hardened to prevent "Client could not be generated" errors by ensuring
 * configuration is present before invocation.
 */
export function getClient(): any {
    if (!cachedClient) {
        console.log("[CLIENT] Initializing Amplify Data Client...");
        try {
            // Verify configuration one last time before generation
            const currentConfig = Amplify.getConfig() as any;
            if (!currentConfig.data) {
                console.warn("[CLIENT] Still no data config at generation time. Re-applying...");
                Amplify.configure(config);
            }

            cachedClient = generateClient<Schema>();
            console.log("[CLIENT] Client generated successfully.");
        } catch (e) {
            console.error("[CLIENT] FATAL: Failed to generate client:", e);
            // If it fails, we return null and the hooks will handle it
            return null;
        }
    }
    return cachedClient;
}
