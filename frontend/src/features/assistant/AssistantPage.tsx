import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { get, post } from "../../lib/api";

type ChatMessage = {
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  createdAt: string;
};

export function AssistantPage() {
  const [message, setMessage] = useState("");
  const historyQuery = useQuery({
    queryKey: ["assistant-history"],
    queryFn: () => get<ChatMessage[]>("/assistant/history")
  });

  const sendMutation = useMutation({
    mutationFn: () => post<{ conversationId: string; reply: string }>("/assistant/chat", { message }),
    onSuccess: () => {
      setMessage("");
      historyQuery.refetch();
    }
  });

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">AI Career Assistant</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Ask about DBMS, DSA, interview questions, certifications, project ideas, and study plans.</p>
      <div className="mt-6 rounded-3xl border border-[var(--border)] p-4">
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-28 w-full bg-transparent text-sm outline-none" placeholder='Prompt example: "Create a 7-day preparation plan for Infosys system engineer interview."' />
        <button onClick={() => sendMutation.mutate()} className="mt-4 rounded-full bg-brand-500 px-4 py-2 text-white">
          Send
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {(historyQuery.data ?? []).map((entry) => (
          <div key={entry.createdAt} className="rounded-2xl bg-white/5 p-4 text-sm">
            <p className="font-semibold">You</p>
            <p className="mt-1 text-[var(--muted)]">{entry.userMessage}</p>
            <p className="mt-3 font-semibold">PrepAI</p>
            <p className="mt-1">{entry.assistantMessage}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
