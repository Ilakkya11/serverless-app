# API Documentation

## Authentication

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## Dashboard

- `GET /dashboard`

## Resume

- `POST /resume/upload`
- `POST /resume/analyze`
- `GET /resume/history`

## Interview

- `POST /interview/start`
- `POST /interview/answer`
- `GET /interview/history`
- `GET /interview/{id}`

## Coding

- `GET /coding/problems`
- `POST /coding/run`
- `POST /coding/submit`
- `GET /coding/history`

## Aptitude

- `POST /aptitude/start`
- `POST /aptitude/submit`
- `GET /aptitude/history`
- `GET /aptitude/leaderboard`

## Assistant

- `POST /assistant/chat`
- `GET /assistant/history`

## Placement

- `GET /placement`
- `GET /placement/analytics`
- `POST /placement`
- `PUT /placement/{id}`
- `DELETE /placement/{id}`

## Study Plans

- `GET /studyplan`
- `POST /studyplan/generate`

## Companies

- `GET /companies`

## Notifications

- `POST /notifications/dispatch`

## Response Contract

```json
{
  "success": true,
  "message": "Human readable summary",
  "data": {}
}
```
