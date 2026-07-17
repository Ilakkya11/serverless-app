import type { APIGatewayProxyHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { z } from "zod";
import { getItem, putItem } from "../shared/db.js";
import { badRequest, ok, serverError } from "../shared/response.js";
import { parseBody } from "../shared/request.js";

const cognito = new CognitoIdentityProviderClient({});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).default("Student")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const forgotSchema = z.object({
  email: z.string().email()
});

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  newPassword: z.string().min(8)
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const clientId = process.env.COGNITO_CLIENT_ID;
    const localDev = process.env.LOCAL_DEV === "true";

if (event.path.endsWith("/signup")) {
  console.log("RAW BODY:", event.body);

  const parsed = signupSchema.safeParse(parseBody(event));
  console.log("PARSED:", parsed);

  if (!parsed.success) {
    console.log("VALIDATION ERROR:", parsed.error);
    return badRequest(parsed.error.message);
  }
      if (localDev || !clientId) {
        await putItem(process.env.USERS_TABLE!, {
          pk: `USER#${parsed.data.email}`,
          sk: "PROFILE",
          email: parsed.data.email,
          password: parsed.data.password,
          name: parsed.data.name,
          createdAt: new Date().toISOString()
        });
        return ok({ email: parsed.data.email }, "Signup initiated");
      }

      await cognito.send(
        new SignUpCommand({
          ClientId: clientId,
          Username: parsed.data.email,
          Password: parsed.data.password,
          UserAttributes: [
            { Name: "email", Value: parsed.data.email },
            { Name: "name", Value: parsed.data.name }
          ]
        })
      );

      return ok({ email: parsed.data.email }, "Signup initiated");
    }

    if (event.path.endsWith("/login")) {
      const parsed = loginSchema.safeParse(parseBody(event));
      if (!parsed.success) {
        return badRequest(parsed.error.message);
      }

      if (localDev || !clientId) {
        const user = await getItem(process.env.USERS_TABLE!, `USER#${parsed.data.email}`, "PROFILE");
        if (!user || user.password !== parsed.data.password) {
          return badRequest("Invalid email or password");
        }
        return ok(
          {
            AccessToken: `local-access-${Date.now()}`,
            IdToken: `local-id-${Date.now()}`
          },
          "Login successful"
        );
      }

      const result = await cognito.send(
        new InitiateAuthCommand({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: clientId,
          AuthParameters: {
            USERNAME: parsed.data.email,
            PASSWORD: parsed.data.password
          }
        })
      );

      return ok(result.AuthenticationResult, "Login successful");
    }

    if (event.path.endsWith("/forgot-password")) {
      const parsed = forgotSchema.safeParse(parseBody(event));
      if (!parsed.success) {
        return badRequest(parsed.error.message);
      }

      if (localDev || !clientId) {
        return ok({ email: parsed.data.email }, "Password reset code sent");
      }

      await cognito.send(
        new ForgotPasswordCommand({
          ClientId: clientId,
          Username: parsed.data.email
        })
      );

      return ok({ email: parsed.data.email }, "Password reset code sent");
    }

    const parsed = resetSchema.safeParse(parseBody(event));
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    if (localDev || !clientId) {
      const existing = await getItem(process.env.USERS_TABLE!, `USER#${parsed.data.email}`, "PROFILE");
      if (!existing) {
        return badRequest("User not found");
      }
      await putItem(process.env.USERS_TABLE!, {
        ...existing,
        password: parsed.data.newPassword,
        updatedAt: new Date().toISOString()
      });
      return ok({ email: parsed.data.email }, "Password reset completed");
    }

    await cognito.send(
      new ConfirmForgotPasswordCommand({
        ClientId: clientId,
        Username: parsed.data.email,
        ConfirmationCode: parsed.data.code,
        Password: parsed.data.newPassword
      })
    );

    return ok({ email: parsed.data.email }, "Password reset completed");
  } catch (error) {
    return serverError(error);
  }
};
