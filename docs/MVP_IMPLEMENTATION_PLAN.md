# Moolah MVP Implementation Plan

This document outlines the step-by-step technical implementation for the Moolah Agentic Dividend Portfolio Optimizer MVP.

## Phase 1: Knowledge & Data Foundation
**Goal**: Establish reliable market data ingestion and user persistence.

- [ ] **Data Model Refinement**: 
    - Ensure `MarketFundamental` stores enough data for quality scoring (Payout Ratio, Debt/Equity, FCF).
    - Add `AuditLog` model to track AI decisions for transparency.
- [ ] **Market Worker Implementation**:
    - Integrate Alpha Vantage API.
    - Implement the `ProviderCache` logic to respect rate limits (5 calls/min) by checking DynamoDB before calling external API.
    - Support three main data types: `TIME_SERIES_DAILY_ADJUSTED`, `OVERVIEW` (Fundamentals), and `DIVIDENDS`.
- [ ] **Secure Secret Management**:
    - Configure AWS Secrets Manager for `ALPHA_VANTAGE_API_KEY`.
    - Inject secret into Lambda environments via CDK in `amplify/backend.ts`.

## Phase 2: Tactical Pipeline (The Worker Loop)
**Goal**: Ensure the system can update 100+ tickers without hitting rate limits or timeouts.

- [ ] **SQS Integration**:
    - `market-scheduler` sends "Batch Refresh" messages to SQS.
    - `market-worker` consumes SQS with 1 record per batch to ensure precise rate limiting.
- [ ] **Progress Tracking**:
    - Update a `SyncStatus` record so the UI can show "Refreshing Market Data... 45%".

## Phase 3: Agentic Reasoning (The "Brain")
**Goal**: Implement the Bedrock-powered optimization logic.

- [ ] **Orchestrator Lambda**:
    - Switch from simulation to real **AWS Bedrock** (Claude 3 Haiku/Sonnet).
    - **Prompt Engineering**: Define system prompts for "Dividend Quality Score" (0-100) based on payout safety and growth.
    - **Constraint Solver**: AI must balance the portfolio while respecting `maxHoldings` and sector caps.
- [ ] **Explanation Engine**:
    - Generate structured JSON explanations verifying *why* a stock was added or dropped.
    - Implement the "Ticker Hallucination Guard" to ensure AI only references stocks provided in the context.

## Phase 4: Safety & Verification (Gating)
**Goal**: Implement the "Safety First" requirement.

- [ ] **Dividend Cut Gate**: Automatically flag any holding that reduced its dividend in the last 12 months.
- [ ] **Leverage Gate**: Flag companies with Debt/Equity > 2.0 (configurable).
- [ ] **Validation UI**: Create a visual list of "Compliance Gating" alerts in the dashboard.

## Phase 5: Frontend Experience (UI/UX)
**Goal**: Provide a premium, responsive interface.

- [ ] **Holdings Management**:
    - CSV Upload functionality for existing portfolios.
    - Manual ticker entry with real-time validation (check if ticker exists in our price table).
- [ ] **Recommendation View**:
    - Interactive "Target Weights" table.
    - "AI Reasoning" pane with markdown-rendered summaries.
    - "Tax Drag" estimator component based on user tax bracket.
- [ ] **Dashboard Charts**:
    - Integrate `recharts` for Portfolio Yield vs. Benchmark (VIG) comparison.
    - Sector allocation donut chart.

## Phase 6: Testing & Quality Assurance
**Goal**: Meet "thorough" testing guidelines.

- [ ] **Unit Tests**:
    - Portfolio scoring logic (pure functions).
    - Zod schema validation for AI outputs.
- [ ] **Integration Tests**:
    - Verify Lambda can read/write to DynamoDB tables.
    - Verify SQS trigger flow.
- [ ] **E2E Testing**:
    - Playwright/Cypress flow: Login -> Sync Holdings -> Run Optimization -> View Result.

## Coding Guidelines
- **Modern React (Vite)**: Zero Next.js baggage.
- **Tailwind/HSL**: Curated color palettes (Emerald/Amber/Slate).
- **Lucide Icons**: Consistent, clean iconography.
- **Fail-Safe**: Every LLM call must have a static fallback if the API is throttled or fails.
