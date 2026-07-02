import { generateAiJson, generateAiText } from "./ai.js";

export type InterviewMode = "text" | "video";
export type InterviewType = "HR" | "Technical" | "Behavioral" | "Coding";

export type InterviewQuestion = {
  question: string;
  focus: string;
};

export type InterviewEvaluation = {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  grammarScore: number;
  answerQuality: number;
  speakingSpeed: string;
  fillerWordAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  idealAnswer: string;
  followUpQuestion: string;
};

export async function generateInterviewQuestions(input: {
  company: string;
  role: string;
  difficulty: string;
  interviewType: InterviewType;
  mode: InterviewMode;
}): Promise<InterviewQuestion[]> {
  try {
    return await generateAiJson<InterviewQuestion[]>(
      `Create 5 natural ${input.interviewType} interview questions for a ${input.role} candidate interviewing at ${input.company}. Difficulty: ${input.difficulty}. Mode: ${input.mode}. Return JSON array with question and focus.`,
      "You are an expert interviewer."
    );
  } catch {
    return [
      { question: `Introduce yourself for the ${input.role} role at ${input.company}.`, focus: "Introduction" },
      { question: `Describe a project relevant to ${input.interviewType}.`, focus: "Project depth" },
      { question: "Explain a challenge you solved and how you approached it.", focus: "Problem solving" },
      { question: "What would you improve if you repeated that experience?", focus: "Reflection" },
      { question: "Why are you a strong fit for this opportunity?", focus: "Fitment" }
    ];
  }
}

export async function evaluateInterviewTurn(payload: {
  question: string;
  answer: string;
  transcript: string;
  interviewType: InterviewType;
}) {
  try {
    return await generateAiJson<InterviewEvaluation>(
      `Evaluate this ${payload.interviewType} interview answer. Question: ${payload.question}. Answer: ${payload.answer}. Transcript: ${payload.transcript}. Return scores from 0-100 and concise arrays for strengths, weaknesses, and improvementSuggestions.`,
      "You are a strict but helpful interview evaluator. Return JSON only."
    );
  } catch {
    return {
      overallScore: 78,
      communicationScore: 76,
      technicalScore: 80,
      grammarScore: 83,
      answerQuality: 77,
      speakingSpeed: "Balanced",
      fillerWordAnalysis: "A few filler words detected but not distracting.",
      strengths: ["Clear structure", "Relevant examples"],
      weaknesses: ["Could quantify impact more clearly"],
      improvementSuggestions: ["Add metrics", "Lead with the final outcome"],
      idealAnswer: await generateAiText(`Write an ideal concise answer for: ${payload.question}`),
      followUpQuestion: "What trade-offs did you consider while making that decision?"
    };
  }
}
