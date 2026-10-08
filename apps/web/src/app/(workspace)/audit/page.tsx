"use client";
import { useCallback, useEffect, useState } from "react";
import { useFinance } from "@/components/finance/provider";
import { Empty, FormError, PageHeading } from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/hosted/client";
import { displayDate } from "@finsight/shared";
type Event = {
  _id: string;
  action: string;
  actorId: string;
  createdAt: string;
  requestId: string;
};
export default function AuditPage() {
  const { workspace, role } = useFinance();
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    if (!workspace || !["OWNER", "ADMIN"].includes(role ?? "")) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      setEvents(await api<Event[]>(`/workspaces/${workspace.id}/audit`));
      setError("");
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }, [workspace, role]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Access and activity"
        title="Workspace audit history."
        description="The latest 100 recorded changes in this workspace."
      />
      <FormError error={error} />
      <section className="surface overflow-x-auto">
        {busy ? (
          <p role="status" className="p-7">
            Loading audit history…
          </p>
        ) : !["OWNER", "ADMIN"].includes(role ?? "") ? (
          <Empty
            title="Administrator access required"
            description="Workspace owners and administrators can review audit history."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-raised)] text-xs text-[var(--ink-soft)]">
              <tr>
                <th className="px-5 py-3 font-medium">Activity</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Request</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event._id} className="border-t">
                  <td className="px-5 py-4">{event.action}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {displayDate(event.createdAt)}
                  </td>
                  <td className="max-w-xs break-all px-5 py-4 text-xs text-[var(--ink-soft)]">
                    {event.requestId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <Button variant="outline" loading={busy} onClick={() => void load()}>
        Refresh history
      </Button>
    </div>
  );
}
