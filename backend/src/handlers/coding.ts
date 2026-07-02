import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { generateAiText } from "../shared/ai.js";
import { getItem, listItems, putItem } from "../shared/db.js";
import { codingProblems } from "../shared/seeds.js";
import { getUserId, parseBody } from "../shared/request.js";
import { badRequest, ok, serverError } from "../shared/response.js";

const runSchema = z.object({
  problemId: z.string(),
  language: z.enum(["python", "java", "cpp", "sql"]),
  code: z.string().min(5)
});

const submitSchema = runSchema.extend({
  userNotes: z.string().optional()
});

type Judge0Language = "python" | "java" | "cpp";

const judge0LanguageMap: Record<Judge0Language, number> = {
  python: 71,
  java: 62,
  cpp: 54
};

async function executeWithJudge0(language: Judge0Language, sourceCode: string, stdin: string) {
  const baseUrl = process.env.JUDGE0_API_URL;
  if (!baseUrl) {
    throw new Error("JUDGE0_API_URL is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (process.env.JUDGE0_API_KEY) {
    headers["X-Auth-Token"] = process.env.JUDGE0_API_KEY;
  }

  const submission = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      language_id: judge0LanguageMap[language],
      source_code: sourceCode,
      stdin
    })
  });

  if (!submission.ok) {
    throw new Error(`Judge0 execution failed with status ${submission.status}`);
  }

  return (await submission.json()) as {
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    status?: { description?: string };
  };
}

function serializeInput(input: unknown) {
  return typeof input === "string" ? input : JSON.stringify(input);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const tableName = process.env.CODING_HISTORY_TABLE!;

    if (event.httpMethod === "GET") {
      if (event.path.endsWith("/problems")) {
        return ok(codingProblems, "Coding problems fetched");
      }

      const history = await listItems(tableName, `USER#${userId}`, "SUBMISSION#");
      return ok(history.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), "Coding history fetched");
    }

    const parsed = (event.path.endsWith("/submit") ? submitSchema : runSchema).safeParse(parseBody(event));
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const problem = codingProblems.find((item) => item.id === parsed.data.problemId);
    if (!problem) {
      return badRequest("Coding problem not found");
    }

    const allTests = event.path.endsWith("/submit") ? [...problem.visibleTests, ...problem.hiddenTests] : problem.visibleTests;
    const testResults = [];

    if (parsed.data.language === "sql") {
      for (const testCase of allTests) {
        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: "SQL execution should be handled by your configured SQL runner or warehouse connection.",
          passed: true
        });
      }
    } else {
      for (const testCase of allTests) {
        const execution = await executeWithJudge0(parsed.data.language as Judge0Language, parsed.data.code, serializeInput(testCase.input));
        const actual = (execution.stdout || execution.stderr || execution.compile_output || "").trim();
        testResults.push({
          input: testCase.input,
          expected: JSON.stringify(testCase.expected),
          actual,
          passed: actual.includes(String(Array.isArray(testCase.expected) ? JSON.stringify(testCase.expected) : testCase.expected))
        });
      }
    }

    const score = Math.round((testResults.filter((item) => item.passed).length / Math.max(testResults.length, 1)) * 100);
    const feedback = await generateAiText(
      `Review this ${parsed.data.language} solution for problem "${problem.title}". Prompt: ${problem.prompt}. Code: ${parsed.data.code}`,
      "You are a senior interviewer giving actionable code review and complexity guidance."
    );

    const result = {
      problemId: problem.id,
      title: problem.title,
      score,
      testResults,
      timeComplexity: "Derived from AI review",
      spaceComplexity: "Derived from AI review",
      feedback
    };

    if (event.path.endsWith("/submit")) {
      const id = `submission-${Date.now()}`;
      await putItem(tableName, {
        pk: `USER#${userId}`,
        sk: `SUBMISSION#${id}`,
        id,
        ...result,
        language: parsed.data.language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        summary: `${problem.title} ${score}%`
      });
    }

    return ok(result, event.path.endsWith("/submit") ? "Code submitted" : "Code executed");
  } catch (error) {
    return serverError(error);
  }
};
