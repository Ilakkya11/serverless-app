import type { APIGatewayProxyHandler } from "aws-lambda";
import { putItem } from "../shared/db.js";
import { getUserId } from "../shared/request.js";
import { ok, serverError } from "../shared/response.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const notifications = [
      "Daily study reminder",
      "Weekly progress report",
      "Upcoming interview reminder",
      "Resume improvement reminder"
    ];

    await putItem(process.env.NOTIFICATIONS_TABLE!, {
      pk: `USER#${userId}`,
      sk: `NOTIFICATION#${Date.now()}`,
      notifications,
      createdAt: new Date().toISOString(),
      summary: "Scheduled reminders dispatched"
    });

    return ok({ notifications }, "Notification dispatch completed");
  } catch (error) {
    return serverError(error);
  }
};
