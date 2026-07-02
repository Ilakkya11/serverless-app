import type { APIGatewayProxyHandler } from "aws-lambda";
import { listItems } from "../shared/db.js";
import { getUserId } from "../shared/request.js";
import { ok, serverError } from "../shared/response.js";

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const pk = `USER#${userId}`;

    const [resumes, interviews, codingHistory, aptitudeTests, placements, studyPlans] = await Promise.all([
      listItems(process.env.RESUMES_TABLE!, pk),
      listItems(process.env.INTERVIEW_SESSIONS_TABLE!, pk),
      listItems(process.env.CODING_HISTORY_TABLE!, pk),
      listItems(process.env.APTITUDE_TESTS_TABLE!, pk),
      listItems(process.env.PLACEMENT_APPLICATIONS_TABLE!, pk),
      listItems(process.env.STUDY_PLANS_TABLE!, pk)
    ]);

    const resumeScore = Number(resumes[0]?.report?.atsScore ?? 0);
    const interviewScore = average(interviews.map((item) => Number(item.report?.overallScore ?? item.score ?? 0)).filter(Boolean));
    const codingProgress = average(codingHistory.map((item) => Number(item.score ?? 0)).filter(Boolean));
    const aptitudeProgress = average(
      aptitudeTests.map((item) => {
        const score = Number(item.score ?? 0);
        const total = Number(item.total ?? 0);
        return total ? Math.round((score / total) * 100) : 0;
      }).filter(Boolean)
    );
    const readinessScore = average([resumeScore, interviewScore, codingProgress, aptitudeProgress].filter(Boolean));

    const weeklyProgress = [resumeScore, interviewScore, codingProgress, aptitudeProgress, readinessScore]
      .filter(Boolean)
      .map((score, index) => ({ day: ["Mon", "Tue", "Wed", "Thu", "Fri"][index] ?? `D${index + 1}`, score }));

    const recentActivity = [...resumes, ...interviews, ...codingHistory, ...aptitudeTests, ...placements, ...studyPlans]
      .sort((a, b) => String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? "")))
      .slice(0, 5)
      .map((item) => item.summary ?? item.title ?? item.company ?? item.role ?? item.sk);

    return ok({
      readinessScore,
      resumeScore,
      interviewScore,
      codingProgress,
      aptitudeProgress,
      dailyStreak: Math.min(recentActivity.length * 2, 30),
      weeklyProgress,
      recommendedTopics: studyPlans[0]?.topics ?? ["Resume tailoring", "Interview communication", "Arrays", "Aptitude revision"],
      upcomingInterviews: placements.filter((item) => item.interviewRound && item.interviewRound !== "Completed").slice(0, 3).map((item) => `${item.company} - ${item.interviewRound}`),
      recentActivity
    });
  } catch (error) {
    return serverError(error);
  }
};
