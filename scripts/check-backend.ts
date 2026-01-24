import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import { type Schema } from '../amplify/data/resource';

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function checkBackend() {
    console.log("🔍 Checking Backend Schema State...");
    console.log(`Endpoint: ${outputs.data.url}`);

    try {
        const mutation = `
            mutation RequestMarketSync($tickers: [String], $correlationId: String) {
                requestMarketSync(tickers: $tickers, correlationId: $correlationId)
            }
        `;
        const query = `
            query CheckProbe {
                listProbeModels {
                    items { id }
                }
            }
        `;

        console.log("1. Checking for ProbeModel (Deployment Liveness)...");
        try {
            await client.graphql({
                query,
                variables: {},
                authMode: 'apiKey'
            });
            console.log("✅ ProbeModel found! Deployment is active.");
        } catch (e: any) {
            console.log("❌ ProbeModel NOT found. Deployment is likely stuck on old version.");
            console.log("Error details:", e.errors?.[0]?.message || e.message);
        }

        console.log("2. Attempting to invoke requestMarketSync...");
        const response: any = await client.graphql({
            query: mutation,
            variables: { tickers: ["TEST"], correlationId: "probe-123" },
            authMode: 'apiKey'
        });

        if (response.errors) {
            console.error("❌ Schema Mismatch Detected!");
            console.error(JSON.stringify(response.errors, null, 2));
        } else {
            console.log("✅ Success! requestMarketSync exists and is callable.");
            console.log("Response:", response.data);
        }
    } catch (err: any) {
        console.error("❌ Exception:", err.message || err);
        if (err.errors) console.error("GraphQLErrors:", JSON.stringify(err.errors, null, 2));
    }
}

checkBackend();
