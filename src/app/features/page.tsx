import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftRight,
  Compass,
  Layers,
  LineChart,
  ShieldCheck,
  Target,
} from "lucide-react";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";

export const metadata: Metadata = { title: "Your financial picture" };
export default function FeaturesPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="The product"
        title="Clarity, from every angle."
        description="A connected set of tools for understanding your money. Try these working flows in the browser-local demo."
      />
      <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Every money move",
            copy: "Create, edit, search, and delete transactions. Import CSV or OFX statements with a review step and duplicate detection.",
            icon: ArrowLeftRight,
            href: "/transactions",
          },
          {
            title: "A flexible spending plan",
            copy: "Set monthly category limits. Your transactions update the plan automatically, with clear remaining and over-budget states.",
            icon: Compass,
            href: "/budgets",
          },
          {
            title: "Progress you can see",
            copy: "Create a goal, choose a target date, and record the savings you have set aside. Celebrate when you get there.",
            icon: Target,
            href: "/goals",
          },
          {
            title: "One financial picture",
            copy: "Track manual cash, credit, and investment accounts. Net worth reconciles directly to your opening balances and ledger.",
            icon: Layers,
            href: "/accounts",
          },
          {
            title: "Explainable insights",
            copy: "Explore category spending, an openly calculated health indicator, and a cash-flow scenario with explicit assumptions.",
            icon: LineChart,
            href: "/insights",
          },
          {
            title: "Control of your data",
            copy: "Export a filtered CSV or your full workspace as JSON. Clear your browser-local records whenever you choose.",
            icon: ShieldCheck,
            href: "/settings",
          },
        ].map(({ title, copy, icon: Icon, href }) => (
          <article key={title} className="surface surface-hover p-7">
            <Icon className="text-[#167852]" size={25} />
            <h2 className="mt-7 text-xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
              {copy}
            </p>
            <Link
              href={href}
              className="mt-6 inline-block text-sm font-semibold text-[#167852]"
            >
              Try it in the demo →
            </Link>
          </article>
        ))}
      </div>
    </SitePage>
  );
}
