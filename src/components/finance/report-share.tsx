"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function ReportShare({ text }: { text: string }) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            if (navigator.share)
              await navigator.share({ title: "FinSight report", text });
            else {
              await navigator.clipboard.writeText(text);
              setMessage(
                "Report copied. Paste it into WhatsApp or another app.",
              );
            }
          } catch (error) {
            if (!(error instanceof DOMException && error.name === "AbortError"))
              setMessage(
                "Sharing was unavailable. Use the printable report instead.",
              );
          }
        }}
      >
        Share report
      </Button>
      {message && (
        <p role="status" className="mt-2 max-w-xs text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
