"use client";
import { Button } from "@/components/ui/button";
export default function HostedError({ reset }: { reset: () => void }) {
  return (
    <section className="surface mx-auto max-w-xl p-8">
      <h2 className="text-2xl font-semibold">Your workspace could not load.</h2>
      <p className="my-5 text-sm leading-7 text-[var(--ink-soft)]">
        The server may be temporarily unavailable, or your session may have
        expired. No demo data has been substituted.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <a href="/sign-in">Sign in again</a>
        </Button>
      </div>
    </section>
  );
}
