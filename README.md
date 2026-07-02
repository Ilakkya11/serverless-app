# PrepAI

PrepAI is a serverless full-stack AI placement preparation platform built with React, TypeScript, AWS SAM, Lambda, API Gateway, DynamoDB, Cognito, S3, SES, and EventBridge.

## Highlights

- AI-powered resume analysis, interview preparation, coding feedback, and study planning
- Cognito-ready authentication flows with protected routes and persistent sessions
- Serverless backend with dedicated Lambda handlers for each domain module
- Feature-based frontend architecture with responsive dashboard, charts, forms, and theming
- Production-minded validation, API response contracts, IAM separation, and deployment docs

## Monorepo Structure

```text
frontend/   React 19 + Vite + Tailwind + TanStack Query
backend/    AWS SAM + Lambda + API Gateway + DynamoDB integrations
docs/       Architecture, API, deployment, and environment documentation
```

## Quick Start

```bash
npm install
npm run build
```

Frontend:

```bash
npm run dev:frontend
```

Backend:

```bash
cd backend
sam build
sam deploy --guided
```

## Documentation

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Environment Variables](docs/environment.md)
