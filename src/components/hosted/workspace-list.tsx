"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { api } from "@/lib/hosted/client";

export function WorkspaceList({
  memberships,
}: {
  memberships: Array<{
    role: string;
    workspace: { id: string; name: string; currency: string };
  }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const name = String(new FormData(event.currentTarget).get("name"));
    try {
      const workspace = await api<{ id: string }>("/workspaces", {
        method: "POST",
        body: { name },
      });
      setOpen(false);
      router.push(`/app/workspaces/${workspace.id}`);
      router.refresh();
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="A place for your plans"
        title="Your workspaces."
        description="A private financial picture for you and the people you choose."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus size={15} className="mr-2" /> Create workspace
        </Button>
      </PageHeading>
      {memberships.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {memberships.map(({ workspace, role }) => (
            <Link
              key={workspace.id}
              href={`/app/workspaces/${workspace.id}`}
              className="surface surface-hover p-7"
            >
              <div className="flex justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--mint)] text-[var(--mint-deep)]">
                  <Users size={23} />
                </span>
                <ArrowUpRight size={19} className="text-[var(--ink-soft)]" />
              </div>
              <h2 className="mt-7 text-xl font-semibold">{workspace.name}</h2>
              <p className="mt-3 text-xs capitalize text-[var(--ink-soft)]">
                {role.toLowerCase()} · {workspace.currency} workspace
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <section className="surface">
          <Empty
            title="Let’s build your financial picture."
            description="Start an empty workspace, then add an account and your first money move. Demo data is never imported automatically."
          >
            <Button onClick={() => setOpen(true)}>
              Create your first workspace
            </Button>
          </Empty>
        </section>
      )}
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create a workspace"
        description="You will be its owner. You can invite members with limited roles later."
      >
        <form className="space-y-5" onSubmit={create}>
          <Field label="Workspace name">
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              className="control px-3"
              placeholder="Our household"
            />
          </Field>
          <FormError error={error} />
          <Button type="submit" loading={busy} className="w-full">
            Create workspace
          </Button>
        </form>
      </FinanceDialog>
    </div>
  );
}
