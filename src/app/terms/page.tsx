import type { Metadata } from "next";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
export const metadata: Metadata = { title: "Preview terms" };
export default function TermsPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Last updated 5 October 2026"
        title="A clear understanding."
        description="Usage terms for FinSight's demo and self-hosted finance workspace."
      />
      <div className="mx-auto mt-14 max-w-3xl space-y-9">
        {[
          [
            "A product preview",
            "FinSight’s browser-local preview is provided for evaluation and demonstration. It is not an online bank, investment adviser, payment processor, or live subscription service. No account or paid membership is created by opening the demo.",
          ],
          [
            "Your decisions",
            "Scores, charts, and projections reflect the records you enter and the assumptions shown in the product. They may be incomplete and are not financial, tax, legal, or investment advice. Verify important balances with your financial institutions.",
          ],
          [
            "Your data and responsibility",
            "Use only data you are entitled to process. You control local exports and are responsible for keeping copies of records you want to retain. Do not use the preview to store bank passwords, identity documents, or payment card secrets.",
          ],
          [
            "Availability and changes",
            "The preview may change, reset, or become unavailable. Browser storage is not a backup service. Planned pricing and features describe product direction and are not a promise of availability or an offer to purchase.",
          ],
          [
            "Hosted service and Indian law",
            "Self-hosted operators control their deployment and are responsible for notices, consent, grievance handling, data-principal rights and applicable DPDP Act 2023 obligations, including rules and commencement applicable at launch. Users must be adults and have authority to process shared records. INR is the default currency; this workspace is not a tax filing system. Paid plans, GST invoices, Razorpay payments and bank sync are planned and not live. Public operators must publish reviewed commercial, cancellation, refund and support terms before selling subscriptions; these evaluation terms do not grant service guarantees or regulatory approval.",
          ],
        ].map(([title, copy]) => (
          <section key={title}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-4 text-sm leading-8 text-[var(--ink-soft)]">
              {copy}
            </p>
          </section>
        ))}
      </div>
    </SitePage>
  );
}
