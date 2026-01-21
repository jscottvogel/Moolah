# Architecture Overview

## System Components

### 1. Frontend (Next.js)
Hosted on Amplify Hosting.
- **Components**: ShadCN + Tailwind.
- **State**: React Query / Amplify Client.
- **Auth**: Amplify Authenticator (Cognito).

### 2. Backend (Amplify Gen 2)
- **API**: AppSync (GraphQL) generated from `amplify/data/resource.ts`.
- **Auth**: Cognito User Pool.
- **Database**: DynamoDB (Single-table design via Amplify models).
  - `UserSettings`: User profile & constraints.
  - `Holding`: User positions.
  - `Recommendation`: JSON packet storage.
  - `MarketData*`: Shared tables for cached prices/fundamentals.

### 3. Agentic Pipeline (Orchestrator Lambda)
Triggered via Mutation `runRecommendation`.
Steps:
1. **Fetch Context**: Load user settings, holdings, and tax profile.
2. **Data Ingestion**: Check `MarketData` tables. If missing/stale, emit tasks to SQS (if async) or fail fast (MVP sync vs async trade-off). 
   - *Design Decision*: Orchestrator expects data to be reasonably fresh via Scheduled Jobs. If specific data is missing, it might call Provider directly (carefully) or return "Data Pending" status.
3. **Safety Gate**: Filter universe based on dividend safety heuristics.
4. **Scoring**: Rank assets by Quality, Value, Momentum.
5. **Construction**: Optimization solver (Integer programming or Heuristic Greedy repair) to fit constraints (Max 40, Sector Caps).
6. **Explanation**:
   - Construct a `RecommendationPacket` JSON.
   - Send packet to **AWS Bedrock** with strict prompt.
   - Validate response against JSON Schema.
7. **Storage**: Save to DynamoDB.

### 4. Market Data Ingestion
- **Scheduler**: EventBridge triggers `MarketScheduler` Lambda daily/weekly.
- **Queue**: `MarketDataQueue` (SQS) buffers requests to avoid rate limits.
- **Worker**: `MarketWorker` Lambda consumes SQS, calls Alpha Vantage (respecting 5 RPM), writes to DynamoDB.

## Security
- **IAM**: Least privilege for Lambdas.
- **Validation**: Zod used on inputs and LLM outputs.
- **Guardrails**: Hard constraints on portfolio weights (e.g. max 6% pos) encoded in logic, not just LLM suggestions.

## Testing Strategy
- **Unit**: Jest/Vitest for math logic & parsers.
- **Integration**: Mock Provider & Mock LLM to test pipeline flow.
- **E2E**: Playwright for Auth & Dashboard rendering.
