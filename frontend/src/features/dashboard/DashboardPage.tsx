import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card } from "../../components/ui/Card";
import { get } from "../../lib/api";
import { formatPercent } from "../../lib/utils";

type DashboardResponse = {
  readinessScore: number;
  resumeScore: number;
  interviewScore: number;
  codingProgress: number;
  aptitudeProgress: number;
  dailyStreak: number;
  weeklyProgress: Array<{ day: string; score: number }>;
  recommendedTopics: string[];
  upcomingInterviews: string[];
  recentActivity: string[];
};

export function DashboardPage() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => get<DashboardResponse>("/dashboard")
  });

  const metrics = [
    { label: "Placement Readiness", value: data?.readinessScore ?? 0, hint: "Composite score from your live progress" },
    { label: "Resume Score", value: data?.resumeScore ?? 0, hint: "Latest ATS and content analysis" },
    { label: "Interview Score", value: data?.interviewScore ?? 0, hint: "Average from completed interview sessions" },
    { label: "Coding Progress", value: data?.codingProgress ?? 0, hint: "Submission score across coding practice" }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-[var(--muted)]">{metric.label}</p>
            <p className="mt-3 font-display text-4xl font-bold">{formatPercent(metric.value)}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{metric.hint}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">Weekly Progress</h1>
              <p className="text-sm text-[var(--muted)]">Live scores based on resume, interview, coding, and aptitude activity</p>
            </div>
            <div className="rounded-full bg-brand-50 px-4 py-2 text-sm text-brand-700">Streak: {data?.dailyStreak ?? 0} days</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.weeklyProgress ?? []}>
                <defs>
                  <linearGradient id="score" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#23a36d" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#23a36d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#23a36d" fill="url(#score)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-xl font-semibold">Recommended Topics</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {(data?.recommendedTopics ?? []).map((item) => (
                <span key={item} className="rounded-full bg-brand-50 px-3 py-2 text-sm text-brand-700">
                  {item}
                </span>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-semibold">Upcoming Interviews</h2>
            <div className="mt-4 space-y-3">
              {(data?.upcomingInterviews ?? []).map((item) => (
                <div key={item} className="rounded-2xl bg-white/5 p-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl font-semibold">Recent Activity</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {(data?.recentActivity ?? []).map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
