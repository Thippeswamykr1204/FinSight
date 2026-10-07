import { notFound } from "next/navigation";
import { WorkspaceBoard } from "@/components/hosted/workspace-board";
import { serverApi } from "@/lib/hosted/server-api";
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    await serverApi(`/api/v1/workspaces/${id}/overview`);
  } catch (error) {
    notFound();
  }
  return <WorkspaceBoard workspaceId={id} />;
}
