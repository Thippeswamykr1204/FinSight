import Link from "next/link";
export default function WorkspaceNotFound() {
  return (
    <section className="surface mx-auto max-w-xl p-8">
      <h2 className="text-2xl font-semibold">Workspace not found.</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
        This workspace does not exist or you no longer have access.
      </p>
      <Link
        href="/app"
        className="mt-6 inline-block text-sm font-semibold text-[var(--mint-deep)]"
      >
        Return to your workspaces →
      </Link>
    </section>
  );
}
