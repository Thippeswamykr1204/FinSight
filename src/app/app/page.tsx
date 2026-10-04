import { headers } from "next/headers";
import { principal } from "@/lib/hosted/http";
import { hostedDb } from "@/lib/hosted/db";
import { WorkspaceList } from "@/components/hosted/workspace-list";
export default async function WorkspacesPage() {
  const actor = await principal(await headers());
  const memberships = await hostedDb().workspaceMember.findMany({
    where: { userId: actor.userId },
    select: { role: true, workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return <WorkspaceList memberships={memberships} />;
}
