import { notFound } from "next/navigation";
import { serverApi, ServerApiError } from "@/lib/hosted/server-api";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
import { displayDate, money } from "@finsight/shared";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Shared report",
  robots: { index: false, follow: false },
};
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let report: {
    start: string;
    end: string;
    income: number;
    expenses: number;
    saved: number;
    expiresAt: string;
  };
  try {
    report = await serverApi(
      `/api/v1/reports/shared/${encodeURIComponent(token)}`,
    );
  } catch (error) {
    if (error instanceof ServerApiError && [404, 422].includes(error.status))
      notFound();
    throw error;
  }
  return (
    <SitePage>
      <SiteTitle
        eyebrow="A shared financial picture"
        title="Cash-flow report."
        description={`${displayDate(report.start)} – ${displayDate(report.end)} · INR`}
      />
      <section className="surface p-7">
        <dl className="grid gap-5 sm:grid-cols-3">
          {Object.entries({
            Income: report.income,
            Expenses: report.expenses,
            "Net cash flow": report.saved,
          }).map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-[var(--ink-soft)]">{label}</dt>
              <dd className="mt-3 text-2xl font-semibold">{money(value)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-xs leading-6 text-[var(--ink-soft)]">
          Recorded transactions only. This is not taxable income or financial
          advice. This shared summary expires {displayDate(report.expiresAt)}.
        </p>
      </section>
    </SitePage>
  );
}
