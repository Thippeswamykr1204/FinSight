"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import {
  Empty,
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/hosted/client";
import { displayDate } from "@finsight/shared";

type Member = {
  userId: string;
  role: string;
  user: { name: string; email: string };
};
type Invite = { id: string; email: string; role: string; expiresAt: string };
export default function MembersPage() {
  const { workspace, role, notice } = useFinance();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const canManage = role === "OWNER" || role === "ADMIN";
  const load = useCallback(async () => {
    if (!workspace) return;
    try {
      const overview = await api<{ members: Member[] }>(
        `/workspaces/${workspace.id}/overview`,
      );
      setMembers(overview.members);
      if (canManage)
        setInvitations(
          await api<Invite[]>(`/workspaces/${workspace.id}/invitations`),
        );
      setError("");
    } catch (caught) {
      setError(String(caught));
    }
  }, [workspace, canManage]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!workspace)
    return (
      <section className="surface">
        <Empty
          title="Create a workspace first"
          description="Your workspace brings members and their records together."
        />
      </section>
    );
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="A shared financial picture"
        title="Workspace members."
        description="Choose who can view or change this workspace."
      >
        <Button
          disabled={!canManage}
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={15} className="mr-2" /> Invite member
        </Button>
      </PageHeading>
      <FormError error={error} />
      <section className="surface overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-raised)] text-xs text-[var(--ink-soft)]">
            <tr>
              <th className="px-5 py-3 font-medium">Member</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-t">
                <td className="px-5 py-4">
                  <p className="font-semibold">{member.user.name}</p>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    {member.user.email}
                  </p>
                </td>
                <td className="px-5 py-4">
                  {role === "OWNER" && member.role !== "OWNER" ? (
                    <select
                      aria-label={`Role for ${member.user.email}`}
                      value={member.role}
                      className="control px-3 text-xs"
                      onChange={async (event) => {
                        try {
                          await api(
                            `/workspaces/${workspace.id}/members/${member.userId}`,
                            {
                              method: "PATCH",
                              body: { role: event.target.value },
                            },
                          );
                          await load();
                          notice("Member role updated.");
                        } catch (caught) {
                          setError(String(caught));
                        }
                      }}
                    >
                      {["ADMIN", "EDITOR", "VIEWER"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  ) : (
                    member.role.toLowerCase()
                  )}
                </td>
                <td className="px-5 py-4">
                  {canManage &&
                    member.role !== "OWNER" &&
                    (member.role !== "ADMIN" || role === "OWNER") && (
                      <Button
                        variant="ghost"
                        aria-label={`Remove ${member.user.email}`}
                        onClick={async () => {
                          try {
                            await api(
                              `/workspaces/${workspace.id}/members/${member.userId}`,
                              { method: "DELETE" },
                            );
                            await load();
                            notice("Member removed.");
                          } catch (caught) {
                            setError(String(caught));
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </Button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {canManage && (
        <section className="surface p-7">
          <h3 className="text-lg font-semibold">Pending invitations</h3>
          {invitations.length ? (
            <div className="mt-5 space-y-4">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div>
                    <p className="text-sm font-semibold">{invite.email}</p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {invite.role.toLowerCase()} · expires{" "}
                      {displayDate(invite.expiresAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await api(
                          `/workspaces/${workspace.id}/invitations/${invite.id}`,
                          { method: "DELETE" },
                        );
                        await load();
                      } catch (caught) {
                        setError(String(caught));
                      }
                    }}
                  >
                    Revoke invitation
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No pending invitations"
              description="Invite someone by email to share this workspace."
            />
          )}
        </section>
      )}
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Invite a member"
        description="They must verify the invited email address before accepting. Invitations expire in 3 days."
      >
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const body = {
              email: String(form.get("email")),
              role: String(form.get("role")),
            };
            const payload = JSON.stringify(body);
            if (pending.current?.payload !== payload)
              pending.current = { payload, key: crypto.randomUUID() };
            setBusy(true);
            setError("");
            try {
              await api(`/workspaces/${workspace.id}/members`, {
                method: "POST",
                body,
                key: pending.current.key,
              });
              pending.current = null;
              setOpen(false);
              await load();
              notice("Invitation sent.");
            } catch (caught) {
              setError(String(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Email address">
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              className="control px-3"
            />
          </Field>
          <Field label="Role">
            <select name="role" className="control px-3" defaultValue="VIEWER">
              {(role === "OWNER"
                ? ["VIEWER", "EDITOR", "ADMIN"]
                : ["VIEWER", "EDITOR"]
              ).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <FormError error={error} />
          <Button type="submit" loading={busy} className="w-full">
            Send invitation
          </Button>
        </form>
      </FinanceDialog>
    </div>
  );
}
