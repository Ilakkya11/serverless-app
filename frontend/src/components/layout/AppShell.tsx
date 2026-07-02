import { NavLink, Outlet } from "react-router-dom";
import { Brain, Briefcase, ChartNoAxesCombined, Code2, FileText, LayoutDashboard, Settings, Target, UserCircle2 } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/resume", label: "Resume AI", icon: FileText },
  { to: "/interview", label: "Interview Prep", icon: Brain },
  { to: "/coding", label: "Coding Practice", icon: Code2 },
  { to: "/aptitude", label: "Aptitude", icon: Target },
  { to: "/companies", label: "Companies", icon: ChartNoAxesCombined },
  { to: "/placement", label: "Placement Tracker", icon: Briefcase },
  { to: "/assistant", label: "Career Assistant", icon: ChartNoAxesCombined },
  { to: "/study-plan", label: "Study Plan", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="glass border-b border-white/10 p-6 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-8">
          <p className="font-display text-2xl font-bold">PrepAI</p>
          <p className="mt-2 text-sm text-[var(--muted)]">AI placement preparation workspace</p>
        </div>
        <nav className="space-y-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? "bg-brand-500 text-white" : "text-[var(--muted)] hover:bg-white/10 hover:text-[var(--text)]"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 rounded-3xl bg-brand-900 p-5 text-brand-50">
          <UserCircle2 className="mb-3" />
          <p className="font-semibold">{user?.name || "Student"}</p>
          <p className="text-sm text-brand-100">{user?.email || "demo@prepai.dev"}</p>
          <button onClick={logout} className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm">
            Logout
          </button>
        </div>
      </aside>
      <main className="p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
