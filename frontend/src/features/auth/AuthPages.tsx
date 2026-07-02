import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { useAuth } from "./AuthContext";

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  newPassword: z.string().min(8)
});

type AuthValues = z.infer<typeof authSchema>;
type ResetValues = z.infer<typeof resetSchema>;

function AuthLayout({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthValues>({
    resolver: zodResolver(authSchema)
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in with your Cognito-backed account">
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          try {
            setError(null);
            await login(values.email, values.password);
            navigate("/");
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Login failed");
          }
        })}
      >
        <input {...register("email")} placeholder="Email" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        <input {...register("password")} type="password" placeholder="Password" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={isSubmitting} className="w-full rounded-2xl bg-brand-500 px-4 py-3 font-semibold text-white disabled:opacity-70">
          {isSubmitting ? "Signing in..." : "Login"}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-[var(--muted)]">
        <Link to="/signup">Create account</Link>
        <Link to="/forgot-password">Forgot password</Link>
      </div>
    </AuthLayout>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthValues>({
    resolver: zodResolver(authSchema)
  });

  return (
    <AuthLayout title="Create account" subtitle="Register using the live authentication API">
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          try {
            setError(null);
            await signup(values.email, values.password);
            navigate("/");
          } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : "Signup failed");
          }
        })}
      >
        <input {...register("email")} placeholder="Email" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
        <input {...register("password")} type="password" placeholder="Password" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={isSubmitting} className="w-full rounded-2xl bg-brand-500 px-4 py-3 font-semibold text-white disabled:opacity-70">
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <div className="mt-4 text-sm text-[var(--muted)]">
        <Link to="/login">Already have an account?</Link>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { forgotPassword, resetPassword } = useAuth();
  const [codeSent, setCodeSent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const forgotForm = useForm<Pick<AuthValues, "email">>({
    resolver: zodResolver(authSchema.pick({ email: true }))
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema)
  });

  return (
    <AuthLayout title="Reset password" subtitle="Complete the full forgot-password flow">
      {!codeSent ? (
        <form
          className="space-y-4"
          onSubmit={forgotForm.handleSubmit(async ({ email }) => {
            await forgotPassword(email);
            setCodeSent(true);
            setStatus("Reset code sent to your email.");
            resetForm.setValue("email", email);
          })}
        >
          <input {...forgotForm.register("email")} placeholder="Email" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
          {forgotForm.formState.errors.email && <p className="text-sm text-red-500">{forgotForm.formState.errors.email.message}</p>}
          {status && <p className="text-sm text-brand-700">{status}</p>}
          <button className="w-full rounded-2xl bg-brand-500 px-4 py-3 font-semibold text-white">Send reset code</button>
        </form>
      ) : (
        <form
          className="space-y-4"
          onSubmit={resetForm.handleSubmit(async (values) => {
            await resetPassword(values.email, values.code, values.newPassword);
            setStatus("Password reset complete. You can sign in now.");
          })}
        >
          <input {...resetForm.register("email")} placeholder="Email" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
          <input {...resetForm.register("code")} placeholder="Verification code" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
          <input {...resetForm.register("newPassword")} type="password" placeholder="New password" className="w-full rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3" />
          {status && <p className="text-sm text-brand-700">{status}</p>}
          <button className="w-full rounded-2xl bg-brand-500 px-4 py-3 font-semibold text-white">Reset password</button>
        </form>
      )}
    </AuthLayout>
  );
}
