# Deployment Guide

## Frontend on Amplify

1. Connect the repository to AWS Amplify.
2. Set frontend environment variables from `docs/environment.md`.
3. Configure build command as `npm run build:frontend`.
4. Publish the `frontend/dist` output.

## Backend with AWS SAM

1. Install AWS SAM CLI and configure AWS credentials.
2. From `backend/`, run `sam build`.
3. Run `sam deploy --guided`.
4. Capture stack outputs for API URL, Cognito IDs, and S3 bucket.
5. Feed those values into the frontend environment variables.

## Post-Deployment Tasks

1. Verify Cognito callback URLs.
2. Confirm SES sender identities.
3. Enable EventBridge schedules for reminders.
4. Store AI API keys in Secrets Manager or secure Lambda environment variables.
