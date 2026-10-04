import type { Metadata } from "next";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
export const metadata: Metadata = { title: "Preview privacy notice" };
export default function PrivacyPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Last updated October 4, 2026"
        title="Your data. Your view."
        description="Privacy notice for the FinSight browser-local preview."
      />
      <div className="mx-auto mt-14 max-w-3xl space-y-9">
        {[
          [
            "What the preview stores",
            "The preview stores your display name, preferences, manual accounts, transactions, budgets, and goals in this browser’s local storage. Sample data is fictional. Avoid entering sensitive information on a shared or public device.",
          ],
          [
            "Where processing happens",
            "Finance calculations and statement imports run in your browser. The preview does not upload your financial records, send them to an AI service, or connect to a bank. Hosting providers may process ordinary HTTP request data, such as IP addresses, paths, and browser headers, to deliver the site and troubleshoot availability.",
          ],
          [
            "Storage and retention",
            "Local records remain until you clear them through Settings or remove the site’s browser data. This storage is not encrypted with a personal key. The site does not install advertising trackers or product analytics in the preview. A legacy single-operator API is disabled by default; operators who enable it are responsible for its separate data handling.",
          ],
          [
            "Export and deletion",
            "Export the workspace as JSON or transactions as CSV through the app. Clear demo data in Settings to remove the financial records from this browser. Clearing this site’s storage removes all local preferences as well. Previously downloaded files are controlled by you and are not deleted by the app.",
          ],
          [
            "Before a hosted launch",
            "A hosted, account-based product needs a controller identity, contact channel, jurisdiction-specific rights process, processor list, and retention schedule. Those production terms are not established by this preview notice. Paid and hosted features remain unavailable until their policies and operations are ready.",
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
