import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { get, post, put, remove } from "../../lib/api";

type Placement = {
  id: string;
  company: string;
  role: string;
  appliedDate: string;
  oaStatus: string;
  interviewRound: string;
  hrRound: string;
  offerStatus: string;
  notes: string;
};

export function PlacementPage() {
  const emptyForm: Placement = {
    id: "",
    company: "",
    role: "",
    appliedDate: new Date().toISOString().slice(0, 10),
    oaStatus: "Pending",
    interviewRound: "Not Started",
    hrRound: "Pending",
    offerStatus: "Applied",
    notes: ""
  };
  const [form, setForm] = useState<Placement>(emptyForm);

  const listQuery = useQuery({
    queryKey: ["placements"],
    queryFn: () => get<Placement[]>("/placement")
  });
  const analyticsQuery = useQuery({
    queryKey: ["placement-analytics"],
    queryFn: () => get<{ total: number; offers: number; interviewsInProgress: number; oaCleared: number }>("/placement/analytics")
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Placement) =>
      payload.id
        ? put<Placement>(`/placement/${payload.id}`, payload)
        : post<Placement>("/placement", payload),
    onSuccess: () => {
      setForm(emptyForm);
      listQuery.refetch();
      analyticsQuery.refetch();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove(`/placement/${id}`),
    onSuccess: () => {
      listQuery.refetch();
      analyticsQuery.refetch();
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="font-display text-2xl font-bold">Placement Tracker</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Track applications, OA status, interview rounds, HR progress, offers, and notes.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {(["company", "role", "appliedDate", "oaStatus", "interviewRound", "hrRound", "offerStatus"] as const).map((key) => (
            <input
              key={key}
              value={form[key]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              placeholder={key}
              className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm"
            />
          ))}
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes"
            className="rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm md:col-span-2"
          />
        </div>
        <button onClick={() => saveMutation.mutate(form)} className="mt-4 rounded-full bg-brand-500 px-4 py-2 text-sm text-white">
          {form.id ? "Update application" : "Add application"}
        </button>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm text-[var(--muted)]">Total</p><p className="mt-2 text-3xl font-bold">{analyticsQuery.data?.total ?? 0}</p></Card>
        <Card><p className="text-sm text-[var(--muted)]">Offers</p><p className="mt-2 text-3xl font-bold">{analyticsQuery.data?.offers ?? 0}</p></Card>
        <Card><p className="text-sm text-[var(--muted)]">OA Cleared</p><p className="mt-2 text-3xl font-bold">{analyticsQuery.data?.oaCleared ?? 0}</p></Card>
        <Card><p className="text-sm text-[var(--muted)]">Interviews Active</p><p className="mt-2 text-3xl font-bold">{analyticsQuery.data?.interviewsInProgress ?? 0}</p></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(listQuery.data ?? []).map((application) => (
          <Card key={application.id}>
            <p className="font-semibold">{application.company}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{application.role}</p>
            <p className="mt-4 rounded-full bg-brand-50 px-3 py-2 text-sm text-brand-700">{application.offerStatus}</p>
            <div className="mt-4 flex gap-3 text-sm">
              <button onClick={() => setForm(application)} className="rounded-full bg-white/10 px-3 py-2">Edit</button>
              <button onClick={() => deleteMutation.mutate(application.id)} className="rounded-full bg-red-500/15 px-3 py-2 text-red-300">Delete</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
