"use client";
import { useState } from "react";
import { api } from "@/lib/hosted/client";
import { Button } from "@/components/ui/button";
import {
  Field,
  FinanceDialog,
  FormError,
} from "@/components/finance/primitives";
import { download } from "@/lib/finance/import-export";

export function DataRights() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="surface space-y-5 p-7">
      <h2 className="text-xl font-semibold">Your personal data</h2>
      <p className="text-sm leading-7 text-[var(--ink-soft)]">
        Export your profile, memberships and device metadata. Workspace owners
        can export financial records from Members. Delete your owned workspaces
        first; other people’s workspaces remain. Account deletion removes
        credentials, devices, memberships and stored email addressed to you.
        Encrypted backups and messages already delivered follow your operator’s
        retention policy.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              download(
                JSON.stringify(await api("/me"), null, 2),
                "finsight-personal-data.json",
                "application/json",
              );
            } catch (caught) {
              setError(String(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          Export personal data
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
        >
          Delete my account
        </Button>
      </div>
      <FormError error={error} />
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your hosted account?"
        description="This is permanent. Export first. Sign in again if your session is older than 10 minutes."
      >
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const confirmation = String(
              new FormData(event.currentTarget).get("confirmation"),
            );
            setBusy(true);
            setError("");
            try {
              await api("/me", { method: "DELETE", body: { confirmation } });
              window.location.assign("/sign-in");
            } catch (caught) {
              setError(String(caught));
              setBusy(false);
            }
          }}
        >
          <Field label="Type DELETE MY ACCOUNT">
            <input
              name="confirmation"
              required
              className="control px-3"
              autoComplete="off"
            />
          </Field>
          <FormError error={error} />
          <Button type="submit" variant="destructive" loading={busy}>
            Permanently delete account
          </Button>
        </form>
      </FinanceDialog>
    </section>
  );
}
