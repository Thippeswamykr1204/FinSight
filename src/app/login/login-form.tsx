"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Unable to sign in");
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[0.9fr,1.1fr]">
      <section className="relative hidden overflow-hidden bg-[var(--ink)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-40 top-1/4 h-96 w-96 rounded-full bg-[var(--mint-deep)] opacity-30 blur-3xl" />
        <div className="relative"><Link href="/"><BrandMark /></Link></div>
        <div className="relative max-w-lg"><p className="eyebrow text-white/45">Welcome back</p><h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-[-0.07em] xl:text-6xl">A clearer view is waiting for you.</h1><p className="mt-6 max-w-md text-base leading-7 text-white/60">Pick up where you left off and keep building the financial picture that belongs to you.</p><div className="mt-10 space-y-4 text-sm text-white/75"><p className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[var(--mint)]"><Check className="h-3.5 w-3.5" /></span> Your financial dashboard, in one calm place</p><p className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[var(--mint)]"><Check className="h-3.5 w-3.5" /></span> Private by design, useful by default</p></div></div>
        <p className="relative text-xs text-white/35">© 2026 FinSight · Money, with perspective.</p>
      </section>
      <section className="flex items-center justify-center bg-[var(--canvas)] px-5 py-12 sm:px-8"><div className="w-full max-w-[410px]"><div className="mb-12 flex items-center justify-between lg:hidden"><Link href="/"><BrandMark /></Link><span className="text-xs text-[var(--ink-muted)]">New here? <Link href="/dashboard" className="font-bold text-[var(--mint-deep)]">Try the demo</Link></span></div><div><div className="grid h-12 w-12 place-items-center rounded-[15px] bg-[var(--mint)] text-[var(--mint-deep)]"><LockKeyhole className="h-5 w-5" /></div><h2 className="mt-7 text-3xl font-semibold tracking-[-0.06em] text-[var(--ink)]">Sign in to FinSight</h2><p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">Enter your workspace password to continue.</p></div><form onSubmit={handleSubmit} className="mt-9 space-y-5"><div><label htmlFor="password" className="mb-2 block text-xs font-bold text-[var(--ink)]">Workspace password</label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" autoFocus className="control h-12 bg-[var(--surface)] text-[var(--ink)]" /></div>{error && <div role="alert" className="rounded-[12px] border border-[var(--danger)]/25 bg-[var(--amber-soft)] px-3.5 py-3 text-sm text-[var(--danger)]">{error}</div>}<Button type="submit" loading={loading} className="h-12 w-full">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button></form><div className="mt-8 grid gap-3 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]"><ShieldCheck className="h-4 w-4 text-[var(--mint-deep)]" /> Protected workspace</div><p className="text-xs leading-5 text-[var(--ink-muted)]">Your session is encrypted and automatically expires after a period of inactivity.</p></div><div className="mt-7 flex items-center justify-between text-xs text-[var(--ink-muted)]"><Link href="/" className="hover:text-[var(--ink)]">← Back to home</Link><span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Need an account? <Link href="/pricing" className="font-bold text-[var(--mint-deep)]">See plans</Link></span></div></div></section>
    </main>
  );
}
