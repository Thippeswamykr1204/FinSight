import type { Metadata } from "next";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
export const metadata: Metadata = { title: "Privacy and data rights" };
export const dynamic = "force-dynamic";
export default function PrivacyPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Last updated 7 October 2026"
        title="Your data. Your view."
        description="India-first privacy notice for your personal finance workspace."
      />
      <div className="mx-auto mt-14 max-w-3xl space-y-9">
        {[
          [
            "Notice and consent",
            "FinSight processes account identity, security devices, workspace membership, preferences and the financial records you choose to enter for finance tracking and account security. Signup requires acceptance of this notice and the terms; the server records its version and acceptance time. No advertising or bank-data consent is bundled into account access.",
          ],
          [
            "Where processing happens",
            "Imports are uploaded only when you save their preview; financial records and preferences are stored in MongoDB. Hosting and transactional email processors handle request/security metadata and email. If enabled by the operator, Sentry receives redacted technical errors and code stack frames; financial payloads, request bodies, cookies, identity details and error-message contents are excluded. FinSight does not send your records to banks, advertising trackers or AI services. A shared report contains only the summary you choose to share, expires after seven days and can be revoked by the workspace owner.",
          ],
          [
            "Billing and payment processing",
            "Paid members provide billing name, address, state and an optional GSTIN for invoicing. These details and invoice snapshots are encrypted at rest. Razorpay processes payment-card details and recurring mandates; FinSight stores provider identifiers and payment status, never full card details. GST invoice records are retained for eight years for accounting obligations and remain after account deletion, with access removed and personal account links anonymized. Financial workspaces are deleted independently. Contact the operator for statutory-record rights requests, invoice corrections and payment disputes.",
          ],
          [
            "Storage and retention",
            "Workspace records remain until the owner deletes the workspace or the operator applies its retention policy. Email outbox bodies are encrypted and erased after delivery; unsent bodies expire after 30 days. Backup retention, security logs and delivered email are governed by the operator and its processors. Deployment region and processor details are published by your operator.",
          ],
          [
            "Export and deletion",
            "Export personal data or workspace records in Settings. Account security provides account deletion; owners delete workspace records in Settings. Deletion needs a recent sign-in and explicit confirmation. Owned workspaces must be deleted first; shared records owned by others are retained. Authentication secrets are excluded from exports. Downloaded records and delivered messages cannot be recalled.",
          ],
          [
            "India's DPDP Act 2023 and your rights",
            "The operator must assess the DPDP Act 2023, notified rules and phased commencement applicable to its launch. Data principals can request access information, correction, erasure, grievance redressal and nomination through the operator. Withdraw optional consent by stopping sharing; stop account processing through deletion or a rights request. The self-service controls support these requests but do not certify legal compliance. Where GDPR applies, access, rectification, erasure, portability, restriction and objection remain relevant.",
          ],
          [
            "Grievance and operator contact",
            process.env.PRIVACY_CONTACT_EMAIL
              ? `Contact ${process.env.PRIVACY_CONTACT_EMAIL}. Grievance officer: ${process.env.GRIEVANCE_OFFICER_NAME || "the deployment administrator"}. The operator is responsible for publishing its legal identity, processor list, response times, retention schedule and escalation route before collecting public customer data.`
              : "No public operator contact is configured. This is an evaluation deployment. A public hosted launch requires an identified operator, grievance officer, contact channel and reviewed retention/rights process.",
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
