# Moolah 💸 - Agentic Portfolio Intelligence

Moolah is a premium, AI-driven portfolio tracker and optimizer designed specifically for dividend-growth investors. Unlike traditional stock trackers, Moolah leverages an agentic reasoning engine to analyze safety metrics and provide actionable rebalancing suggestions.

## 🏗 Architecture & Design Choices

### 1. Agentic Reasoning Layer (The Orchestrator)
- **Choice**: Instead of hard-coded rebalancing heuristics, we use **AWS Bedrock (Claude 3 Haiku)** as a logic gate.
- **Reason**: Market conditions are fluid. An LLM can weigh diverse metrics (Debt-to-Equity vs. Payout Ratio vs. Sector Concentration) in a nuanced way that traditional algorithms struggle with. Validated via rigid **Zod schemas** to ensure reliability.

### 2. Unified Market Ingestion (The Worker)
- **Choice**: On-demand Market Sync via SQS and direct GraphQL mutations.
- **Reason**: Real-time market data is expensive and prone to rate limits (Alpha Vantage). We use a **Provider Cache** and asynchronous worker pattern to hydrate the global Market Domain while keeping the UI snappy.

### 3. Clean UI Architecture
- **Choice**: Reactive React 19 Frontend with Custom Hooks.
- **Reason**: By separating business logic (`usePortfolioMetrics`) from components, we achieve high testability and maintainability. Components are purely presentational units.

### 4. Direct GraphQL Mutations
- **Choice**: Preferring `client.graphql` over Amplify's generated helpers for custom functions.
- **Reason**: Bypasses propagation lag in the Amplify Client generation, ensuring that new features (like Sync or Optimize) work immediately after backend deployment.

## 🛠 Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Recharts.
- **Backend**: AWS Amplify Gen 2, AppSync (GraphQL), DynamoDB.
- **AI**: AWS Bedrock (Claude 3 Haiku).
- **Testing**: Vitest (Unit) + Playwright (E2E).

## 🧪 Testing Coverage
We target **>80% coverage** across critical business logic.

- **Unit Tests**: `npm run test` (Vitest)
  - Portfolio ROI calculations.
  - Estimated annual income logic.
  - Hook-state transitions.
- **E2E Tests**: `npx playwright test`
  - Auth flow (Login/Signup).
  - Holdings management.
  - AI Optimization trigger.

## 🚀 Deployment & Maintenance
1. **Backend**: Managed via AWS Amplify Gen 2 (`npx ampx sandbox` for local development).
2. **API Keys**: Ensure `ALPHA_VANTAGE_API_KEY` is set in the Amplify environment variables.
3. **IAM Policies**: The Orchestrator requires `bedrock:InvokeModel` permissions (managed in `amplify/backend.ts`).

---
Designed for performance, safety, and alpha. Maintained by the Moolah Engineering Team.