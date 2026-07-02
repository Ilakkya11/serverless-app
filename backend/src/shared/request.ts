import type { APIGatewayProxyEvent } from "aws-lambda";

export function parseBody<T>(event: APIGatewayProxyEvent): T {
  return event.body ? (JSON.parse(event.body) as T) : ({} as T);
}

export function getUserId(event: APIGatewayProxyEvent): string {
  const authorizer = event.requestContext.authorizer as { claims?: Record<string, string> } | undefined;
  return authorizer?.claims?.sub || event.headers["x-user-id"] || "local-user";
}
