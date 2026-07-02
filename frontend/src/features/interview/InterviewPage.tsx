import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../../components/ui/Card";
import { get, post } from "../../lib/api";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

type InterviewSession = {
  sessionId: string;
  company: string;
  role: string;
  interviewType: "HR" | "Technical" | "Behavioral" | "Coding";
  mode: "text" | "video";
  status: string;
  questions: Array<{ question: string; focus: string }>;
  answers?: Array<{
    question: string;
    answer: string;
    transcript: string;
    evaluation: {
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
  }>;
  report?: {
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
    idealAnswers: Array<{ question: string; idealAnswer: string }>;
  } | null;
};

const fillerWords = ["um", "uh", "like", "basically", "actually", "you know"];

function speak(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function InterviewPage() {
  const [form, setForm] = useState<{
    company: string;
    role: string;
    difficulty: "easy" | "medium" | "hard";
    interviewType: "HR" | "Technical" | "Behavioral" | "Coding";
    mode: "text" | "video";
  }>({
    company: "Amazon",
    role: "Software Engineer",
    difficulty: "medium",
    interviewType: "Technical",
    mode: "text"
  });
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const historyQuery = useQuery({
    queryKey: ["interview-history"],
    queryFn: () => get<InterviewSession[]>("/interview/history")
  });

  const startMutation = useMutation({
    mutationFn: () =>
      post<{
        sessionId: string;
        firstQuestion: string;
        questions: InterviewSession["questions"];
        mode: "text" | "video";
      }>("/interview/start", form),
    onSuccess: async (result) => {
      const session: InterviewSession = {
        sessionId: result.sessionId,
        company: form.company,
        role: form.role,
        interviewType: form.interviewType,
        mode: form.mode,
        status: "in_progress",
        questions: result.questions
      };
      setActiveSession(session);
      setAnswer("");
      setTranscript("");
      setStartedAt(Date.now());
      speak(result.firstQuestion);

      if (form.mode === "video") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          setMediaReady(true);
          setStreamError(null);
        } catch (error) {
          setStreamError(error instanceof Error ? error.message : "Unable to access camera and microphone.");
        }
      }
    }
  });

  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) {
        throw new Error("No active interview session");
      }

      return post<{
        evaluation: NonNullable<InterviewSession["answers"]>[number]["evaluation"];
        nextQuestion: string | null;
        isComplete: boolean;
        report: InterviewSession["report"];
      }>("/interview/answer", {
        sessionId: activeSession.sessionId,
        questionIndex: activeSession.answers?.length ?? 0,
        answer,
        transcript: transcript || answer,
        durationSeconds: startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0,
        fillerWords: (transcript || answer)
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => fillerWords.includes(word.replace(/[^\w]/g, ""))).length,
        wordsSpoken: (transcript || answer).split(/\s+/).filter(Boolean).length
      });
    },
    onSuccess: (result) => {
      if (!activeSession) {
        return;
      }

      const question = activeSession.questions[activeSession.answers?.length ?? 0]?.question ?? "";
      const answers = [
        ...(activeSession.answers ?? []),
        {
          question,
          answer,
          transcript: transcript || answer,
          evaluation: result.evaluation
        }
      ];

      const nextSession: InterviewSession = {
        ...activeSession,
        answers,
        report: result.report,
        status: result.isComplete ? "completed" : "in_progress"
      };

      setActiveSession(nextSession);
      setAnswer("");
      setTranscript("");
      setStartedAt(Date.now());
      historyQuery.refetch();
      if (result.nextQuestion) {
        speak(result.nextQuestion);
      }
    }
  });

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const currentQuestionIndex = activeSession?.answers?.length ?? 0;
  const currentQuestion = activeSession?.questions[currentQuestionIndex]?.question;
  const lastEvaluation = activeSession?.answers?.[activeSession.answers.length - 1]?.evaluation;

  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleListening = () => {
    if (!speechSupported) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const text = Array.from({ length: event.results.length })
        .map((_, index) => event.results[index][0].transcript)
        .join(" ");
      setTranscript(text);
      if (form.mode === "video") {
        setAnswer(text);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const report = activeSession?.report;
  const history = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="font-display text-2xl font-bold">AI Interview Preparation</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Live text and video interview modes with speech capture, follow-up questions, evaluation, and history.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {[
            { key: "company", options: ["Amazon", "Infosys", "TCS", "Zoho"] },
            { key: "role", options: ["Software Engineer", "Backend Developer", "Data Analyst"] },
            { key: "difficulty", options: ["easy", "medium", "hard"] },
            { key: "interviewType", options: ["HR", "Technical", "Behavioral", "Coding"] },
            { key: "mode", options: ["text", "video"] }
          ].map((field) => (
            <select
              key={field.key}
              value={form[field.key as keyof typeof form]}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
              className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--text)]"
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
        </div>
        <button onClick={() => startMutation.mutate()} className="mt-4 rounded-full bg-brand-500 px-4 py-2 text-white">
          Start Interview
        </button>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-semibold">Active Interview</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-white/5 p-4 text-sm">{currentQuestion ?? "Start a session to receive the first question."}</div>
            {form.mode === "video" && (
              <div className="space-y-3">
                <video ref={videoRef} muted className="min-h-56 w-full rounded-2xl bg-black/40 object-cover" />
                <p className="text-sm text-[var(--muted)]">
                  {mediaReady ? "Camera and microphone are active." : streamError || "Video mode will request camera and microphone access."}
                </p>
              </div>
            )}
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              className="min-h-36 w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm"
              placeholder={form.mode === "video" ? "Your spoken answer will appear here..." : "Type your answer here..."}
            />
            <div className="flex flex-wrap gap-3">
              <button onClick={toggleListening} className="rounded-full bg-white/10 px-4 py-2 text-sm">
                {isListening ? "Stop microphone" : "Start microphone"}
              </button>
              <button onClick={() => answerMutation.mutate()} disabled={!activeSession || !answer.trim()} className="rounded-full bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-60">
                Submit answer
              </button>
            </div>
            {transcript && <p className="text-sm text-[var(--muted)]">Transcript: {transcript}</p>}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-semibold">AI Evaluation</h2>
          {lastEvaluation ? (
            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              <div>Overall: {lastEvaluation.overallScore}</div>
              <div>Communication: {lastEvaluation.communicationScore}</div>
              <div>Technical: {lastEvaluation.technicalScore}</div>
              <div>Grammar: {lastEvaluation.grammarScore}</div>
              <div>Answer quality: {lastEvaluation.answerQuality}</div>
              <div>Speaking speed: {lastEvaluation.speakingSpeed}</div>
              <div>Filler words: {lastEvaluation.fillerWordAnalysis}</div>
              <div>Strengths: {lastEvaluation.strengths.join(", ")}</div>
              <div>Weaknesses: {lastEvaluation.weaknesses.join(", ")}</div>
              <div>Improvements: {lastEvaluation.improvementSuggestions.join(", ")}</div>
              <div>Ideal answer: {lastEvaluation.idealAnswer}</div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">Evaluation details will appear after the first submitted answer.</p>
          )}
        </Card>
      </section>

      {report && (
        <Card>
          <h2 className="font-display text-xl font-semibold">Interview Report</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
            <div>Overall score: {report.overallScore}</div>
            <div>Communication score: {report.communicationScore}</div>
            <div>Technical score: {report.technicalScore}</div>
            <div>Grammar score: {report.grammarScore}</div>
            <div>Answer quality: {report.answerQuality}</div>
            <div>Speaking speed: {report.speakingSpeed}</div>
            <div>Filler-word analysis: {report.fillerWordAnalysis}</div>
            <div>Strengths: {report.strengths.join(", ")}</div>
            <div>Weaknesses: {report.weaknesses.join(", ")}</div>
            <div>Improvement suggestions: {report.improvementSuggestions.join(", ")}</div>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-display text-xl font-semibold">Interview History</h2>
        <div className="mt-4 space-y-3">
          {history.map((session) => (
            <div key={session.sessionId} className="rounded-2xl bg-white/5 p-4 text-sm">
              <p className="font-semibold">{session.company} - {session.role}</p>
              <p className="mt-1 text-[var(--muted)]">{session.interviewType} • {session.mode} • {session.status}</p>
              {session.report && <p className="mt-2">Overall score: {session.report.overallScore}</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
