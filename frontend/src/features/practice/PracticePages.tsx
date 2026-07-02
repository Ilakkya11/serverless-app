import Editor from "@monaco-editor/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { get, post } from "../../lib/api";

type CodingProblem = {
  id: string;
  title: string;
  difficulty: string;
  prompt: string;
  languageTemplates: Record<string, string>;
  visibleTests: Array<{ input: unknown; expected: unknown }>;
};

type CodingResult = {
  score: number;
  feedback: string;
  timeComplexity: string;
  spaceComplexity: string;
  testResults: Array<{ expected: string; actual: string; passed: boolean }>;
};

export function CodingPage() {
  const [language, setLanguage] = useState("python");
  const [problemId, setProblemId] = useState("two-sum");
  const [code, setCode] = useState("");

  const problemsQuery = useQuery({
    queryKey: ["coding-problems"],
    queryFn: () => get<CodingProblem[]>("/coding/problems")
  });
  const historyQuery = useQuery({
    queryKey: ["coding-history"],
    queryFn: () => get<Array<{ id: string; title: string; score: number; language: string }>>("/coding/history")
  });

  const selectedProblem = useMemo(
    () => problemsQuery.data?.find((problem) => problem.id === problemId),
    [problemId, problemsQuery.data]
  );

  useEffect(() => {
    if (selectedProblem) {
      setCode(selectedProblem.languageTemplates[language] || "");
    }
  }, [selectedProblem, language]);

  const runMutation = useMutation({
    mutationFn: () => post<CodingResult>("/coding/run", { problemId, language, code })
  });
  const submitMutation = useMutation({
    mutationFn: () => post<CodingResult>("/coding/submit", { problemId, language, code }),
    onSuccess: () => historyQuery.refetch()
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap gap-3">
          <select value={problemId} onChange={(event) => setProblemId(event.target.value)} className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm">
            {(problemsQuery.data ?? []).map((problem) => (
              <option key={problem.id} value={problem.id}>{problem.title}</option>
            ))}
          </select>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm">
            {["python", "java", "cpp", "sql"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Coding Practice</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{selectedProblem?.prompt}</p>
        <div className="mt-4 overflow-hidden rounded-3xl border border-[var(--border)]">
          <Editor height="420px" language={language === "cpp" ? "cpp" : language} value={code} onChange={(value: string | undefined) => setCode(value || "")} theme="vs-dark" />
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={() => runMutation.mutate()} className="rounded-full bg-white/10 px-4 py-2 text-sm">Run Code</button>
          <button onClick={() => submitMutation.mutate()} className="rounded-full bg-brand-500 px-4 py-2 text-sm text-white">Submit Code</button>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-semibold">Visible Test Cases</h2>
          <div className="mt-4 space-y-3 text-sm">
            {(selectedProblem?.visibleTests ?? []).map((testCase, index) => (
              <div key={index} className="rounded-2xl bg-white/5 p-4">
                <p>Input: {JSON.stringify(testCase.input)}</p>
                <p className="mt-2">Expected: {JSON.stringify(testCase.expected)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-semibold">Execution & AI Review</h2>
          {(submitMutation.data ?? runMutation.data) ? (
            <div className="mt-4 space-y-3 text-sm">
              <div>Score: {(submitMutation.data ?? runMutation.data)?.score}</div>
              <div>Time complexity: {(submitMutation.data ?? runMutation.data)?.timeComplexity}</div>
              <div>Space complexity: {(submitMutation.data ?? runMutation.data)?.spaceComplexity}</div>
              <div>Feedback: {(submitMutation.data ?? runMutation.data)?.feedback}</div>
              <div className="space-y-2">
                {((submitMutation.data ?? runMutation.data)?.testResults ?? []).map((result, index) => (
                  <div key={index} className="rounded-2xl bg-white/5 p-3">
                    <p>Expected: {result.expected}</p>
                    <p>Actual: {result.actual}</p>
                    <p>{result.passed ? "Passed" : "Failed"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">Run or submit code to see live results.</p>
          )}
        </Card>
      </section>

      <Card>
        <h2 className="font-display text-xl font-semibold">Submission History</h2>
        <div className="mt-4 space-y-3">
          {(historyQuery.data ?? []).map((entry) => (
            <div key={entry.id} className="rounded-2xl bg-white/5 p-4 text-sm">
              <p className="font-semibold">{entry.title}</p>
              <p className="mt-1 text-[var(--muted)]">{entry.language}</p>
              <p className="mt-2">Score: {entry.score}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type AptitudeQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

type AptitudeAttempt = {
  id: string;
  score: number;
  total: number;
  explanation: string;
  answers: Array<{
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    markedForReview: boolean;
    isCorrect: boolean;
  }>;
};

export function AptitudePage() {
  const [config, setConfig] = useState({ category: "Quantitative", difficulty: "easy" });
  const [session, setSession] = useState<null | { testId: string; durationSeconds: number; questions: AptitudeQuestion[] }>(null);
  const [answers, setAnswers] = useState<Record<string, { selectedAnswer: string; markedForReview: boolean }>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const historyQuery = useQuery({
    queryKey: ["aptitude-history"],
    queryFn: () => get<AptitudeAttempt[]>("/aptitude/history")
  });
  const leaderboardQuery = useQuery({
    queryKey: ["aptitude-leaderboard"],
    queryFn: () => get<Array<{ userId: string; percentage: number }>>("/aptitude/leaderboard")
  });

  const startMutation = useMutation({
    mutationFn: () => post<{ testId: string; durationSeconds: number; questions: AptitudeQuestion[] }>("/aptitude/start", { ...config, limit: 4 }),
    onSuccess: (result) => {
      setSession(result);
      setCurrentIndex(0);
      setAnswers({});
      setSecondsLeft(result.durationSeconds);
    }
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      post<AptitudeAttempt>("/aptitude/submit", {
        testId: session?.testId,
        answers: session?.questions.map((question) => ({
          questionId: question.id,
          selectedAnswer: answers[question.id]?.selectedAnswer ?? "",
          markedForReview: answers[question.id]?.markedForReview ?? false,
          timeSpentSeconds: 0
        })) ?? []
      }),
    onSuccess: () => {
      historyQuery.refetch();
      leaderboardQuery.refetch();
      setSession(null);
    }
  });

  useEffect(() => {
    if (!session || secondsLeft <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [session, secondsLeft]);

  useEffect(() => {
    if (session && secondsLeft === 0) {
      submitMutation.mutate();
    }
  }, [secondsLeft, session]);

  const activeQuestion = session?.questions[currentIndex];

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="font-display text-2xl font-bold">Aptitude Practice</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Timed tests for quantitative, logical, verbal, and data interpretation with scoring, analytics, and AI explanations.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <select value={config.category} onChange={(event) => setConfig((current) => ({ ...current, category: event.target.value }))} className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm">
            {["Quantitative", "Logical Reasoning", "Verbal", "Data Interpretation"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={config.difficulty} onChange={(event) => setConfig((current) => ({ ...current, difficulty: event.target.value }))} className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm">
            {["easy", "medium", "hard"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button onClick={() => startMutation.mutate()} className="rounded-full bg-brand-500 px-4 py-2 text-white">Start Test</button>
        </div>
      </Card>

      {session && activeQuestion && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Live Test</h2>
            <p className="text-sm text-[var(--muted)]">Time left: {secondsLeft}s</p>
          </div>
          <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm">{activeQuestion.prompt}</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {activeQuestion.options.map((option) => (
              <button
                key={option}
                onClick={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: { ...(current[activeQuestion.id] ?? { markedForReview: false }), selectedAnswer: option } }))}
                className="rounded-2xl border border-[var(--border)] px-4 py-3 text-left text-sm"
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))} className="rounded-full bg-white/10 px-4 py-2 text-sm">Previous</button>
            <button onClick={() => setCurrentIndex((value) => Math.min((session.questions.length - 1), value + 1))} className="rounded-full bg-white/10 px-4 py-2 text-sm">Next</button>
            <button
              onClick={() =>
                setAnswers((current) => ({
                  ...current,
                  [activeQuestion.id]: {
                    ...(current[activeQuestion.id] ?? { selectedAnswer: "" }),
                    markedForReview: !(current[activeQuestion.id]?.markedForReview ?? false)
                  }
                }))
              }
              className="rounded-full bg-white/10 px-4 py-2 text-sm"
            >
              Mark for review
            </button>
            <button onClick={() => submitMutation.mutate()} className="rounded-full bg-brand-500 px-4 py-2 text-sm text-white">Submit Test</button>
          </div>
        </Card>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-semibold">Recent Attempts</h2>
          <div className="mt-4 space-y-3">
            {(historyQuery.data ?? []).map((attempt) => (
              <div key={attempt.id} className="rounded-2xl bg-white/5 p-4 text-sm">
                <p className="font-semibold">Score: {attempt.score}/{attempt.total}</p>
                <p className="mt-2 text-[var(--muted)]">{attempt.explanation}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-semibold">Leaderboard</h2>
          <div className="mt-4 space-y-3">
            {(leaderboardQuery.data ?? []).map((entry, index) => (
              <div key={`${entry.userId}-${index}`} className="rounded-2xl bg-white/5 p-4 text-sm">
                <p>Rank {index + 1}</p>
                <p className="mt-1 text-[var(--muted)]">{entry.userId}</p>
                <p className="mt-2">{entry.percentage}%</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

type CompanyPreparation = {
  company: string;
  interviewPattern: string;
  frequentlyAskedQuestions: string[];
  skillsRequired: string[];
  preparationRoadmap: string[];
};

export function CompanyPrepPage() {
  const query = useQuery({
    queryKey: ["companies"],
    queryFn: () => get<CompanyPreparation[]>("/companies")
  });

  return (
    <div className="space-y-6">
      {(query.data ?? []).map((company) => (
        <Card key={company.company}>
          <h1 className="font-display text-2xl font-bold">{company.company}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{company.interviewPattern}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-2xl bg-white/5 p-4">FAQs: {company.frequentlyAskedQuestions.join(", ")}</div>
            <div className="rounded-2xl bg-white/5 p-4">Skills: {company.skillsRequired.join(", ")}</div>
            <div className="rounded-2xl bg-white/5 p-4">Roadmap: {company.preparationRoadmap.join(", ")}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
