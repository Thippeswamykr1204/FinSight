import { WorkspaceList } from "@/components/hosted/workspace-list";
import { serverMe } from "@/lib/hosted/server-api";
export default async function WorkspacesPage() {
  const me = await serverMe();
  return (
    <WorkspaceList
      memberships={me.memberships.map((membership) => ({
        role: membership.role,
        workspace: {
          id: membership.workspaceId,
          name: membership.workspace?.name ?? "Workspace",
          currency: membership.workspace?.currency ?? "INR",
        },
      }))}
    />
  );
}
