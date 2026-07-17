import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { api, get, post } from "../../lib/api";
import { extractTextFromPdf } from "../../lib/pdf";

type ResumeRecord = {
  id: string;
  fileName: string;
  report: {
    atsScore: number;
    grammarReview: string;
    missingKeywords: string[];
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    summary: string;
  };
};

export function ResumePage() {
  const [status, setStatus] = useState<string>("Upload a PDF to start the analysis.");
  const [latest, setLatest] = useState<ResumeRecord | null>(null);
  const historyQuery = useQuery({
    queryKey: ["resume-history"],
    queryFn: () => get<ResumeRecord[]>("/resume/history")
  });

  const analyzeResume = useMutation({
    mutationFn: async (file: File) => {
      setStatus("Preparing secure upload URL...");
      const upload = await post<{ key: string; uploadUrl: string }>("/resume/upload", {
        fileName: file.name,
        contentType: file.type || "application/pdf"
      });
      setStatus("Uploading resume to cloud storage...");
      await axios.put(upload.uploadUrl, file, {
        headers: {
          "Content-Type": file.type || "application/pdf"
        }
      });
      setStatus("Extracting PDF text...");
      const extractedText = await extractTextFromPdf(file);
      setStatus("Running AI analysis...");
      return post<ResumeRecord>("/resume/analyze", {
        resumeKey: upload.key,
        fileName: file.name,
        extractedText
      });
    },
    onSuccess: (record) => {
      setLatest(record);
      setStatus("Resume analysis completed.");
      historyQuery.refetch();
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "Resume analysis failed.");
    }
  });

  const record = latest ?? historyQuery.data?.[0] ?? null;
  const report = record?.report;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <h1 className="font-display text-2xl font-bold">AI Resume Analyzer</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Upload a PDF, store it in S3, extract the text, and generate a live ATS report.</p>
        <label className="mt-6 flex cursor-pointer flex-col rounded-3xl border border-dashed border-[var(--border)] p-8 text-center">
          <span className="font-semibold">Drop PDF here or browse</span>
          <span className="mt-2 text-sm text-[var(--muted)]">The current UI is preserved; the upload flow is now connected to the backend.</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                analyzeResume.mutate(file);
              }
            }}
          />
        </label>
        <p className="mt-4 text-sm text-[var(--muted)]">{status}</p>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-semibold">Latest Analysis</h2>
        {report ? (
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-2xl bg-white/5 p-3">ATS score: {report.atsScore}/100</div>
            <div className="rounded-2xl bg-white/5 p-3">Grammar: {report.grammarReview}</div>
            <div className="rounded-2xl bg-white/5 p-3">Missing keywords: {report.missingKeywords.join(", ") || "None"}</div>
            <div className="rounded-2xl bg-white/5 p-3">Strengths: {report.strengths.join(", ")}</div>
            <div className="rounded-2xl bg-white/5 p-3">Weaknesses: {report.weaknesses.join(", ")}</div>
            <div className="rounded-2xl bg-white/5 p-3">Suggestions: {report.suggestions.join(", ")}</div>
            <button
              className="rounded-full bg-brand-500 px-4 py-2 text-white"
              onClick={() => {
                const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${record.fileName}-report.json`;
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download report
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">No resume analysis available yet.</p>
        )}
      </Card>
    </div>
  );
}
