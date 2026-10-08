"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/hosted/client";
export function ReportShare({
  text,
  prepareText,
}: {
  text: string;
  prepareText?: () => Promise<string>;
}) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            const content = prepareText ? await prepareText() : text;
            if (navigator.share)
              await navigator.share({
                title: "FinSight report",
                text: content,
              });
            else {
              await navigator.clipboard.writeText(content);
              setMessage(
                "Report copied. Paste it into WhatsApp or another app.",
              );
            }
          } catch (error) {
            if (!(error instanceof DOMException && error.name === "AbortError"))
              setMessage(
                error instanceof ApiError
                  ? error.message
                  : "Sharing was unavailable. Use the printable report instead.",
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
