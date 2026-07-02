import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { get, post } from "../../lib/api";

type StudyPlan = {
  id: string;
  week: Array<{ day: string; focus: string; duration: string; outcome: string }>;
};

export function StudyPlanPage() {
  const query = useQuery({
    queryKey: ["study-plans"],
    queryFn: () => get<StudyPlan[]>("/studyplan")
  });

  const generateMutation = useMutation({
    mutationFn: () => post<StudyPlan>("/studyplan/generate"),
    onSuccess: () => query.refetch()
  });

  const activePlan = query.data?.[0];

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Study Planner</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">AI-generated weekly plans based on weaknesses, coding performance, aptitude results, and interview history.</p>
        </div>
        <button onClick={() => generateMutation.mutate()} className="rounded-full bg-brand-500 px-4 py-2 text-sm text-white">
          Regenerate
        </button>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {(activePlan?.week ?? []).map((item) => (
          <div key={`${activePlan?.id ?? "plan"}-${item.day}`} className="rounded-2xl bg-white/5 p-4">
            <p className="font-semibold">{item.day}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.focus}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{item.duration}</p>
            <p className="mt-3 text-sm">{item.outcome}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
