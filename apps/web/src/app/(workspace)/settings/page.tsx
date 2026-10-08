"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, LockKeyhole, Trash2 } from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import {
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { download } from "@finsight/shared";
import { api } from "@/lib/hosted/client";
import { authClient } from "@/lib/hosted/auth-client";

export default function SettingsPage() {
  const { state, update, notice, workspace, role, refresh } = useFinance();
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await update((current) => ({
        ...current,
        name: String(data.get("name")).trim(),
        locale: String(data.get("locale")) as typeof current.locale,
        notifications: data.get("notifications") === "on",
      }));
      notice("Preferences saved.");
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  async function exportData(personal: boolean) {
    setError("");
    setBusy(true);
    try {
      const result = await api(
        personal ? "/me" : `/workspaces/${workspace?.id}/export`,
      );
      download(
        JSON.stringify(result, null, 2),
        personal ? "finsight-personal-data.json" : "finsight-workspace.json",
        "application/json",
      );
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        eyebrow="Your preferences"
        title="Make FinSight feel like yours."
        description="Profile, display preferences, and control over your financial data."
      />
      <form onSubmit={save} className="surface space-y-6 p-7">
        <h3 className="text-lg font-semibold">Personal workspace</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name">
            <input
              name="name"
              defaultValue={state.name}
              required
              maxLength={60}
              className="control px-3"
            />
          </Field>
          <Field label="Number and date formatting">
            <select
              name="locale"
              defaultValue={state.locale}
              className="control px-3"
            >
              <option value="en-IN">English (India)</option>
            </select>
          </Field>
        </div>
        <p className="text-xs leading-6 text-[var(--ink-soft)]">
          INR · Indian digit grouping · DD/MM/YYYY · Asia/Kolkata. The financial
          year runs from April to March. No exchange-rate conversion is
          performed.
        </p>
        <label className="flex items-center gap-3 text-sm">
          <input
            name="notifications"
            type="checkbox"
            defaultChecked={state.notifications}
            className="h-4 w-4 accent-emerald-700"
          />{" "}
          Show in-app financial notifications
        </label>
        <FormError error={error} />
        <Button type="submit" loading={busy}>
          Save preferences
        </Button>
      </form>
      <section className="surface p-7">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <LockKeyhole size={19} /> Data and privacy
        </h3>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
          Transactions, accounts, budgets, and goals are stored in your private
          workspace. Workspace roles control who can view or edit records.
          Export your records at any time; owners can permanently delete a
          workspace after a recent sign-in.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void exportData(true)}
          >
            Export personal data
          </Button>
          <Button
            variant="outline"
            disabled={busy || !workspace || role !== "OWNER"}
            onClick={() => void exportData(false)}
          >
            <Download size={15} className="mr-2" /> Export workspace data
          </Button>
          <Button variant="outline" asChild>
            <Link href="/workspaces">Manage workspaces</Link>
          </Button>
          <Button
            variant="destructive"
            disabled={!workspace || role !== "OWNER"}
            onClick={() => {
              setError("");
              setDeleting(true);
            }}
          >
            <Trash2 size={15} className="mr-2" /> Delete workspace
          </Button>
        </div>
      </section>
      <section className="surface p-7">
        <h3 className="text-lg font-semibold">Membership and security</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
          Manage the people who share your workspace, review its audit history,
          and protect your account with passkeys or an authenticator. Recurring
          rules keep regular income and expenses recorded.
        </p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold text-[var(--mint-deep)]">
          <Link href="/billing">Membership and billing →</Link>
          <Link href="/members">Members and invitations →</Link>
          <Link href="/security">Account security and data rights →</Link>
          <Link href="/audit">Audit history →</Link>
          <Link href="/recurring">Recurring transactions →</Link>
          <Link href="/shared-reports">Shared reports →</Link>
        </div>
        <Button
          variant="outline"
          className="mt-5"
          onClick={async () => {
            try {
              const result = await authClient.signOut();
              if (result.error) throw new Error(result.error.message);
              window.location.assign("/sign-in");
            } catch (caught) {
              setError(String(caught));
            }
          }}
        >
          Sign out
        </Button>
      </section>
      <FinanceDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this workspace?"
        description="This permanently removes the workspace and its financial records. Export first. A sign-in within the last 10 minutes is required."
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
              await api(`/workspaces/${workspace?.id}`, {
                method: "DELETE",
                body: { confirmation },
              });
              setDeleting(false);
              await refresh();
              notice("Workspace deleted.");
            } catch (caught) {
              setError(String(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={`Type DELETE ${workspace?.name ?? ""}`}>
            <input
              name="confirmation"
              required
              autoComplete="off"
              className="control px-3"
            />
          </Field>
          <FormError error={error} />
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setDeleting(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" loading={busy}>
              Permanently delete workspace
            </Button>
          </div>
        </form>
      </FinanceDialog>
    </div>
  );
}
