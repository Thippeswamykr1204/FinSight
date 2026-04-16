"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-100">Something went wrong</h2>
        <p className="mt-1 text-sm text-slate-400 max-w-sm">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-600 font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}
