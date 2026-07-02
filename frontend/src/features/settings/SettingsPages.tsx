import { Card } from "../../components/ui/Card";

export function SettingsPage() {
  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Manage notification preferences, theme, profile, and account-linked provider settings.</p>
    </Card>
  );
}

export function ProfilePage() {
  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Portfolio-facing student profile with goals, resume versions, and activity overview.</p>
    </Card>
  );
}

export function UnauthorizedPage() {
  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">Unauthorized</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">You do not have permission to access this resource.</p>
    </Card>
  );
}

export function NotFoundPage() {
  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">The requested route does not exist.</p>
    </Card>
  );
}
