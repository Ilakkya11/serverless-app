import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { deleteItem, listItems, putItem } from "../shared/db.js";
import { getUserId, parseBody } from "../shared/request.js";
import { badRequest, ok, serverError } from "../shared/response.js";

const schema = z.object({
  company: z.string(),
  role: z.string(),
  appliedDate: z.string(),
  oaStatus: z.string(),
  interviewRound: z.string(),
  hrRound: z.string(),
  offerStatus: z.string(),
  notes: z.string().default("")
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const pk = `USER#${userId}`;
    const tableName = process.env.PLACEMENT_APPLICATIONS_TABLE!;

    if (event.httpMethod === "GET") {
      const applications = await listItems(tableName, pk, "PLACEMENT#");
      if (event.path.endsWith("/analytics")) {
        return ok(
          {
            total: applications.length,
            offers: applications.filter((item) => item.offerStatus === "Offered").length,
            interviewsInProgress: applications.filter((item) => item.interviewRound && item.interviewRound !== "Completed").length,
            oaCleared: applications.filter((item) => item.oaStatus === "Cleared").length
          },
          "Placement analytics fetched"
        );
      }

      return ok(applications.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))), "Placements fetched");
    }

    if (event.httpMethod === "DELETE") {
      const id = event.pathParameters?.id;
      if (!id) {
        return badRequest("Placement id is required");
      }
      await deleteItem(tableName, pk, `PLACEMENT#${id}`);
      return ok({ deleted: id }, "Placement deleted");
    }

    const parsed = schema.safeParse(parseBody(event));
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const id = event.pathParameters?.id || `placement-${Date.now()}`;
    const item = {
      pk,
      sk: `PLACEMENT#${id}`,
      id,
      ...parsed.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: `${parsed.data.company} ${parsed.data.offerStatus}`
    };
    await putItem(tableName, item);

    return ok(item, event.httpMethod === "PUT" ? "Placement updated" : "Placement created");
  } catch (error) {
    return serverError(error);
  }
};
