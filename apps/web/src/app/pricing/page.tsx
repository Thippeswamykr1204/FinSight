import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
import { deploymentCapabilities } from "@/lib/hosted/config";

export const metadata: Metadata = { title: "Memberships" };
export const dynamic = "force-dynamic";
const plans = [
  {
    name: "Free",
    price: "₹0",
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
    price: "₹352.82",
    tax: "₹299 + ₹53.82 GST (18%)",
    subtitle: "A more complete point of view.",
    features: [
      "10,000 recorded transactions per workspace",
      "CSV and OFX statement imports",
      "Advanced forecasts and rules",
      "Shared household workspace",
      "Three owned workspaces, two members each",
    ],
  },
  {
    name: "Business",
    price: "₹942.82",
    tax: "₹799 + ₹143.82 GST (18%)",
    subtitle: "Clarity for a small team.",
    features: [
      "Up to five workspace members",
      "Role-based permissions",
      "Financial reports and sharing",
      "Workspace audit history",
      "Five owned workspaces",
    ],
  },
];
export default async function PricingPage() {
  const capabilities = await deploymentCapabilities();
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Simple by intention"
        title="A plan for your next chapter."
        description="Start with Free. Keep your financial picture and plans together in a private workspace."
      />
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {plans
          .filter((plan) => capabilities.billing || plan.name === "Free")
          .map((plan) => (
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
                {"tax" in plan
                  ? `${plan.tax}. GST included in the monthly price.`
                  : "Free includes manual tracking, imports, budgets and goals."}
              </p>
              <ul className="my-8 space-y-4">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm text-[var(--ink-soft)]"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-[#167852]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.name === "Free" ? "/sign-up" : "/billing"}
                className="mt-auto rounded-xl bg-[#101b16] px-5 py-3 text-center text-sm font-semibold text-white"
              >
                {plan.name === "Free"
                  ? "Create a free account"
                  : `Choose ${plan.name}`}
              </Link>
              <p className="mt-3 text-center text-[11px] text-[var(--ink-soft)]">
                {plan.name === "Free"
                  ? "No purchase or subscription created"
                  : capabilities.billingTestMode
                    ? "Razorpay test mode · no live payment"
                    : "Monthly renewal · cancel before the next cycle"}
              </p>
            </article>
          ))}
      </div>
      <div className="mx-auto mt-14 max-w-2xl text-center text-sm leading-7 text-[var(--ink-soft)]">
        Every membership includes data export and self-service deletion.
        Planning calculators remain free and public.
      </div>
    </SitePage>
  );
}
