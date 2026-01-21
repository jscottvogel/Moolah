# Moolah - Agentic Dividend Portfolio Optimizer

Moolah is a cloud-native, agentic AI application that generates optimized, tax-aware dividend portfolios. It uses AWS Amplify Gen 2, Bedrock for agentic reasoning, and highly structured backend logic to provide transparent recommendations.

## features

- **Agentic Optimization**: Intelligent portfolio construction balancing yield, growth, quality, and tax efficiency.
- **AI Explanations**: Every recommendation comes with a generated, validated explanation (via Bedrock).
- **Tax-Aware**: Estimates tax drag based on user-specific tax brackets.
- **Safety First**: Automatic gates for dividend cuts, declining fundamentals, and excessive leverage.
- **Modern UI**: Built with Next.js, Tailwind, and ShadCN for a premium experience.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: AWS Amplify Gen 2 (Cognito, AppSync/DynamoDB), AWS Lambda
- **Infrastructure**: AWS CDK (SQS, EventBridge)
- **AI**: AWS Bedrock (Claude / Titan)
- **Data**: Alpha Vantage (Market Data) with SQS-based rate limiting

## Project Structure

- `amplify/`: Backend definition (Gen 2)
  - `auth/`: Cognito resources
  - `data/`: DynamoDB schema
  - `functions/`: Lambda functions (Orchestrator, Worker, Scheduler)
  - `backend.ts`: CDK custom resource wiring (SQS, EventBridge)
- `ui/`: Frontend application (Next.js)
  - `app/`: App Router pages
  - `components/`: UI components

## Getting Started

### Prerequisites

- Node.js v18+
- AWS Account & Credentials configured
- Alpha Vantage API Key

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local development sandbox (Backend + Frontend):
   ```bash
   npx ampx sandbox
   # In a separate terminal
   npm run dev
   ```

## Deployment

Validates against standard Amplify Gen 2 CI/CD.
Connect this repo to AWS Amplify Console.
Set the following environment variables in Amplify:
- `DATA_PROVIDER`: `alpha_vantage` (or `mock`)
- `ALPHA_VANTAGE_API_KEY`: [Your Key]
- `EXPLANATION_MODEL_PROVIDER`: `bedrock` (or `mock`)

## Architecture

See `docs/architecture.md` for detailed system design.