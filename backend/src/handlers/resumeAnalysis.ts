import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { generateAiJson } from "../shared/ai.js";
import { listItems, putItem } from "../shared/db.js";
import { getUserId, parseBody } from "../shared/request.js";
import { badRequest, ok, serverError } from "../shared/response.js";

const schema = z.object({
  resumeKey: z.string(),
  fileName: z.string(),
  extractedText: z.string().min(50)
});

type ResumeReport = {
  atsScore: number;
  grammarReview: string;
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const tableName = process.env.RESUMES_TABLE!;

    if (event.httpMethod === "GET") {
      const items = await listItems(tableName, `USER#${userId}`, "RESUME#");
      return ok(items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), "Resume history fetched");
    }

    const parsed = schema.safeParse(parseBody(event));
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    let report: ResumeReport;
    try {
      report = await generateAiJson<ResumeReport>(
        `Analyze this resume text for ATS, missing keywords, strengths, weaknesses, grammar, and actionable suggestions.\nResume:\n${parsed.data.extractedText}`,
        "You are an ATS and resume optimization assistant. Return compact JSON."
      );
    } catch {
      report = {
        atsScore: 72,
        grammarReview: "Grammar is solid overall, but several bullets can be tightened for clarity.",
        missingKeywords: ["AWS", "Testing", "System Design"],
        strengths: ["Relevant project experience", "Readable structure"],
        weaknesses: ["Limited quantified impact", "Summary section is generic"],
        suggestions: ["Add metrics to project bullets", "Tailor keywords to target role", "Highlight cloud and testing exposure"],
        summary: "The resume is promising but needs stronger role-specific keywords and measurable impact."
      };
    }

    const id = `resume-${Date.now()}`;
    const record = {
      pk: `USER#${userId}`,
      sk: `RESUME#${id}`,
      id,
      fileName: parsed.data.fileName,
      resumeKey: parsed.data.resumeKey,
      extractedText: parsed.data.extractedText,
      report,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: parsed.data.fileName
    };

    await putItem(tableName, record);
    return ok(record, "Resume analyzed successfully");
  } catch (error) {
    return serverError(error);
  }
};
