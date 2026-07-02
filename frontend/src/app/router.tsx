import { Suspense, lazy, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { Card } from "../components/ui/Card";

const DashboardPage = lazy(async () => {
  const module = await import("../features/dashboard/DashboardPage");
  return { default: module.DashboardPage };
});
const LoginPage = lazy(async () => {
  const module = await import("../features/auth/AuthPages");
  return { default: module.LoginPage };
});
const SignupPage = lazy(async () => {
  const module = await import("../features/auth/AuthPages");
  return { default: module.SignupPage };
});
const ForgotPasswordPage = lazy(async () => {
  const module = await import("../features/auth/AuthPages");
  return { default: module.ForgotPasswordPage };
});
const ResumePage = lazy(async () => {
  const module = await import("../features/resume/ResumePage");
  return { default: module.ResumePage };
});
const InterviewPage = lazy(async () => {
  const module = await import("../features/interview/InterviewPage");
  return { default: module.InterviewPage };
});
const CodingPage = lazy(async () => {
  const module = await import("../features/practice/PracticePages");
  return { default: module.CodingPage };
});
const AptitudePage = lazy(async () => {
  const module = await import("../features/practice/PracticePages");
  return { default: module.AptitudePage };
});
const CompanyPrepPage = lazy(async () => {
  const module = await import("../features/practice/PracticePages");
  return { default: module.CompanyPrepPage };
});
const PlacementPage = lazy(async () => {
  const module = await import("../features/placement/PlacementPage");
  return { default: module.PlacementPage };
});
const AssistantPage = lazy(async () => {
  const module = await import("../features/assistant/AssistantPage");
  return { default: module.AssistantPage };
});
const StudyPlanPage = lazy(async () => {
  const module = await import("../features/study/StudyPlanPage");
  return { default: module.StudyPlanPage };
});
const SettingsPage = lazy(async () => {
  const module = await import("../features/settings/SettingsPages");
  return { default: module.SettingsPage };
});
const ProfilePage = lazy(async () => {
  const module = await import("../features/settings/SettingsPages");
  return { default: module.ProfilePage };
});
const UnauthorizedPage = lazy(async () => {
  const module = await import("../features/settings/SettingsPages");
  return { default: module.UnauthorizedPage };
});
const NotFoundPage = lazy(async () => {
  const module = await import("../features/settings/SettingsPages");
  return { default: module.NotFoundPage };
});

function PageLoader() {
  return (
    <Card className="mx-auto mt-12 max-w-xl text-center">
      <p className="font-display text-xl font-semibold">Loading PrepAI...</p>
      <p className="mt-2 text-sm text-[var(--muted)]">Preparing your placement dashboard and AI tools.</p>
    </Card>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: withSuspense(<LoginPage />) },
  { path: "/signup", element: withSuspense(<SignupPage />) },
  { path: "/forgot-password", element: withSuspense(<ForgotPasswordPage />) },
  { path: "/unauthorized", element: withSuspense(<UnauthorizedPage />) },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: "resume", element: withSuspense(<ResumePage />) },
      { path: "interview", element: withSuspense(<InterviewPage />) },
      { path: "coding", element: withSuspense(<CodingPage />) },
      { path: "aptitude", element: withSuspense(<AptitudePage />) },
      { path: "companies", element: withSuspense(<CompanyPrepPage />) },
      { path: "placement", element: withSuspense(<PlacementPage />) },
      { path: "assistant", element: withSuspense(<AssistantPage />) },
      { path: "study-plan", element: withSuspense(<StudyPlanPage />) },
      { path: "profile", element: withSuspense(<ProfilePage />) },
      { path: "settings", element: withSuspense(<SettingsPage />) }
    ]
  },
  { path: "*", element: withSuspense(<NotFoundPage />) }
]);
