"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to sign in");
      }

      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_30%)]" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-700/50 bg-slate-900/85 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Sign in to FinSight</h1>
            <p className="mt-1 text-sm text-slate-400">Enter your app password to continue.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">Password</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter app password"
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Unlock FinSight
          </Button>
        </form>
      </div>
    </div>
  );
}
