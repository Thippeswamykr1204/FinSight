"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="surface mx-auto max-w-lg p-8 text-center">
      <AlertTriangle className="mx-auto text-[var(--ember)]" size={28} />
      <h2 className="mt-5 text-2xl font-semibold tracking-tight">
        This view could not load.
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
        Try opening it again. Your saved demo records are retained in this
        browser.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-[var(--ink-soft)]">
          Reference: {error.digest}
        </p>
      )}
      <Button variant="outline" onClick={reset} className="mt-6">
        <RefreshCw size={15} className="mr-2" /> Try again
      </Button>
    </section>
  );
}
