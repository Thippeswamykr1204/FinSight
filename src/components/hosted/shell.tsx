"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Calculator,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/layout/app-shell";
import { authClient } from "@/lib/hosted/auth-client";
import { Button } from "@/components/ui/button";
import { FinanceDialog } from "@/components/finance/primitives";

export function HostedShell({
  user,
  memberships,
  children,
}: {
  user: { name: string; email: string };
  memberships: Array<{ role: string; workspace: { id: string; name: string } }>;
  children: ReactNode;
}) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
  }, []);
  useEffect(() => setOpen(false), [path]);
  async function signOut() {
    setBusy(true);
    const result = await authClient.signOut();
    if (result.error) {
      setError(result.error.message ?? "Unable to sign out.");
      setBusy(false);
    } else window.location.assign("/sign-in");
  }
  const navigation = (
    <>
      <Link
        href="/app"
        aria-label="FinSight workspace home"
        className="mb-8 block px-2"
      >
        <BrandMark />
      </Link>
      <p className="eyebrow mb-3 px-3">Your workspaces</p>
      <nav className="space-y-1" aria-label="Hosted workspace navigation">
        <Link
          href="/app"
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${path === "/app" ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "hover:bg-[var(--surface-muted)]"}`}
        >
          <LayoutDashboard size={17} />
          All workspaces
        </Link>
        {memberships.map(({ workspace, role }) => (
          <Link
            key={workspace.id}
            href={`/app/workspaces/${workspace.id}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${path.includes(workspace.id) ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "hover:bg-[var(--surface-muted)]"}`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border bg-[var(--surface)] text-xs font-semibold">
              {workspace.name[0]}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {workspace.name}
              </span>
              <span className="mt-1 block text-[10px] capitalize text-[var(--ink-soft)]">
                {role.toLowerCase()}
              </span>
            </span>
          </Link>
        ))}
      </nav>
      <Link
        href="/app/calculators"
        className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-[var(--surface-muted)]"
      >
        <Calculator size={17} /> Planning calculators
      </Link>
      <Link
        href="/app/security"
        className={`mt-7 flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${path === "/app/security" ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "hover:bg-[var(--surface-muted)]"}`}
      >
        <Fingerprint size={17} />
        Account security
      </Link>
      <div className="mt-auto border-t pt-5">
        <div className="px-2">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">
            {user.email}
          </p>
        </div>
        <Button
          variant="ghost"
          loading={busy}
          onClick={() => void signOut()}
          className="mt-3 w-full justify-start"
        >
          <LogOut size={15} className="mr-2" /> Sign out
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
      </div>
    </>
  );
  return (
    <div className="min-h-screen">
      <a
        href="#hosted-main"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-xl bg-[var(--ink)] p-4 text-[var(--surface)] focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-[252px] flex-col overflow-y-auto border-r bg-[var(--surface)] px-4 py-7 lg:flex">
        {navigation}
      </aside>
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b bg-[var(--canvas)] px-5 sm:px-9">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open workspace navigation"
              onClick={() => setOpen(true)}
              className="rounded-xl border bg-white p-3 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight">
                Your financial workspace
              </h1>
              <p className="mt-1 hidden text-xs text-[var(--ink-soft)] sm:block">
                Connected to your private database records.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--mint-deep)]">
            <ShieldCheck size={14} /> Hosted
          </span>
        </header>
        <main
          id="hosted-main"
          tabIndex={-1}
          className="mx-auto max-w-[1440px] px-5 py-8 outline-none sm:px-9"
        >
          {children}
        </main>
      </div>
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Your account"
        description="Workspaces and security."
      >
        <div className="flex min-h-[60vh] flex-col">{navigation}</div>
      </FinanceDialog>
    </div>
  );
}
