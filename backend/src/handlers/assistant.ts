import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { generateAiText } from "../shared/ai.js";
import { listItems, putItem } from "../shared/db.js";
import { getUserId, parseBody } from "../shared/request.js";
import { badRequest, ok, serverError } from "../shared/response.js";

const schema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(5)
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const pk = `USER#${userId}`;
    const tableName = process.env.ACTIVITY_LOGS_TABLE!;

    if (event.httpMethod === "GET") {
      const messages = await listItems(tableName, pk, "CHAT#");
      return ok(messages.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))), "Assistant history fetched");
    }

    const parsed = schema.safeParse(parseBody(event));
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const conversationId = parsed.data.conversationId || `chat-${Date.now()}`;
    const reply = await generateAiText(parsed.data.message, "You are PrepAI, a career assistant for placements, DSA, aptitude, and resume guidance.");
    const createdAt = new Date().toISOString();

    await putItem(tableName, {
      pk,
      sk: `CHAT#${createdAt}#${conversationId}`,
      conversationId,
      userMessage: parsed.data.message,
      assistantMessage: reply,
      createdAt,
      updatedAt: createdAt,
      summary: parsed.data.message.slice(0, 48)
    });

    return ok({ conversationId, reply }, "Assistant response generated");
  } catch (error) {
    return serverError(error);
  }
};
