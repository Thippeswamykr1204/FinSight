import type { Metadata } from "next";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
export const metadata: Metadata = { title: "Terms of service" };
export default function TermsPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Last updated 7 October 2026"
        title="A clear understanding."
        description="Usage terms for FinSight's personal finance workspace."
      />
      <div className="mx-auto mt-14 max-w-3xl space-y-9">
        {[
          [
            "The service",
            "FinSight helps you track financial records, budgets and goals in a private workspace. It is not an online bank, investment adviser or payment processor. You must be an adult and authorized to process any shared records you enter.",
          ],
          [
            "Your decisions",
            "Scores, charts, and projections reflect the records you enter and the assumptions shown in the product. They may be incomplete and are not financial, tax, legal, or investment advice. Verify important balances with your financial institutions.",
          ],
          [
            "Your data and responsibility",
            "Use only data you are entitled to process. You control exports and workspace access. Keep copies of important records and do not store bank passwords, identity documents or payment card secrets in financial notes.",
          ],
          [
            "Availability and changes",
            "Maintenance and service incidents may temporarily affect access. Your saved records are held in your workspace, and export remains available to its owner. Keep independent copies of records you need to retain.",
          ],
          [
            "Membership and payments",
            "Where paid memberships are enabled, Pro costs ₹352.82/month (₹299 plus ₹53.82 GST) and Business costs ₹942.82/month (₹799 plus ₹143.82 GST). Razorpay handles checkout, payment details and recurring mandates. Paid features activate only after verification of a full monthly payment. Mandate-authorisation payments alone do not activate membership. Monthly subscriptions run for up to 120 cycles; renewal requires a new mandate afterward. Test-mode receipts are not tax invoices.",
          ],
          [
            "Changes, cancellation and payment failures",
            "Plan changes apply at the next billing cycle. UPI and e-mandate subscriptions may require cancellation and a new subscription instead of a plan change. Cancel in Billing before renewal; unfinished subscriptions cancel immediately, while active subscriptions cancel at the cycle end. Paid access continues through the period already paid for. After payment failure or expiry, Free limits apply and excess workspaces or shared access become read-only. Records and exports remain available. Deleting a workspace does not cancel your subscription. Account deletion requires completed subscription cancellation. Contact the operator for payment disputes, invoice corrections or refund requests; cancellation does not automatically refund a completed payment.",
          ],
          [
            "Hosted service and Indian law",
            "Operators are responsible for notices, consent, grievance handling, data-principal rights and applicable Indian law, including DPDP Act 2023 obligations and notified rules. INR is the account currency; FinSight is not a tax filing system. Your deployment's operator publishes its privacy contact, grievance officer and commercial support terms.",
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
