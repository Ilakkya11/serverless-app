import type { APIGatewayProxyResult } from "aws-lambda";

export function ok(data: unknown, message = "Success"): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ success: true, message, data })
  };
}

export function badRequest(message: string): APIGatewayProxyResult {
  return {
    statusCode: 400,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({ success: false, message })
  };
}

export function serverError(error: unknown): APIGatewayProxyResult {
  console.error("SERVER ERROR:", error);

  if (error instanceof Error) {
    console.error(error.stack);
  }

  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error"
    })
  };
}