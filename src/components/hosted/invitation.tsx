"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/finance/primitives";
import { api } from "@/lib/hosted/client";

export function Invitation({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    try {
      const result = await api<{ workspaceId: string }>("/invitations/accept", {
        method: "POST",
        body: { token },
      });
      router.push(`/app/workspaces/${result.workspaceId}`);
      router.refresh();
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface mx-auto max-w-xl p-8">
      <p className="eyebrow">A shared financial picture</p>
      <h2 className="mt-5 text-3xl font-semibold tracking-tight">
        You have been invited.
      </h2>
      <p className="my-5 text-sm leading-7 text-[var(--ink-soft)]">
        Accept using the verified email address that received the invitation.
        Your assigned role determines what you can view and change.
      </p>
      <FormError error={error} />
      <Button
        className="mt-5"
        loading={busy}
        disabled={!token}
        onClick={() => void accept()}
      >
        Accept invitation
      </Button>
    </section>
  );
}
