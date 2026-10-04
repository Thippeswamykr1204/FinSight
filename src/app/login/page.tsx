import Link from "next/link";
import { SitePage, SiteTitle } from "@/components/marketing/site-shell";
export default function LoginPage() {
  return (
    <SitePage>
      <SiteTitle
        eyebrow="Welcome to the preview"
        title="A clearer view is waiting."
        description="The current FinSight demo does not require a hosted account. Your workspace is saved on this device."
      />
      <div className="mx-auto mt-10 max-w-lg text-center">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl bg-[#101b16] px-6 py-4 text-sm font-semibold text-white"
        >
          Open the demo →
        </Link>
        <p className="mt-7 text-sm leading-7 text-[var(--ink-soft)]">
          Hosted email, OAuth, passkey, and MFA sign-in are not available in
          this preview.
        </p>
      </div>
    </SitePage>
  );
}
