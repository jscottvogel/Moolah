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

        console.log("Attempting to invoke requestMarketSync...");
        const response: any = await client.graphql({
            query: mutation,
            variables: { tickers: ["TEST"], correlationId: "probe-123" }
        });

        if (response.errors) {
            console.error("❌ Schema Mismatch Detected!");
            console.error(JSON.stringify(response.errors, null, 2));
        } else {
            console.log("✅ Success! requestMarketSync exists and is callable.");
            console.log("Response:", response.data);
        }
    } catch (err) {
        console.error("❌ Exception:", err);
    }
}

checkBackend();
