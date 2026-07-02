import http from "node:http";
import { URL } from "node:url";

const port = Number(process.env.PORT || 3000);
process.env.LOCAL_DEV = "true";
process.env.AWS_REGION ||= "ap-south-1";
process.env.USERS_TABLE ||= "Users";
process.env.RESUMES_TABLE ||= "Resumes";
process.env.INTERVIEW_SESSIONS_TABLE ||= "InterviewSessions";
process.env.INTERVIEW_QUESTIONS_TABLE ||= "InterviewQuestions";
process.env.CODING_HISTORY_TABLE ||= "CodingHistory";
process.env.APTITUDE_TESTS_TABLE ||= "AptitudeTests";
process.env.PLACEMENT_APPLICATIONS_TABLE ||= "PlacementApplications";
process.env.STUDY_PLANS_TABLE ||= "StudyPlans";
process.env.NOTIFICATIONS_TABLE ||= "Notifications";
process.env.ACTIVITY_LOGS_TABLE ||= "ActivityLogs";
process.env.LEADERBOARD_TABLE ||= "Leaderboard";
process.env.RESUME_BUCKET_NAME ||= "local-resume-bucket";

const { handler: authHandler } = await import("./dist/handlers/auth.js");
const { handler: dashboardHandler } = await import("./dist/handlers/dashboard.js");
const { handler: resumeUploadHandler } = await import("./dist/handlers/resumeUpload.js");
const { handler: resumeAnalysisHandler } = await import("./dist/handlers/resumeAnalysis.js");
const { handler: interviewHandler } = await import("./dist/handlers/interview.js");
const { handler: codingHandler } = await import("./dist/handlers/coding.js");
const { handler: aptitudeHandler } = await import("./dist/handlers/aptitude.js");
const { handler: assistantHandler } = await import("./dist/handlers/assistant.js");
const { handler: placementHandler } = await import("./dist/handlers/placement.js");
const { handler: studyPlanHandler } = await import("./dist/handlers/studyPlan.js");
const { handler: notificationHandler } = await import("./dist/handlers/notification.js");
const { handler: companyHandler } = await import("./dist/handlers/company.js");

const routes = [
  { method: "POST", pattern: /^\/auth\/signup$/, handler: authHandler },
  { method: "POST", pattern: /^\/auth\/login$/, handler: authHandler },
  { method: "POST", pattern: /^\/auth\/forgot-password$/, handler: authHandler },
  { method: "POST", pattern: /^\/auth\/reset-password$/, handler: authHandler },
  { method: "GET", pattern: /^\/dashboard$/, handler: dashboardHandler },
  { method: "POST", pattern: /^\/resume\/upload$/, handler: resumeUploadHandler },
  { method: "PUT", pattern: /^\/local-upload\/(.+)$/, handler: resumeUploadHandler, pathParamNames: ["key"] },
  { method: "POST", pattern: /^\/resume\/analyze$/, handler: resumeAnalysisHandler },
  { method: "GET", pattern: /^\/resume\/history$/, handler: resumeAnalysisHandler },
  { method: "POST", pattern: /^\/interview\/start$/, handler: interviewHandler },
  { method: "POST", pattern: /^\/interview\/answer$/, handler: interviewHandler },
  { method: "GET", pattern: /^\/interview\/history$/, handler: interviewHandler },
  { method: "GET", pattern: /^\/interview\/([^/]+)$/, handler: interviewHandler, pathParamNames: ["id"] },
  { method: "GET", pattern: /^\/coding\/problems$/, handler: codingHandler },
  { method: "GET", pattern: /^\/coding\/history$/, handler: codingHandler },
  { method: "POST", pattern: /^\/coding\/run$/, handler: codingHandler },
  { method: "POST", pattern: /^\/coding\/submit$/, handler: codingHandler },
  { method: "POST", pattern: /^\/aptitude\/start$/, handler: aptitudeHandler },
  { method: "POST", pattern: /^\/aptitude\/submit$/, handler: aptitudeHandler },
  { method: "GET", pattern: /^\/aptitude\/history$/, handler: aptitudeHandler },
  { method: "GET", pattern: /^\/aptitude\/leaderboard$/, handler: aptitudeHandler },
  { method: "POST", pattern: /^\/assistant\/chat$/, handler: assistantHandler },
  { method: "GET", pattern: /^\/assistant\/history$/, handler: assistantHandler },
  { method: "GET", pattern: /^\/placement$/, handler: placementHandler },
  { method: "GET", pattern: /^\/placement\/analytics$/, handler: placementHandler },
  { method: "POST", pattern: /^\/placement$/, handler: placementHandler },
  { method: "PUT", pattern: /^\/placement\/([^/]+)$/, handler: placementHandler, pathParamNames: ["id"] },
  { method: "DELETE", pattern: /^\/placement\/([^/]+)$/, handler: placementHandler, pathParamNames: ["id"] },
  { method: "GET", pattern: /^\/studyplan$/, handler: studyPlanHandler },
  { method: "POST", pattern: /^\/studyplan\/generate$/, handler: studyPlanHandler },
  { method: "POST", pattern: /^\/notifications\/dispatch$/, handler: notificationHandler },
  { method: "GET", pattern: /^\/companies$/, handler: companyHandler }
];

function matchRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const match = pathname.match(route.pattern);
    if (!match) {
      continue;
    }

    const pathParameters = {};
    for (const [index, name] of (route.pathParamNames || []).entries()) {
      pathParameters[name] = match[index + 1];
    }

    return { route, pathParameters };
  }

  return null;
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `127.0.0.1:${port}`}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-User-Id",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
    });
    response.end();
    return;
  }

  const matched = matchRoute(request.method || "GET", url.pathname);
  if (!matched) {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: false, message: "Route not found" }));
    return;
  }

  const body = await readBody(request);
  const result = await matched.route.handler({
    body: body || null,
    headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value || ""])),
    httpMethod: request.method || "GET",
    path: url.pathname,
    pathParameters: matched.pathParameters,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    requestContext: {
      authorizer: undefined
    }
  });

  response.writeHead(result.statusCode || 200, result.headers || { "Content-Type": "application/json" });
  response.end(result.body || "");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PrepAI backend dev server running at http://127.0.0.1:${port}`);
});
