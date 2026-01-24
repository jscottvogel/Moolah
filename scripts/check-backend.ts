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
        // query CheckProbe removed

        console.log("2. Attempting to invoke requestMarketSync...");
        const response: any = await client.graphql({
            query: mutation,
            variables: { tickers: ["IBM"], correlationId: "probe-data-1" },
            authMode: 'apiKey'
        });

        if (response.errors) {
            console.error("❌ Schema Mismatch or Mutation Error!");
            console.error(JSON.stringify(response.errors, null, 2));
            return;
        }

        console.log("✅ Sync Accepted. Waiting 15s for worker to process...");
        await new Promise(r => setTimeout(r, 15000));

        console.log("3. Checking AuditLog for execution status...");
        const auditQuery = `query CheckAudit { listAuditLogs(limit: 5) { items { action details metadata } } }`;

        try {
            const auditRes: any = await client.graphql({ query: auditQuery, authMode: 'apiKey' });
            if (auditRes.data?.listAuditLogs?.items) {
                console.log("✅ AUDIT LOGS ACCESSIBLE");
                console.log("Entries:", JSON.stringify(auditRes.data.listAuditLogs.items, null, 2));

                const syncSuccess = auditRes.data.listAuditLogs.items.find((i: any) => i.action === 'MARKET_SYNC_SUCCESS' || i.action === 'SYNC_ACCEPTED');
                if (syncSuccess) console.log("✅ CONFIRMED: Worker reported success!");
            } else {
                console.log("❌ AuditLog returned null data.", auditRes);
            }
        } catch (e) {
            console.log("❌ Failed to query AuditLog:", e);
        }

        console.log("4. Verifying Data Persistence (Alpha Vantage integration)...");
        const priceQuery = `
            query CheckPrice {
                listMarketPrices(filter: { ticker: { eq: "IBM" } }) {
                    items { id close date }
                }
            }
        `;

        const priceRes: any = await client.graphql({
            query: priceQuery,
            authMode: 'apiKey'
        });

        if (priceRes.data.listMarketPrices.items.length > 0) {
            console.log("✅ REAL DATA CONFIRMED!");
            console.log("Latest Price Entry:", priceRes.data.listMarketPrices.items[0]);
        } else {
            console.error("❌ No data found in MarketPrice table.");
            console.error("Worker might have failed or API Key is invalid.");

            // Check Audit Log for errors
            console.log("Checking AuditLog for errors...");
            const auditQuery = `query CheckAudit { listAuditLogs(limit: 5) { items { action details metadata } } }`;
            const auditRes: any = await client.graphql({ query: auditQuery, authMode: 'apiKey' });
            console.log("Recent Logs:", JSON.stringify(auditRes.data.listAuditLogs.items, null, 2));
        }
    } catch (err: any) {
        console.error("❌ Exception:", err.message || err);
        if (err.errors) console.error("GraphQLErrors:", JSON.stringify(err.errors, null, 2));
    }
}

checkBackend();
