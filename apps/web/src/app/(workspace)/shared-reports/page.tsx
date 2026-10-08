"use client";
import { useCallback, useEffect, useState } from "react";
import { useFinance } from "@/components/finance/provider";
import { Empty, FormError, PageHeading } from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/hosted/client";
import { displayDate } from "@finsight/shared";
type Report = { id: string; start: string; end: string; expiresAt: string };
export default function SharedReportsPage() {
  const { workspace, role, notice } = useFinance();
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!workspace || role !== "OWNER") return;
    try {
      setReports(await api<Report[]>(`/workspaces/${workspace.id}/reports`));
      setError("");
    } catch (caught) {
      setError(String(caught));
    }
  }, [workspace, role]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Access you control"
        title="Shared reports."
        description="Review and revoke the summaries shared from this workspace."
      />
      <FormError error={error} />
      <section className="surface p-7">
        {role !== "OWNER" ? (
          <Empty
            title="Owner access required"
            description="The workspace owner manages shared report access."
          />
        ) : reports.length ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5"
              >
                <div>
                  <h3 className="text-sm font-semibold">
                    {displayDate(report.start)} – {displayDate(report.end)}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">
                    Expires {displayDate(report.expiresAt)}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await api(
                        `/workspaces/${workspace?.id}/reports/${report.id}`,
                        { method: "DELETE" },
                      );
                      await load();
                      notice("Shared report revoked.");
                    } catch (caught) {
                      setError(String(caught));
                    }
                  }}
                >
                  Revoke report
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No active shared reports"
            description="Share a financial-year summary from Insights. Shared links expire after seven days."
          />
        )}
      </section>
    </div>
  );
}
