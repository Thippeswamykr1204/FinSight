import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isHostedEnabled } from "@/lib/hosted/config";
import { HostedShell } from "@/components/hosted/shell";
import { serverMe } from "@/lib/hosted/server-api";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your workspace",
  robots: { index: false, follow: false },
};
export default async function HostedLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isHostedEnabled()) redirect("/sign-in");
  let me;
  try {
    me = await serverMe();
  } catch {
    redirect("/sign-in");
  }
  return (
    <HostedShell
      user={{ name: me!.profile.name, email: me!.profile.email }}
      memberships={me!.memberships.map((membership) => ({
        role: membership.role,
        workspace: {
          id: membership.workspaceId,
          name: membership.workspace?.name ?? "Workspace",
        },
      }))}
    >
      {children}
    </HostedShell>
  );
}
