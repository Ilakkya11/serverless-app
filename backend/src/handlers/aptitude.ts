import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { generateAiText } from "../shared/ai.js";
import { listItems, putItem } from "../shared/db.js";
import { aptitudeQuestionBank } from "../shared/seeds.js";
import { getUserId, parseBody } from "../shared/request.js";
import { badRequest, ok, serverError } from "../shared/response.js";

const startSchema = z.object({
  category: z.enum(["Quantitative", "Logical Reasoning", "Verbal", "Data Interpretation"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  limit: z.number().int().min(1).max(20).default(4)
});

const submitSchema = z.object({
  testId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedAnswer: z.string(),
      markedForReview: z.boolean().default(false),
      timeSpentSeconds: z.number().min(0).default(0)
    })
  )
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const tableName = process.env.APTITUDE_TESTS_TABLE!;

    if (event.httpMethod === "GET") {
      if (event.path.endsWith("/leaderboard")) {
        const items = await listItems(tableName, `USER#${userId}`, "ATTEMPT#");
        const leaderboard = items
          .map((item) => ({
            userId,
            score: item.score,
            total: item.total,
            percentage: item.total ? Math.round((Number(item.score) / Number(item.total)) * 100) : 0
          }))
          .sort((a, b) => b.percentage - a.percentage);
        return ok(leaderboard, "Leaderboard fetched");
      }

      const history = await listItems(tableName, `USER#${userId}`, "ATTEMPT#");
      return ok(history.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), "Aptitude history fetched");
    }

    if (event.path.endsWith("/start")) {
      const parsed = startSchema.safeParse(parseBody(event));
      if (!parsed.success) {
        return badRequest(parsed.error.message);
      }

      const questions = aptitudeQuestionBank
        .filter((question) => question.category === parsed.data.category && question.difficulty === parsed.data.difficulty)
        .slice(0, parsed.data.limit);

      const testId = `apt-${Date.now()}`;
      return ok(
        {
          testId,
          category: parsed.data.category,
          durationSeconds: questions.length * 90,
          questions: questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            options: question.options
          }))
        },
        "Aptitude test started"
      );
    }

    const parsed = submitSchema.safeParse(parseBody(event));
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const evaluated = parsed.data.answers.map((answer) => {
      const question = aptitudeQuestionBank.find((item) => item.id === answer.questionId);
      return {
        ...answer,
        question: question?.prompt ?? "",
        correctAnswer: question?.answer ?? "",
        explanation: question?.explanation ?? "",
        isCorrect: question?.answer === answer.selectedAnswer
      };
    });

    const wrongAnswers = evaluated.filter((item) => !item.isCorrect);
    const score = evaluated.filter((item) => item.isCorrect).length;
    const explanation =
      wrongAnswers.length > 0
        ? await generateAiText(
            `Explain these incorrect aptitude answers and how to improve: ${JSON.stringify(wrongAnswers)}`,
            "You are a quantitative and reasoning tutor."
          )
        : "Excellent work. Every answer was correct.";

    const attempt = {
      pk: `USER#${userId}`,
      sk: `ATTEMPT#${parsed.data.testId}`,
      id: parsed.data.testId,
      answers: evaluated,
      score,
      total: evaluated.length,
      explanation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      summary: `Aptitude score ${score}/${evaluated.length}`
    };

    await putItem(tableName, attempt);
    return ok(attempt, "Aptitude test submitted");
  } catch (error) {
    return serverError(error);
  }
};
