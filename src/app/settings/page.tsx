"use client";

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
import { download } from "@/lib/finance/import-export";
import { legacyDemoStorageKey } from "@/lib/finance/storage";

export default function SettingsPage() {
  const { state, update, notice, reset } = useFinance();
  const [error, setError] = useState("");
  const [action, setAction] = useState<"reset" | "delete" | null>(null);
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      update((current) => ({
        ...current,
        name: String(data.get("name")).trim(),
        locale: String(data.get("locale")) as typeof current.locale,
        notifications: data.get("notifications") === "on",
      }));
      notice("Preferences saved.");
    } catch (caught) {
      setError(String(caught));
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeading
        eyebrow="Your preferences"
        title="Make FinSight feel like yours."
        description="Profile, display preferences, and control over your demo data."
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
        <Button type="submit">Save preferences</Button>
      </form>
      <section className="surface p-7">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <LockKeyhole size={19} /> Data and privacy
        </h3>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
          Demo transactions, accounts, budgets, and goals are stored in this
          browser’s local storage. They are not synchronized or encrypted with a
          user-held key. Anyone with access to this browser profile can view
          them. Use sample data when sharing the demo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              const legacy = localStorage.getItem(legacyDemoStorageKey);
              if (legacy)
                download(
                  legacy,
                  "finsight-legacy-currency-workspace.json",
                  "application/json",
                );
              else
                notice(
                  "No earlier currency workspace is stored in this browser.",
                );
            }}
          >
            Export earlier currency data
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              download(
                JSON.stringify(state, null, 2),
                "finsight-workspace.json",
                "application/json",
              )
            }
          >
            <Download size={15} className="mr-2" /> Export all demo data
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setError("");
              setAction("reset");
            }}
          >
            Restore sample data
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setError("");
              setAction("delete");
            }}
          >
            <Trash2 size={15} className="mr-2" /> Clear demo data
          </Button>
        </div>
      </section>
      <section className="surface p-7">
        <h3 className="text-lg font-semibold">Membership and security</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
          The demo does not create a paid membership or an online user account.
          Hosted authentication and MFA are available in configured deployments
          at /app. Billing and live bank connections are planned, not live. This
          browser-local demo has no hosted sessions or payment methods.
        </p>
        <a
          href="/pricing"
          className="mt-5 inline-block text-sm font-semibold text-[var(--mint-deep)]"
        >
          Read about planned memberships →
        </a>
      </section>
      <FinanceDialog
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action === "delete"
            ? "Clear this demo workspace?"
            : "Restore sample data?"
        }
        description="This replaces all accounts, transactions, budgets, goals, and preferences stored by this demo. Export a copy first if you want to keep them."
      >
        <FormError error={error} />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setAction(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              try {
                reset(action === "delete");
                setAction(null);
                notice(
                  action === "delete"
                    ? "Demo records cleared from this browser."
                    : "Sample workspace restored.",
                );
              } catch (caught) {
                setError(String(caught));
              }
            }}
          >
            {action === "delete" ? "Clear demo data" : "Restore sample data"}
          </Button>
        </div>
      </FinanceDialog>
    </div>
  );
}
