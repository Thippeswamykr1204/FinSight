"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Bell,
  CreditCard,
  Goal,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Moon,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Upload,
  WalletCards,
} from "lucide-react";
import { FinanceDialog } from "@/components/finance/primitives";
import { useFinance } from "@/components/finance/provider";
import { summarize } from "@/lib/finance/model";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: WalletCards },
  { href: "/goals", label: "Goals", icon: Goal },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
];
const actions = [
  { href: "/transactions?action=add", label: "Add a transaction", icon: Plus },
  {
    href: "/transactions?action=import",
    label: "Import a statement",
    icon: Upload,
  },
  ...nav,
  { href: "/settings", label: "Settings and data controls", icon: Settings2 },
];
const publicPaths = [
  "/",
  "/login",
  "/pricing",
  "/features",
  "/faq",
  "/privacy",
  "/terms",
];

export function BrandMark() {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="relative grid h-9 w-9 place-items-center rounded-[13px] bg-[#101b16] text-[#b8f2d0]">
        <span className="absolute h-4 w-4 rotate-45 rounded-full border-2 border-[#54d99a] border-b-transparent" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#54d99a]" />
      </span>
      <span className="text-lg font-bold tracking-[-.05em]">finsight</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, ready, update, notice } = useFinance();
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const isPublic = publicPaths.includes(pathname);
  const summary = summarize(state);
  const signals = state.notifications
    ? [
        {
          id: "demo",
          title: "Your demo workspace is ready",
          copy: "Changes are saved on this browser. Use Settings to export or clear them.",
          href: "/settings",
        },
        ...summary.budgets
          .filter((budget) => budget.spent > budget.limit)
          .map((budget) => ({
            id: `budget-${budget.id}`,
            title: `${budget.category} is over budget`,
            copy: "Review the transactions or adjust your monthly limit.",
            href: "/budgets",
          })),
      ].filter((signal) => !state.dismissed.includes(signal.id))
    : [];
  const results = actions.filter((action) =>
    action.label.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    document.documentElement.dataset.theme = isPublic ? "light" : state.theme;
  }, [state.theme, isPublic]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !isPublic
      ) {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPublic]);
  useEffect(() => {
    setMobile(false);
    setPalette(false);
  }, [pathname]);
  if (isPublic) return <>{children}</>;
  const go = (href: string) => {
    setPalette(false);
    router.push(href);
  };
  const navigation = (
    <>
      <Link href="/dashboard" className="block px-2" aria-label="FinSight home">
        <BrandMark />
      </Link>
      <div className="mt-8 flex items-center gap-3 rounded-2xl border bg-[var(--surface-raised)] p-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--mint)] text-sm font-semibold text-[var(--mint-deep)]">
          {state.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {state.name}’s workspace
          </p>
          <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
            Demo · stored on this device
          </p>
        </div>
      </div>
      <nav className="mt-8 flex-1" aria-label="Main navigation">
        <p className="eyebrow mb-3 px-3">Your money</p>
        <div className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobile(false)}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${pathname === href ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"}`}
            >
              <Icon size={17} />
              {label}
              {pathname === href && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--mint-deep)]" />
              )}
            </Link>
          ))}
        </div>
      </nav>
      <div className="mt-7 border-t pt-4">
        <Link
          href="/settings"
          onClick={() => setMobile(false)}
          className="flex items-center gap-3 rounded-xl p-3 text-sm text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]"
        >
          <Settings2 size={17} /> Settings
        </Link>
        <div className="mt-3 rounded-2xl bg-[#101b16] p-4 text-white">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#b8f2d0]">
            <Sparkles size={16} /> A clearer point of view
          </p>
          <p className="mt-3 text-xs leading-5 text-white/70">
            Explore FinSight’s planned memberships and what comes next.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-block text-xs font-semibold text-[#b8f2d0] hover:underline"
          >
            Explore plans ↗
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-3 p-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--cobalt-soft)] text-xs font-bold text-[var(--cobalt)]">
            {state.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="text-xs font-semibold">{state.name}</p>
            <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
              Personal demo
            </p>
          </div>
        </div>
      </div>
    </>
  );
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-[var(--ink)] px-5 py-3 text-[var(--surface)] focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col overflow-y-auto border-r bg-[var(--surface)] p-4 py-6 lg:flex print:hidden">
        {navigation}
      </aside>
      <div className="lg:pl-[252px] print:pl-0">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-3 border-b bg-[var(--canvas)] px-4 sm:px-7 lg:px-10 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
              className="rounded-xl border bg-[var(--surface)] p-3 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="truncate text-base font-semibold tracking-tight">
                {pathname === "/dashboard"
                  ? `Welcome back, ${state.name}`
                  : (nav.find((item) => item.href === pathname)?.label ??
                    (pathname === "/settings" ? "Settings" : "Your workspace"))}
              </h1>
              <p className="mt-1 hidden text-xs text-[var(--ink-soft)] sm:block">
                Your financial operating system.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-soft)] xl:block">
              Demo data
            </span>
            <button
              onClick={() => {
                setPalette(true);
                setQuery("");
              }}
              aria-label="Open command palette"
              className="flex h-10 items-center gap-2 rounded-xl border bg-[var(--surface)] px-3 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              <Search size={16} />
              <span className="hidden md:inline">Search</span>
              <kbd className="ml-3 hidden rounded bg-[var(--surface-muted)] px-1.5 py-1 text-[10px] md:inline">
                ⌘ K
              </kbd>
            </button>
            <button
              onClick={() => setNotifications(true)}
              aria-label={`Notifications, ${signals.length} unread`}
              className="relative rounded-xl border bg-[var(--surface)] p-3"
            >
              <Bell size={16} />
              {!!signals.length && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--ember)]" />
              )}
            </button>
            <button
              onClick={() => {
                try {
                  update((current) => ({
                    ...current,
                    theme: current.theme === "light" ? "dark" : "light",
                  }));
                } catch (error) {
                  notice(String(error));
                }
              }}
              aria-label={`Switch to ${state.theme === "light" ? "dark" : "light"} mode`}
              className="rounded-xl border bg-[var(--surface)] p-3"
            >
              {state.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-[calc(100vh-76px)] px-4 pb-28 pt-7 outline-none sm:px-7 lg:px-10 lg:pb-10"
        >
          <div key={pathname} className="page-enter mx-auto max-w-[1440px]">
            {ready ? (
              children
            ) : (
              <div role="status" className="space-y-5">
                <span className="sr-only">Loading workspace</span>
                <div className="h-10 w-64 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="surface h-96 animate-pulse" />
                  <div className="surface h-96 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-[var(--surface)] px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden print:hidden"
        aria-label="Mobile navigation"
      >
        {nav.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold ${pathname === href ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "text-[var(--ink-soft)]"}`}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
      <FinanceDialog
        open={mobile}
        onClose={() => setMobile(false)}
        title="Your workspace"
        description="Navigate your finances."
      >
        <div className="flex flex-col">{navigation}</div>
      </FinanceDialog>
      <FinanceDialog
        open={palette}
        onClose={() => setPalette(false)}
        title="Find your next step"
        description="Search pages and actions. Use ↑ ↓ to select, Enter to open."
      >
        <label>
          <span className="sr-only">Search actions</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((current) =>
                  Math.min(current + 1, results.length - 1),
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((current) => Math.max(0, current - 1));
              }
              if (event.key === "Enter" && results[selected]) {
                event.preventDefault();
                go(results[selected].href);
              }
            }}
            className="control w-full px-3 text-sm"
            placeholder="Search FinSight…"
          />
        </label>
        <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
          {results.map(({ href, label, icon: Icon }, index) => (
            <button
              key={href}
              onClick={() => go(href)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${selected === index ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "hover:bg-[var(--surface-muted)]"}`}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
          {!results.length && (
            <p className="py-6 text-sm text-[var(--ink-soft)]">
              No matching actions. Try “budget” or “import”.
            </p>
          )}
        </div>
      </FinanceDialog>
      <FinanceDialog
        open={notifications}
        onClose={() => setNotifications(false)}
        title="Notifications"
        description={`${signals.length} unread updates from this workspace.`}
      >
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="rounded-xl border p-4">
              <Link
                href={signal.href}
                onClick={() => setNotifications(false)}
                className="text-sm font-semibold hover:underline"
              >
                {signal.title}
              </Link>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">
                {signal.copy}
              </p>
              <button
                onClick={() => {
                  try {
                    update((current) => ({
                      ...current,
                      dismissed: [...current.dismissed, signal.id],
                    }));
                  } catch (error) {
                    notice(String(error));
                  }
                }}
                className="mt-3 text-xs font-semibold text-[var(--mint-deep)]"
              >
                Mark as read
              </button>
            </div>
          ))}
          {!signals.length && (
            <p className="py-8 text-center text-sm text-[var(--ink-soft)]">
              You are all caught up.
            </p>
          )}
        </div>
      </FinanceDialog>
    </div>
  );
}
