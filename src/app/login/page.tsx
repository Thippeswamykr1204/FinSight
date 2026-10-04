import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[var(--canvas)] text-sm text-[var(--ink-muted)]">Loading secure sign in…</div>}>
      <LoginForm />
    </Suspense>
  );
}
