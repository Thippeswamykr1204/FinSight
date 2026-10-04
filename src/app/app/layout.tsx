import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { principal } from "@/lib/hosted/http";
import { isHostedEnabled } from "@/lib/hosted/config";
import { HostedShell } from "@/components/hosted/shell";
import { hostedDb } from "@/lib/hosted/db";
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
  let actor;
  try {
    actor = await principal(await headers());
  } catch {
    redirect("/sign-in");
  }
  const memberships = await hostedDb().workspaceMember.findMany({
    where: { userId: actor.userId },
    select: { role: true, workspace: { select: { id: true, name: true } } },
  });
  return (
    <HostedShell
      user={{ name: actor.name, email: actor.email }}
      memberships={memberships}
    >
      {children}
    </HostedShell>
  );
}
