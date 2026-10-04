import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/layout/app-shell";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-10">
      <Link href="/" aria-label="FinSight home">
        <BrandMark />
      </Link>
      <nav
        aria-label="Marketing navigation"
        className="hidden items-center gap-8 text-sm font-medium text-[var(--ink-soft)] md:flex"
      >
        <Link href="/features" className="hover:text-[var(--ink)]">
          Product
        </Link>
        <Link href="/pricing" className="hover:text-[var(--ink)]">
          Pricing
        </Link>
        <Link href="/faq" className="hover:text-[var(--ink)]">
          Questions
        </Link>
      </nav>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-xl bg-[#101b16] px-4 py-3 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Explore the demo <ArrowRight size={15} />
      </Link>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-7 border-t px-5 py-10 text-xs text-[var(--ink-soft)] sm:flex-row sm:items-center sm:px-8 lg:px-10">
      <Link href="/" aria-label="FinSight home">
        <BrandMark />
      </Link>
      <div className="flex flex-wrap gap-5">
        <Link href="/features">Product</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
      <span>© 2026 FinSight · Preview</span>
    </footer>
  );
}
export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
export function SiteTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-.065em] sm:text-6xl">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[var(--ink-soft)]">
        {description}
      </p>
    </div>
  );
}
