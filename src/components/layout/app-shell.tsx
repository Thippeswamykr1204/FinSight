"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Bell,
  ChevronDown,
  Command,
  CreditCard,
  Goal,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/budgets", label: "Budgets", icon: WalletCards },
      { href: "/goals", label: "Goals", icon: Goal },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/insights", label: "Insights", icon: Lightbulb },
      { href: "/accounts", label: "Accounts", icon: CreditCard },
    ],
  },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Good morning, Alex", description: "Here is your money, at a glance." },
  "/transactions": { title: "Transactions", description: "Every move, automatically organized." },
  "/budgets": { title: "Budgets", description: "Give every dollar a direction." },
  "/goals": { title: "Goals", description: "Small steps toward the life you want." },
  "/insights": { title: "Insights", description: "A clearer read on your financial patterns." },
  "/accounts": { title: "Accounts", description: "Your financial world, connected." },
  "/settings": { title: "Settings", description: "Make FinSight work your way." },
  "/admin": { title: "Admin", description: "Keep the product healthy and trusted." },
};

const paletteItems = [
  { href: "/transactions?action=add", label: "Add a transaction", hint: "Create", icon: Plus },
  { href: "/transactions?action=import", label: "Import a statement", hint: "Upload", icon: Upload },
  { href: "/budgets", label: "Review your budgets", hint: "Plan", icon: WalletCards },
  { href: "/goals", label: "Open your goals", hint: "Focus", icon: Goal },
  { href: "/settings", label: "Open settings", hint: "Manage", icon: Settings2 },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-[var(--ink)] text-[var(--mint)] shadow-[var(--shadow-sm)]">
        <span className="absolute h-4 w-4 rounded-full border-2 border-[var(--mint-strong)] border-b-transparent rotate-45" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--mint-strong)]" />
      </span>
      {!compact && (
        <span className="text-[1.05rem] font-bold tracking-[-0.04em] text-[var(--ink)]">finsight</span>
      )}
    </div>
  );
}

function Sidebar({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <aside className="flex h-full w-[252px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] px-4 py-5">
      <div className="flex items-center justify-between px-2">
        <Link href="/dashboard" aria-label="FinSight home" onClick={onClose}>
          <BrandMark />
        </Link>
        {onClose && (
          <button className="grid h-9 w-9 place-items-center rounded-xl text-[var(--ink-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]" onClick={onClose} aria-label="Close navigation">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-8 rounded-[16px] border border-[var(--line)] bg-[var(--surface-raised)] p-3">
        <button className="flex w-full items-center gap-3 text-left" aria-label="Switch workspace">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--mint)] text-xs font-bold text-[var(--mint-deep)]">A</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-[var(--ink)]">Alex’s household</span>
            <span className="mt-0.5 block text-[0.68rem] text-[var(--ink-muted)]">Personal workspace</span>
          </span>
          <ChevronDown className="h-4 w-4 text-[var(--ink-muted)]" />
        </button>
      </div>

      <nav className="mt-8 flex-1" aria-label="Main navigation">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-7">
            <p className="mb-2 px-3 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-muted)]">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--mint)] text-[var(--mint-deep)]"
                        : "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
                    )}
                  >
                    <Icon className={cn("h-[17px] w-[17px] transition-transform group-hover:scale-105", active && "stroke-[2.4]")} />
                    <span>{label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--mint-deep)]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-[var(--line)] pt-4">
        <Link href="/settings" onClick={onClose} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]">
          <Settings2 className="h-[17px] w-[17px]" /> Settings
        </Link>
        <div className="rounded-[16px] bg-[var(--ink)] p-3.5 text-[var(--surface)]">
          <div className="flex items-center gap-2 text-[var(--mint)]"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold">FinSight Pro</span></div>
          <p className="mt-2 text-[0.7rem] leading-5 text-white/60">Unlock forecasting, smart rules, and unlimited connections.</p>
          <Link href="/pricing" className="mt-3 inline-flex text-[0.7rem] font-bold text-[var(--mint)] hover:text-white">Explore Pro <span className="ml-1">↗</span></Link>
        </div>
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cobalt-soft)] text-xs font-bold text-[var(--cobalt)]">AS</span>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[var(--ink)]">Alex Smith</p><p className="truncate text-[0.68rem] text-[var(--ink-muted)]">alex@finsight.app</p></div>
          <LogOut className="h-4 w-4 text-[var(--ink-muted)]" />
        </div>
      </div>
    </aside>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const items = useMemo(() => paletteItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[rgba(16,20,22,0.34)] px-4 pt-[15vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4">
          <Search className="h-4 w-4 text-[var(--ink-muted)]" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search FinSight or jump to…" className="h-14 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]" />
          <kbd className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] px-1.5 py-1 text-[0.62rem] text-[var(--ink-muted)]">esc</kbd>
        </div>
        <div className="p-2">
          <p className="px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]">Quick actions</p>
          {items.length ? items.map(({ href, label, hint, icon: Icon }) => (
            <button key={href} onClick={() => { onClose(); router.push(href); }} className="flex w-full items-center gap-3 rounded-[11px] px-3 py-3 text-left hover:bg-[var(--surface-muted)]">
              <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--mint)] text-[var(--mint-deep)]"><Icon className="h-4 w-4" /></span>
              <span className="flex-1 text-sm font-medium text-[var(--ink)]">{label}</span>
              <span className="text-xs text-[var(--ink-muted)]">{hint}</span>
            </button>
          )) : <p className="px-3 py-6 text-sm text-[var(--ink-muted)]">No matching actions yet.</p>}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface-raised)] px-4 py-3 text-[0.65rem] text-[var(--ink-muted)]"><span>Navigate with your keyboard</span><span className="flex items-center gap-1"><kbd className="rounded border border-[var(--line)] px-1">⌘</kbd><kbd className="rounded border border-[var(--line)] px-1">K</kbd></span></div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isPublic = pathname === "/" || pathname === "/login" || pathname.startsWith("/pricing") || pathname.startsWith("/features") || pathname.startsWith("/faq") || pathname.startsWith("/privacy") || pathname.startsWith("/terms");
  const current = pageMeta[pathname] ?? { title: "FinSight", description: "Your financial operating system." };

  useEffect(() => {
    const saved = window.localStorage.getItem("finsight-theme") as "light" | "dark" | null;
    const next = saved ?? "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("finsight-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === "Escape") { setPaletteOpen(false); setMobileOpen(false); setNotificationsOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (isPublic) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:flex"><Sidebar pathname={pathname} /></div>
      {mobileOpen && <div className="fixed inset-0 z-50 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)}><div className="h-full w-[286px] shadow-[var(--shadow-lg)]" onClick={(event) => event.stopPropagation()}><Sidebar pathname={pathname} onClose={() => setMobileOpen(false)} /></div></div>}
      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[var(--line)] bg-[color:var(--canvas)]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><span className="flex w-4 flex-col gap-1"><span className="h-px w-full bg-current" /><span className="h-px w-3/4 bg-current" /></span></button>
            <div className="min-w-0"><h1 className="truncate text-[1.08rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">{current.title}</h1><p className="hidden truncate text-xs text-[var(--ink-muted)] sm:block">{current.description}</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setPaletteOpen(true)} className="hidden h-10 items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3 text-xs text-[var(--ink-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)] md:flex" aria-label="Open command palette"><Search className="h-4 w-4" /><span>Search</span><kbd className="ml-2 rounded-md bg-[var(--surface-muted)] px-1.5 py-1 text-[0.62rem]">⌘ K</kbd></button>
            <button onClick={() => setPaletteOpen(true)} className="grid h-10 w-10 place-items-center rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] md:hidden" aria-label="Open search"><Search className="h-4 w-4" /></button>
            <div className="relative"><button onClick={() => setNotificationsOpen((open) => !open)} className="relative grid h-10 w-10 place-items-center rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)]" aria-label="Open notifications"><Bell className="h-4 w-4" /><span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-[var(--ember)] ring-2 ring-[var(--surface)]" /></button>{notificationsOpen && <div className="absolute right-0 top-12 w-72 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lg)]"><div className="flex items-center justify-between px-2 py-1"><p className="text-sm font-semibold text-[var(--ink)]">Notifications</p><span className="rounded-full bg-[var(--mint)] px-2 py-0.5 text-[0.62rem] font-bold text-[var(--mint-deep)]">2 new</span></div><div className="mt-2 space-y-1"><div className="rounded-[11px] bg-[var(--surface-muted)] p-3"><p className="text-xs font-semibold text-[var(--ink)]">You are on track</p><p className="mt-1 text-[0.68rem] leading-4 text-[var(--ink-muted)]">Your spending is 8% lower than this time last month.</p></div><div className="rounded-[11px] p-3 hover:bg-[var(--surface-muted)]"><p className="text-xs font-semibold text-[var(--ink)]">Rent is due in 3 days</p><p className="mt-1 text-[0.68rem] text-[var(--ink-muted)]">$1,850 · Bills & utilities</p></div></div></div>}</div>
            <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="hidden h-10 w-10 place-items-center rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] sm:grid" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
            <span className="hidden h-8 w-px bg-[var(--line)] sm:block" />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--cobalt-soft)] text-[0.68rem] font-bold text-[var(--cobalt)]">AS</span>
          </div>
        </header>
        <main className="min-h-[calc(100vh-76px)] px-4 pb-24 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pb-10"><div className="mx-auto max-w-[1440px] page-enter">{children}</div></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--line)] bg-[var(--surface)]/95 px-2 py-2 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {navGroups.flatMap((group) => group.items).slice(0, 5).map(({ href, label, icon: Icon }) => { const active = pathname === href; return <Link key={href} href={href} className={cn("flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[0.62rem] font-semibold", active ? "bg-[var(--mint)] text-[var(--mint-deep)]" : "text-[var(--ink-muted)]")}><Icon className="h-4 w-4" /><span>{label}</span></Link>; })}
      </nav>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

export { BrandMark };
