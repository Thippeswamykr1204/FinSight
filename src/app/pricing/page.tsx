import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";

export const metadata: Metadata = { title: "Planned memberships" };
const plans = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Build your first financial habit.",
    features: [
      "One personal workspace",
      "Manual tracking and CSV imports",
      "Core budgets and goals",
      "100 new transactions per month",
    ],
  },
  {
    name: "Pro",
    price: "$9",
    subtitle: "A more complete point of view.",
    features: [
      "Unlimited manual transactions",
      "Planned live bank connections",
      "Advanced forecasts and rules",
      "Shared household workspace",
    ],
  },
  {
    name: "Business",
    price: "$24",
    subtitle: "Clarity for a small team.",
    features: [
      "Up to five workspace members",
      "Planned role-based permissions",
      "Reports and approval workflows",
      "Planned API access and audit trail",
    ],
  },
];
export default function PricingPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Simple by intention"
        title="A plan for your next chapter."
        description="Proposed launch pricing. Memberships and payments are not live yet; the browser-local demo is free to explore."
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`surface flex flex-col p-7 ${plan.name === "Pro" ? "border-[#178457] ring-1 ring-[#178457]" : ""}`}
          >
            <div className="flex justify-between">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              {plan.name === "Pro" && (
                <span className="rounded-full bg-[#dcf5e7] px-3 py-1 text-[10px] font-semibold uppercase text-[#167852]">
                  For households
                </span>
              )}
            </div>
            <p className="mt-4 text-sm text-[var(--ink-soft)]">
              {plan.subtitle}
            </p>
            <p className="mt-8 text-5xl font-semibold tracking-[-.06em]">
              {plan.price}
              <span className="text-sm font-normal tracking-normal text-[var(--ink-soft)]">
                {" "}
                / month
              </span>
            </p>
            <p className="mt-3 text-xs text-[var(--ink-soft)]">
              Planned USD monthly price, before tax
            </p>
            <ul className="my-8 space-y-4">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex gap-3 text-sm text-[var(--ink-soft)]"
                >
                  <Check size={16} className="mt-0.5 shrink-0 text-[#167852]" />
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className="mt-auto rounded-xl bg-[#101b16] px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Explore the free demo
            </Link>
            <p className="mt-3 text-center text-[11px] text-[var(--ink-soft)]">
              No purchase or subscription created
            </p>
          </article>
        ))}
      </div>
      <div className="mx-auto mt-14 max-w-2xl text-center text-sm leading-7 text-[var(--ink-soft)]">
        Every membership is planned to include data export and self-service
        deletion. Exact entitlements and launch availability will be published
        before paid subscriptions open.
      </div>
    </SitePage>
  );
}
