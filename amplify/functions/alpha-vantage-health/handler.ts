/**
 * Alpha Vantage Health Check
 * Performs a lightweight API call to verify connectivity and API key validity.
 */

const getEnv = (key: string) => process.env[key];

export const handler = async (event: any) => {
    console.log('[AV-HEALTH] Checking connection...');
    const apiKey = getEnv('ALPHA_VANTAGE_API_KEY');

    if (!apiKey) {
        console.error('[AV-HEALTH] API Key missing');
        return JSON.stringify({ status: 'ERROR', message: 'API Key missing' });
    }

    const start = Date.now();
    try {
        // Query Global Quote for a major index ETF (SPY) for reliability
        const ticker = 'SPY';
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`;

        console.log(`[AV-HEALTH] Requesting: ${url.replace(apiKey, '***')}`);
        const response = await fetch(url);
        const data: any = await response.json();
        const latency = Date.now() - start;

        // Check for API errors
        if (data["Error Message"]) {
            console.error('[AV-HEALTH] API Error:', data["Error Message"]);
            return JSON.stringify({ status: 'ERROR', latency, message: data["Error Message"] });
        }
        if (data["Note"] || data["Information"]) {
            console.warn('[AV-HEALTH] Rate Limit/Notice:', data["Note"] || data["Information"]);
            return JSON.stringify({ status: 'WARNING', latency, message: data["Note"] || data["Information"] });
        }

        // Validate Data
        const quote = data["Global Quote"];
        if (quote && quote["05. price"]) {
            console.log('[AV-HEALTH] Success. Price:', quote["05. price"]);
            return JSON.stringify({
                status: 'SUCCESS',
                latency,
                data: {
                    ticker: quote["01. symbol"],
                    price: quote["05. price"],
                    day: quote["07. latest trading day"],
                    changePercent: quote["10. change percent"]
                }
            });
        }

        console.error('[AV-HEALTH] Unexpected Format:', JSON.stringify(data));
        return JSON.stringify({
            status: 'UNKNOWN',
            latency,
            message: 'Unexpected response structure',
            raw: JSON.stringify(data).substring(0, 200)
        });

    } catch (e: any) {
        console.error('[AV-HEALTH] Fetch Exception:', e);
        return JSON.stringify({ status: 'FAILED', latency: Date.now() - start, message: e.message });
    }
};
