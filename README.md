# Collaborative To-Do List with Secure Sharing (Serverless on AWS)

**Region:** ap-southeast-2 (Sydney)  
**Runtime:** Node.js 20, TypeScript, pnpm workspaces

This repository will host a full serverless monorepo:
- **/infra** — AWS CDK (TypeScript) for CloudFront+WAF, Cognito, API Gateway, Lambda, DynamoDB, S3, EventBridge, SES, X-Ray, CloudWatch.
- **/backend** — Lambda handlers (TypeScript, AWS SDK v3, zod validation), single-table DynamoDB.
- **/frontend** — Vite+React+TypeScript+Tailwind SPA with Cognito Hosted UI (PKCE), React Query, optimistic updates.

**Cost target:** Free Tier friendly; dev under ~$20/month if idle resources are kept small.

We will build this in small steps. After each step, we’ll commit so you can track progress.

## Next
Proceed to **Step 1 — Monorepo scaffolding**.
