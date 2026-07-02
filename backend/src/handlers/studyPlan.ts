import type { APIGatewayProxyHandler } from "aws-lambda";
import { generateAiJson } from "../shared/ai.js";
import { listItems, putItem } from "../shared/db.js";
import { getUserId } from "../shared/request.js";
import { ok, serverError } from "../shared/response.js";

type StudyPlanEntry = {
  day: string;
  focus: string;
  duration: string;
  outcome: string;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const pk = `USER#${userId}`;
    const tableName = process.env.STUDY_PLANS_TABLE!;

    if (event.httpMethod === "GET") {
      const plans = await listItems(tableName, pk, "PLAN#");
      return ok(plans.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), "Study plans fetched");
    }

    let week: StudyPlanEntry[];
    try {
      week = await generateAiJson<StudyPlanEntry[]>(
        "Generate a 7-day personalized placement prep plan based on weak DSA, aptitude, interview communication, and resume optimization. Include day, focus, duration, and outcome.",
        "You are a placement mentor who creates concise, actionable weekly study plans. Return JSON only."
      );
    } catch {
      week = [
        { day: "Monday", focus: "Arrays and strings", duration: "90 min", outcome: "Solve 5 medium questions" },
        { day: "Tuesday", focus: "Percentages and ratios", duration: "60 min", outcome: "Complete one timed aptitude quiz" },
        { day: "Wednesday", focus: "Behavioral interview stories", duration: "45 min", outcome: "Draft 3 STAR answers" },
        { day: "Thursday", focus: "DBMS revision", duration: "60 min", outcome: "Summarize key concepts" }
      ];
    }

    const id = `plan-${Date.now()}`;
    const record = {
      pk,
      sk: `PLAN#${id}`,
      id,
      week,
      topics: week.map((item) => item.focus),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: "AI generated study plan"
    };

    await putItem(tableName, record);
    return ok(record, "Study plan generated");
  } catch (error) {
    return serverError(error);
  }
};
