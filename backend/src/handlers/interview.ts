import type { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import { getItem, listItems, putItem, updateItem } from "../shared/db.js";
import { generateInterviewQuestions, evaluateInterviewTurn, type InterviewEvaluation, type InterviewType } from "../shared/interview.js";
import { getUserId, parseBody } from "../shared/request.js";
import { badRequest, ok, serverError } from "../shared/response.js";

const startSchema = z.object({
  company: z.string().min(2),
  role: z.string().min(2),
  difficulty: z.enum(["easy", "medium", "hard"]),
  interviewType: z.enum(["HR", "Technical", "Behavioral", "Coding"]),
  mode: z.enum(["text", "video"])
});

const answerSchema = z.object({
  sessionId: z.string(),
  questionIndex: z.number().int().min(0),
  answer: z.string().min(2),
  transcript: z.string().min(2),
  durationSeconds: z.number().min(0).default(0),
  fillerWords: z.number().min(0).default(0),
  wordsSpoken: z.number().min(0).default(0)
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = getUserId(event);
    const pk = `USER#${userId}`;
    const tableName = process.env.INTERVIEW_SESSIONS_TABLE!;

    if (event.httpMethod === "GET") {
      if (event.pathParameters?.id) {
        const session = await getItem(tableName, pk, `SESSION#${event.pathParameters.id}`);
        return ok(session ?? null, "Interview session fetched");
      }

      const sessions = await listItems(tableName, pk, "SESSION#");
      return ok(sessions.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), "Interview history fetched");
    }

    if (event.path.endsWith("/start")) {
      const parsed = startSchema.safeParse(parseBody(event));
      if (!parsed.success) {
        return badRequest(parsed.error.message);
      }

      const sessionId = `session-${Date.now()}`;
      const questions = await generateInterviewQuestions(parsed.data);
      const item = {
        pk,
        sk: `SESSION#${sessionId}`,
        sessionId,
        ...parsed.data,
        questions,
        answers: [],
        report: null,
        currentQuestionIndex: 0,
        status: "in_progress",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        summary: `${parsed.data.company} ${parsed.data.interviewType} interview`
      };

      await putItem(tableName, item);

      return ok(
        {
          sessionId,
          firstQuestion: questions[0]?.question ?? "",
          questions,
          mode: parsed.data.mode
        },
        "Interview session created"
      );
    }

    const parsed = answerSchema.safeParse(parseBody(event));
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const session = await getItem(tableName, pk, `SESSION#${parsed.data.sessionId}`);
    if (!session) {
      return badRequest("Interview session not found");
    }

    const questions = (session.questions ?? []) as Array<{ question: string; focus: string }>;
    const question = questions[parsed.data.questionIndex];
    if (!question) {
      return badRequest("Question not found for the provided index");
    }

    const evaluation = await evaluateInterviewTurn({
      question: question.question,
      answer: parsed.data.answer,
      transcript: parsed.data.transcript,
      interviewType: session.interviewType as InterviewType
    });

    const existingAnswers = ((session.answers as Array<{
      question: string;
      answer: string;
      transcript: string;
      durationSeconds: number;
      fillerWords: number;
      wordsSpoken: number;
      evaluation: InterviewEvaluation;
      createdAt: string;
    }> | undefined) ?? []);

    const answers = [
      ...existingAnswers,
      {
        question: question.question,
        answer: parsed.data.answer,
        transcript: parsed.data.transcript,
        durationSeconds: parsed.data.durationSeconds,
        fillerWords: parsed.data.fillerWords,
        wordsSpoken: parsed.data.wordsSpoken,
        evaluation,
        createdAt: new Date().toISOString()
      }
    ];

    const isComplete = answers.length >= questions.length;
    const report = isComplete
      ? {
          overallScore: Math.round(answers.reduce((sum, item) => sum + Number(item.evaluation?.overallScore ?? 0), 0) / answers.length),
          communicationScore: Math.round(answers.reduce((sum, item) => sum + Number(item.evaluation?.communicationScore ?? 0), 0) / answers.length),
          technicalScore: Math.round(answers.reduce((sum, item) => sum + Number(item.evaluation?.technicalScore ?? 0), 0) / answers.length),
          grammarScore: Math.round(answers.reduce((sum, item) => sum + Number(item.evaluation?.grammarScore ?? 0), 0) / answers.length),
          answerQuality: Math.round(answers.reduce((sum, item) => sum + Number(item.evaluation?.answerQuality ?? 0), 0) / answers.length),
          speakingSpeed: `${Math.round(
            answers.reduce((sum, item) => sum + (Number(item.wordsSpoken ?? 0) / Math.max(Number(item.durationSeconds ?? 1), 1)) * 60, 0) /
              answers.length
          )} words/min`,
          fillerWordAnalysis: `${answers.reduce((sum, item) => sum + Number(item.fillerWords ?? 0), 0)} filler words across the interview`,
          strengths: [...new Set(answers.flatMap((item) => ((item.evaluation?.strengths as string[] | undefined) ?? []).slice(0, 2)))].slice(0, 5),
          weaknesses: [...new Set(answers.flatMap((item) => ((item.evaluation?.weaknesses as string[] | undefined) ?? []).slice(0, 2)))].slice(0, 5),
          improvementSuggestions: [...new Set(answers.flatMap((item) => ((item.evaluation?.improvementSuggestions as string[] | undefined) ?? []).slice(0, 2)))].slice(0, 6),
          idealAnswers: answers.map((item) => ({
            question: item.question,
            idealAnswer: item.evaluation?.idealAnswer
          }))
        }
      : null;

    await updateItem(tableName, pk, `SESSION#${parsed.data.sessionId}`, {
      answers,
      report,
      currentQuestionIndex: parsed.data.questionIndex + 1,
      status: isComplete ? "completed" : "in_progress",
      updatedAt: new Date().toISOString()
    });

    const nextQuestion = questions[parsed.data.questionIndex + 1]?.question ?? null;
    return ok(
      {
        evaluation,
        nextQuestion,
        isComplete,
        report
      },
      "Interview answer evaluated"
    );
  } catch (error) {
    return serverError(error);
  }
};
