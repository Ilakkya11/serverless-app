import type { APIGatewayProxyHandler } from "aws-lambda";
import { companyPreparation } from "../shared/seeds.js";
import { ok, serverError } from "../shared/response.js";

export const handler: APIGatewayProxyHandler = async () => {
  try {
    return ok(companyPreparation, "Company preparation content fetched");
  } catch (error) {
    return serverError(error);
  }
};
