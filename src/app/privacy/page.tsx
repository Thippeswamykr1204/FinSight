import type { Metadata } from "next";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
export const metadata: Metadata = { title: "Privacy and data rights" };
export const dynamic = "force-dynamic";
export default function PrivacyPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Last updated 5 October 2026"
        title="Your data. Your view."
        description="India-first privacy notice for the local demo and self-hosted workspace."
      />
      <div className="mx-auto mt-14 max-w-3xl space-y-9">
        {[
          [
            "Notice and consent",
            "The demo stores your display name, preferences and financial records in this browser. Hosted mode processes account identity, security devices, workspace membership and the financial records you choose to enter for finance tracking and account security. Signup requires acceptance of this notice and the terms; the server records its version and acceptance time. No advertising or bank-data consent is bundled into account access. Sample data is fictional.",
          ],
          [
            "Where processing happens",
            "Demo calculations and imports stay in your browser. Hosted imports are uploaded only when you save their preview; records are stored in the operator's PostgreSQL database. Hosting and SMTP processors handle request/security metadata and transactional email. There is no live bank sync, billing, advertising tracker or AI service. Sharing or downloading a report sends it only where you choose.",
          ],
          [
            "Storage and retention",
            "Local records remain until you clear them, including retained earlier-currency data. Local storage is not encrypted with a personal key. Hosted records remain until the owner deletes the workspace or the operator applies a documented retention policy. SMTP outbox bodies are encrypted and erased after delivery. Backup retention, access/security logs and already delivered email are governed by the operator and its processors. An India region is the deployment recommendation, not a claim about every self-hosted instance.",
          ],
          [
            "Export and deletion",
            "Export and clear the demo in Settings. Hosted users can export personal profile/device metadata and delete their account in Account security; owners export and delete workspace records in Members. Deletion needs a recent sign-in and explicit confirmation. Owned workspaces must be deleted first; shared records owned by others are retained. Authentication secrets are never included in exports. Downloads and messages already sent to recipients cannot be recalled.",
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
